import { NextResponse } from "next/server";
import { getConnection, getConnection2 } from "@/lib/oracle";
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
        const { docNo, onlyNotify } = await req.json();

        if (!docNo) {
            return NextResponse.json({ success: false, error: "رقم المكاتبة مطلوب" }, { status: 400 });
        }

        connection = await getConnection2();

        // 1. جلب بيانات المكاتبة للتأكد من الصلاحية والحصول على المسار
        const docRes = await connection.execute(
            `SELECT FILE_NAME, PLACE_C, SUBJECT FROM DOC_DATA_NEW WHERE DOC_NO = :docNo`,
            { docNo }
        );

        if (docRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: "المكاتبة غير موجودة" }, { status: 404 });
        }

        const [basePath, creatorId, subject] = docRes.rows[0];

        // التأكد من أن المستخدم الحالي هو المنشئ
        if (String(creatorId) !== String(session.empNum)) {
            return NextResponse.json({ success: false, error: "لا تملك صلاحية تعديل هذه المكاتبة (يجب أن تكون المنشئ)" }, { status: 403 });
        }

        if (!basePath) {
            return NextResponse.json({ success: false, error: "لا يوجد ملف مرتبطة بهذه المكاتبة" }, { status: 404 });
        }

        // إذا كان المطلوب فقط الإخطار (لأن الملف تم تحديثه يدوياً أو بواسطة نظام آخر)
        if (!onlyNotify) {
            // 2. البحث عن ملف الوورد
            let actualWordPath = null;
            const extensions = [".docm", ".docx"];
            for (const ext of extensions) {
                const checkPath = basePath + ext;
                if (fs.existsSync(checkPath)) {
                    actualWordPath = checkPath;
                    break;
                }
            }

            if (!actualWordPath) {
                return NextResponse.json({ success: false, error: "لم يتم العثور على ملف الوورد الأصلي للتحديث" }, { status: 404 });
            }

            const extension = actualWordPath.toLowerCase().endsWith(".docx") ? ".docx" : ".docm";
            const pdfPathOnDisk = basePath + ".pdf";

            // 3. استراتيجية التحويل
            const tempDir = os.tmpdir();
            const tempFileName = `update_${docNo}_${Date.now()}${extension}`;
            const tempDocPath = path.join(tempDir, tempFileName);
            const tempPdfPath = tempDocPath.replace(/\.(docm|docx)$/i, '.pdf');

            try {
                fs.copyFileSync(actualWordPath, tempDocPath);
            } catch (copyErr) {
                return NextResponse.json({ success: false, error: "فشل الوصول للملف. تأكد من إغلاقه في الوورد أولاً." }, { status: 500 });
            }

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

                const tempPsFile = path.join(tempDir, `update_script_${docNo}.ps1`);
                fs.writeFileSync(tempPsFile, psScript, { encoding: 'utf8' });
                await execPromise(`powershell -ExecutionPolicy Bypass -File "${tempPsFile}"`);
                if (fs.existsSync(tempPsFile)) fs.unlinkSync(tempPsFile);

                if (!fs.existsSync(tempPdfPath)) {
                    throw new Error("فشل توليد ملف PDF الجديد");
                }

                // محاولة النسخ مع تكرار المحاولة في حالة وجود قفل على الملف (EBUSY)
                let copied = false;
                let attempts = 0;
                while (!copied && attempts < 3) {
                    try {
                        fs.copyFileSync(tempPdfPath, pdfPathOnDisk);
                        copied = true;
                    } catch (copyErr) {
                        attempts++;
                        if (copyErr.code === 'EBUSY' && attempts < 3) {
                            await new Promise(resolve => setTimeout(resolve, 1000)); // انتظر ثانية
                        } else {
                            throw copyErr;
                        }
                    }
                }

                if (fs.existsSync(tempDocPath)) fs.unlinkSync(tempDocPath);
                if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);

            } catch (convErr) {
                console.error("Update conversion error:", convErr);
                let errorMsg = convErr.message;
                if (convErr.code === 'EBUSY') {
                    errorMsg = "الملف قيد الاستخدام حالياً من قبل برنامج آخر، برجاء إغلاق أي نافذة تعرض هذا الـ PDF والمحاولة مرة أخرى.";
                }
                return NextResponse.json({ success: false, error: "خطأ أثناء تحويل الوورد: " + errorMsg }, { status: 500 });
            }
        }

        // 4. إرسال إشعارات لكل المستلمين
        const recipientsRes = await connection.execute(
            `SELECT GEHA_C FROM RECIP_GEHA_NEW WHERE DOC_NO = :docNo`,
            { docNo }
        );

        const recipients = recipientsRes.rows.map(r => r[0]);
        const notifMessage = `تم تعديل وتحديث ملف المكاتبة رقم (${docNo}): ${subject}`;

        for (const recipientId of recipients) {
            if (recipientId && String(recipientId) !== String(session.empNum)) {
                await sendNotification({
                    senderId: session.empNum,
                    receiverId: recipientId,
                    message: notifMessage,
                    docNo: docNo
                });
            }
        }

        await connection.commit();
        return NextResponse.json({ success: true, message: onlyNotify ? "تم إرسال إشعارات التعديل بنجاح" : "تم تحديث الملف وإرسال الإشعارات بنجاح" });

    } catch (err) {
        console.error("Update API Error:", err);
        if (connection) await connection.rollback().catch(() => { });
        return NextResponse.json({ success: false, error: "Database Error: " + err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}
