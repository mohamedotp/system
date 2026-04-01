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

        // Determine which EMP_NO to use (Vacation Emp or Recipient Emp)
        const finalEmpNo = vacationEmpNo ? parseInt(vacationEmpNo) : recipientEmpNum;
        const finalFromDate = fromDate ? new Date(fromDate) : null;
        const finalToDate = toDate ? new Date(toDate) : null;

        // 1. الحصول على رقم مكاتبة جديد
        const docNoResult = await connection.execute(
            `SELECT COALESCE(MAX(DOC_NO), 0) + 1 FROM DOC_DATA_NEW`
        );
        const newDocNo = docNoResult.rows[0][0];

        // 2. معالجة بيانات الربط (في حالة الرد)
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

        // 3. جلب وصف نوع المكاتبة
        const kindResult = await connection.execute(
            `SELECT DOC_DESC_A, DOC_DESC FROM DOC_KIND WHERE DOC_KIND = :docType`,
            { docType: parseInt(docType) }
        );
        const docDescE = kindResult.rows.length > 0 ? kindResult.rows[0][1] : "DOC";

        // 4. بناء المسار التلقائي
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const dateStr = `${day}-${month}-${year}`;

        const baseNetworkPath = `\\\\192.168.13.12\\homes\\DOCUMENTS`;
        const dynamicFolder = `${baseNetworkPath}\\${year}\\${month}\\${day}\\${currentEmpNum}`;
        const fileName = `${newDocNo}_${docDescE}_${dateStr}`;
        let finalExtension = '.docm'; // الافتراضي لضمان استخدامه في الاستجابة
        try {
            if (!fs.existsSync(dynamicFolder)) {
                fs.mkdirSync(dynamicFolder, { recursive: true });
            }

            // محاولة البحث عن القالب بامتدادات مختلفة
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

            // إذا لم يجد القالب المحدد، نستخدم القالب الافتراضي TAMPLET أو EMPTY_DOC
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
            } else {
                console.error("❌ No template found for:", docDescE);
                // ممكن ننشئ ملف فارغ هنا لو حابب، بس الأفضل نبلغ المستخدم
            }
        } catch (fsErr) {
            console.error("FileSystem Error:", fsErr.message);
            throw new Error(`تعذر إنشاء ملف الورد: ${fsErr.message}`);
        }

        // يتم حفظ المسار في قاعدة البيانات بدون امتداد لسهولة التعامل لاحقاً مع PDF وغيره
        const basePathForDb = `${dynamicFolder}\\${fileName}`;

        // 5. إدراج في قاعدة البيانات
        // بناء SQL ديناميكياً لتجنب ORA-00932 عند تمرير null لـ TRUNC() في حالة المكاتبات غير الإجازة
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

        await connection.execute(`
            INSERT INTO DOC_DATA_NEW (
                DOC_NO, DOC_DATE, PLACE_C, SUBJECT, DOC_TYPE, EMP_NO, FILE_NAME, SECTORE, FLAG, TRANS_TYPE, MAIN_DOC, MAIN_DOC_NO${extraCols}
            ) VALUES (
                :newDocNo, SYSDATE, :currentEmpNum, :subject, :docType, :finalEmpNo, :filePath, 0, 1, :finalTransType, :mainDoc, :mainDocNo${extraVals}
            )
        `, baseBinds, { autoCommit: true });

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
