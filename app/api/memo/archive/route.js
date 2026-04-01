import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";
import fs from "fs";
import { exec } from "child_process";
import util from "util";
import path from "path";
import os from "os";

const execPromise = util.promisify(exec);

export async function POST(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }

    let connection;
    try {
        const { docNo, path: wordPath, situationId, attachments, recipientEmpNums, recipients } = await req.json();

        if (!docNo || !wordPath) {
            return NextResponse.json({ success: false, error: "بيانات ناقصة" }, { status: 400 });
        }

        // 1. التأكد من وجود ملف الوورد (نبحث عما هو موجود بالفعل)
        let actualWordPath = wordPath;
        if (!fs.existsSync(actualWordPath)) {
            const checkDocm = wordPath.toLowerCase().endsWith(".docm") ? wordPath : `${wordPath}.docm`;
            const checkDocx = wordPath.toLowerCase().endsWith(".docx") ? wordPath : `${wordPath}.docx`;

            if (fs.existsSync(checkDocm)) {
                actualWordPath = checkDocm;
            } else if (fs.existsSync(checkDocx)) {
                actualWordPath = checkDocx;
            } else {
                return NextResponse.json({ success: false, error: `ملف الوورد غير موجود في المسار المحدد: ${wordPath}` }, { status: 404 });
            }
        }
        const extension = actualWordPath.toLowerCase().endsWith(".docx") ? ".docx" : ".docm";

        // 2. تحديد مسار ملف PDF النهائي والقاعدة
        const pdfPathOnDisk = actualWordPath.replace(/\.(docm|docx)$/i, ".pdf");
        const basePath = actualWordPath.replace(/\.(docm|docx)$/i, "");

        // 3. استراتيجية النسخ المحلي
        const tempDir = os.tmpdir();
        const tempFileName = `arch_${docNo}_${Date.now()}${extension}`;
        const tempDocPath = path.join(tempDir, tempFileName);
        const tempPdfPath = tempDocPath.replace(/\.(docm|docx)$/i, '.pdf');

        try {
            // نسخ الملف من الشبكة إلى السيرفر محلياً
            fs.copyFileSync(actualWordPath, tempDocPath);
        } catch (copyErr) {
            console.error("Temp Copy Error:", copyErr);
            return NextResponse.json({ success: false, error: "لا يمكن قراءة الملف. تأكد من إغلاقه تماماً المحاولة مرة أخرى." }, { status: 500 });
        }

        // تنفيذ التحويل على النسخة المحلية
        try {
            // محاولة إغلاق أي عمليات Word عالقة قبل البدء لضمان تحرير الملفات
            await execPromise('taskkill /F /IM winword.exe').catch(() => { });
            await new Promise(resolve => setTimeout(resolve, 1000)); // انتظر ثانية لضمان إغلاق العمليات بالكامل

            const psScript = `
                $word = New-Object -ComObject Word.Application;
                $word.Visible = $false;
                $word.DisplayAlerts = 0; 
                try {
                    $doc = $word.Documents.Open('${tempDocPath}', $false, $true);
                    
                    # ضبط العرض على وضع الطباعة لضمان الحفاظ على التنسيقات والمسافات
                    $word.ActiveWindow.View.Type = 3; 
                    
                    # تحديث أي حقول ديناميكية لو وجدت
                    $doc.Fields.Update();

                    # التصدير بتنسيق ثابت (أفضل من SaveAs للحفاظ على التنسيق)
                    # OptimizeForPrint = 0, RangeAll = 0, ItemDocument = 0
                    $doc.ExportAsFixedFormat(
                        '${tempPdfPath}', 
                        17, # wdExportFormatPDF
                        $false, # OpenAfterExport
                        0, # OptimizeForPrint
                        0, # RangeAll
                        1, 1, # From, To
                        0, # ItemDocument
                        $true, # IncludeDocProps
                        $true, # KeepIRM
                        1, # CreateBookmarks
                        $true, # DocStructureTags
                        $true, # BitmapMissingFonts
                        $false # UseISO19005_1
                    );

                    $doc.Close(0);
                } catch {
                    Write-Error $_.Exception.Message
                    exit 1
                } finally {
                    $word.Quit();
                    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null;
                    [GC]::Collect();
                    [GC]::WaitForPendingFinalizers();
                }
            `;

            const tempPsFile = path.join(tempDir, `script_${docNo}.ps1`);
            fs.writeFileSync(tempPsFile, psScript, { encoding: 'utf8' });

            await execPromise(`powershell -ExecutionPolicy Bypass -File "${tempPsFile}"`);

            // تنظيف السكريبت
            if (fs.existsSync(tempPsFile)) fs.unlinkSync(tempPsFile);

            // التحقق من إنشاء الـ PDF
            if (!fs.existsSync(tempPdfPath)) {
                throw new Error("فشل توليد ملف PDF (لم يتم العثور على الملف الناتج)");
            }

            // نقل الـ PDF الناتج إلى المسار النهائي على الشبكة (مع تكرار المحاولة في حالة القفل EBUSY)
            let copied = false;
            let attempts = 0;
            while (!copied && attempts < 3) {
                try {
                    fs.copyFileSync(tempPdfPath, pdfPathOnDisk);
                    copied = true;
                } catch (copyErr) {
                    attempts++;
                    if (copyErr.code === 'EBUSY' && attempts < 3) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else {
                        throw copyErr;
                    }
                }
            }

            // تنظيف الملفات المؤقتة
            if (fs.existsSync(tempDocPath)) fs.unlinkSync(tempDocPath);
            if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);

            // 4. تحديث قاعدة البيانات
            connection = await getConnection2();

            // جلب بيانات المسودة لإكمال الإرسال
            const draftRes = await connection.execute(
                `SELECT PLACE_C, EMP_NO, DOC_DATE, SUBJECT, MAIN_DOC, MAIN_DOC_NO, DOC_TYPE, 
                        NVL(TRANS_TYPE, 2) as TRANS_TYPE, MAIN_DATE, MAIN_DOC_DATE 
                 FROM DOC_DATA_NEW 
                 WHERE DOC_NO = :docNo`,
                { docNo }
            );

            if (draftRes.rows.length === 0) {
                throw new Error("لم يتم العثور على بيانات المسودة");
            }

            const [senderEmp, recipientEmp, docDate, subject, mainDoc, mainDocNo, docType, transType, mainDate, mainDocDate] = draftRes.rows[0];

            // تحضير نص المرفقات للجدول القديم (اختياري، للرجوع إليه)
            const legacyAttachString = attachments && attachments.length > 0
                ? attachments.map(a => a.path).join(',')
                : null;

            await connection.execute(
                `UPDATE DOC_DATA_NEW SET FILE_NAME = :basePath, SECTORE = 1, FILE_ATTACH = :attachmentPath WHERE DOC_NO = :docNo`,
                {
                    basePath,
                    docNo,
                    attachmentPath: legacyAttachString
                },
                { autoCommit: false }
            );

            // 5. إدراج المرفقات في الجدول الجديد ATTACHMENTS
            if (attachments && attachments.length > 0) {
                for (const attach of attachments) {
                    await connection.execute(
                        `INSERT INTO ATTACHMENTS (
                            DOC_NO, DOC_DATE, MAIN_DOC_NO, MAIN_DOC_DATE, MAIN_DOC, 
                            FILE_PATH, PLACE_C, MAIN_DATE, ATTACH_TYPE, FILE_DESC
                        ) VALUES (
                            :docNo, :docDate, :mainDocNo, :mainDocDate, :mainDoc, 
                            :filePath, :placeC, :mainDate, 1, :fileDesc
                        )`,
                        {
                            docNo,
                            docDate,
                            mainDocNo,
                            mainDocDate,
                            mainDoc,
                            filePath: attach.path,
                            placeC: senderEmp,
                            mainDate: mainDate || docDate, // استخدام التاريخ الرئيسي أو تاريخ المستند
                            fileDesc: attach.desc || path.basename(attach.path)
                        },
                        { autoCommit: false }
                    );
                }
            }

            // التحقق من قائمة المستلمين
            let distributions = [];
            if (recipients && recipients.length > 0) {
                distributions = recipients;
            } else {
                distributions = [{ empNum: recipientEmp, situationId: situationId || 7 }];
            }

            // إرسال المكاتبة فعلياً لكل مستلم
            for (const target of distributions) {
                await connection.execute(`
                INSERT INTO RECIP_GEHA_NEW (
                    DOC_NO, DOC_DATE, PLACE_C, GEHA_C, SITUATION,SECTOR_C, ANSERED, REPLAY_PATH, SEND_DATE, 
                    MAIN_DOC, MAIN_DOC_NO, SEEN_FLAG
                ) VALUES (
                    :docNo, SYSDATE, :senderEmp, :recipient, :situationId,1, 0, :pdfPath, SYSDATE,
                    :mainDoc, :mainDocNo, 0
                )
            `, {
                    docNo,
                    senderEmp,
                    recipient: target.empNum,
                    pdfPath: basePath,
                    situationId: parseInt(target.situationId) || 7,
                    mainDoc,
                    mainDocNo
                }, { autoCommit: false });

                // إرسال تنبيه للمستلم (Web + Desktop)
                await sendNotification({
                    senderId: senderEmp,
                    receiverId: target.empNum,
                    message: `وصلتك مذكرة جديدة بعنوان: ${subject}`,
                    docNo: docNo,
                    title: `مذكرة جديدة`
                });
            }

            await connection.commit();

            return NextResponse.json({ success: true, pdfPath: basePath });

        } catch (convErr) {
            console.error("Conversion Error:", convErr);
            return NextResponse.json({ success: false, error: "فشل تحويل الوورد إلى PDF: " + (convErr.stderr || convErr.message || convErr) }, { status: 500 });
        }

    } catch (err) {
        console.error("Archive API Error:", err);
        if (connection) await connection.rollback().catch(() => { });
        const errorMessage = err.message.includes("ORA-") ? "Database Error: " + err.message : err.message;
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}