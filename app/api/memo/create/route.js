import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }

    let connection;
    try {
        const { docType, subject, recipientEmpNums, parentDocNo, transType, vacationEmpNo, fromDate, toDate } = await req.json();

        if (!subject || !recipientEmpNums || recipientEmpNums.length === 0) {
            return NextResponse.json({ success: false, error: "بيانات ناقصة (الموضوع أو المستلم)" }, { status: 400 });
        }

        const recipientEmpNum = recipientEmpNums[0];
        const currentEmpNum = session.empNum;
        connection = await getConnection2();

        const finalEmpNo = vacationEmpNo ? parseInt(vacationEmpNo) : recipientEmpNum;
        const finalFromDate = fromDate ? new Date(fromDate) : null;
        const finalToDate = toDate ? new Date(toDate) : null;

        // توليد DOC_NO فريد مع retry في حالة تعارض unique constraint
        const docNoResult = await connection.execute(
            `SELECT NVL(MAX(DOC_NO), 0) + 1 FROM DOC_DATA_NEW`
        );
        let newDocNo = docNoResult.rows[0][0];
        let mainDoc = newDocNo;
        let mainDocNo = newDocNo;
        let finalTransType = transType || 1;

        if (parentDocNo) {
            const parentRes = await connection.execute(
                `SELECT MAIN_DOC, DOC_NO FROM DOC_DATA_NEW WHERE DOC_NO = :parentDocNo`,
                { parentDocNo }
            );
            if (parentRes.rows.length > 0) {
                mainDoc = parentRes.rows[0][0] || parentRes.rows[0][1];
                mainDocNo = parentRes.rows[0][1];
            }
        }

        const kindResult = await connection.execute(
            `SELECT DOC_DESC_A, DOC_DESC FROM DOC_KIND WHERE DOC_KIND = :docType`,
            { docType: parseInt(docType) }
        );
        const docDescE = kindResult.rows.length > 0 ? kindResult.rows[0][1] : "DOC";

        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const dateStr = `${day}-${month}-${year}`;

        const baseNetworkPath = `\\\\192.168.13.12\\homes\\DOCUMENTS`;
        const dynamicFolder = `${baseNetworkPath}\\${year}\\${month}\\${day}\\${currentEmpNum}`;
        const fileName = `${newDocNo}_${docDescE}_${dateStr}`;
        let finalExtension = '.docm';
        try {
            if (!fs.existsSync(dynamicFolder)) {
                fs.mkdirSync(dynamicFolder, { recursive: true });
            }

            const extensions = ['.docm', '.docx'];
            let templatePath = null;

            for (const ext of extensions) {
                const checkPath = `\\\\192.168.13.12\\homes\\TAMPLET\\${docDescE}${ext}`;
                if (fs.existsSync(checkPath)) {
                    templatePath = checkPath;
                    finalExtension = ext;
                    break;
                }
            }

            if (!templatePath) {
                const fallbacks = ['TAMPLET.docm', 'EMPTY_DOC.docm', 'TAMPLET.docx'];
                for (const fallback of fallbacks) {
                    const checkPath = `\\\\192.168.13.12\\homes\\TAMPLET\\${fallback}`;
                    if (fs.existsSync(checkPath)) {
                        templatePath = checkPath;
                        finalExtension = fallback.endsWith('.docx') ? '.docx' : '.docm';
                        break;
                    }
                }
            }

            if (templatePath) {
                const destinationPath = `${dynamicFolder}\\${fileName}${finalExtension}`;

                let copied = false;
                let attempts = 0;
                while (!copied && attempts < 3) {
                    try {
                        fs.copyFileSync(templatePath, destinationPath);
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

                console.log(`✅ File copied from ${templatePath} to ${destinationPath}`);

                // ======== إضافة مقترحة من المستخدم لتأكيد خصائص الصفحة عبر السيرفر قبل فتحها للعميل ========
                try {
                    const { exec } = require('child_process');
                    const util = require('util');
                    const execPromise = util.promisify(exec);
                    const os = require('os');

                    // قتل أي عملية وورد معلقة كإجراء احترازي - تم التعليق لعدم التأثير على Word المفتوح
                    // await execPromise('taskkill /F /IM winword.exe').catch(() => { });
                    await new Promise(resolve => setTimeout(resolve, 300));

                    const tempDir = os.tmpdir();
                    const pdfInitPath = destinationPath.replace(/\.(docm|docx)$/i, ".pdf");

                    const psInitScript = `
                        $word = New-Object -ComObject Word.Application;
                        $word.Visible = $false;
                        $word.DisplayAlerts = 0; 
                        $word.ScreenUpdating = $false;
                        try {
                            # --- فتح الملف كقراءة فقط لضمان عدم تغيير إعداداته أو تنسيقه ---
                            $doc = $word.Documents.Open('${destinationPath}', $false, $true);

                            Start-Sleep -Seconds 1;
                            $doc.Fields.Update();
                            $doc.Repaginate();

                            # --- تصدير الـ PDF من النسخة الحالية بدون حفظ أي شيء للوورد ---
                            $doc.SaveAs([ref]'${pdfInitPath}', [ref]17);
                            $doc.Close(0); # 0 = wdDoNotSaveChanges

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

                    const tempPsFile = path.join(tempDir, `init_${Date.now()}.ps1`);
                    fs.writeFileSync(tempPsFile, psInitScript, { encoding: 'utf8' });
                    await execPromise(`powershell -ExecutionPolicy Bypass -File "${tempPsFile}"`);
                    if (fs.existsSync(tempPsFile)) fs.unlinkSync(tempPsFile);

                    console.log(`✅ Server initialized formatting for ${destinationPath}`);

                } catch (initErr) {
                    console.log(`⚠️ Warning: Server init formatting failed, continuing normal flow`, initErr);
                }
                // =========================================================================================

            } else {
                console.error("❌ No template found for:", docDescE);
            }
        } catch (fsErr) {
            console.error("FileSystem Error:", fsErr.message);
            throw new Error(`تعذر إنشاء ملف الورد: ${fsErr.message}`);
        }

        const basePathForDb = `${dynamicFolder}\\${fileName}`;

        const extraCols = finalFromDate && finalToDate ? `, FROM_DATE, TO_DATE` : ``;
        const extraVals = finalFromDate && finalToDate ? `, TRUNC(:fromDate), TRUNC(:toDate)` : ``;
        const baseBinds = {
            newDocNo, currentEmpNum, subject,
            docType: parseInt(docType),
            finalEmpNo,
            filePath: basePathForDb,
            finalTransType,
            mainDoc,
            mainDocNo
        };
        if (finalFromDate && finalToDate) {
            baseBinds.fromDate = finalFromDate;
            baseBinds.toDate = finalToDate;
        }

        // إدراج مع retry تلقائي في حالة ORA-00001 (unique constraint)
        let insertSuccess = false;
        let insertAttempts = 0;
        while (!insertSuccess && insertAttempts < 5) {
            try {
                baseBinds.newDocNo = newDocNo;
                // تحديث MAIN_DOC/MAIN_DOC_NO إذا كان هو نفسه (لم يكن هناك parentDocNo)
                if (!parentDocNo) {
                    baseBinds.mainDoc = newDocNo;
                    baseBinds.mainDocNo = newDocNo;
                }
                await connection.execute(`
                    INSERT INTO DOC_DATA_NEW (
                        DOC_NO, DOC_DATE, PLACE_C, SUBJECT, DOC_TYPE, EMP_NO, FILE_NAME, SECTORE, FLAG, TRANS_TYPE, MAIN_DOC, MAIN_DOC_NO${extraCols}
                    ) VALUES (
                        :newDocNo, SYSDATE, :currentEmpNum, :subject, :docType, :finalEmpNo, :filePath, 0, 1, :finalTransType, :mainDoc, :mainDocNo${extraVals}
                    )
                `, baseBinds, { autoCommit: true });
                insertSuccess = true;
            } catch (insertErr) {
                if (insertErr.message && insertErr.message.includes('ORA-00001') && insertAttempts < 4) {
                    insertAttempts++;
                    console.warn(`⚠️ DOC_NO conflict on ${newDocNo}, retrying (attempt ${insertAttempts})...`);
                    await new Promise(resolve => setTimeout(resolve, 150 * insertAttempts));
                    const retryResult = await connection.execute(`SELECT NVL(MAX(DOC_NO), 0) + 1 FROM DOC_DATA_NEW`);
                    newDocNo = retryResult.rows[0][0];
                } else {
                    throw insertErr;
                }
            }
        }

        return NextResponse.json({
            success: true,
            docNo: newDocNo,
            filePath: `${basePathForDb}${finalExtension}`,
            generatedPath: `${basePathForDb}${finalExtension}`,
            message: "تم حفظ البيانات وتجهيز الملف بنجاح"
        });

    } catch (err) {
        console.error("Create Memo API Error:", err);
        if (connection) await connection.rollback().catch(() => { });
        return NextResponse.json({ success: false, error: "حدث خطأ أثناء الحفظ: " + err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export const dynamic = "force-dynamic";
