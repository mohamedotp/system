import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

// ── Server-side lock: يمنع نفس المستخدم من رفع مستند مرتين في نفس اللحظة ──
const uploadLocks = new Map(); // key: empNum, value: timestamp

export async function POST(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }

    const currentEmpNum = session.empNum;

    // ── فحص الـ lock: إذا كان هناك رفع جاري لنفس المستخدم خلال آخر 15 ثانية، ارجع فوراً ──
    const now = Date.now();
    const lastUpload = uploadLocks.get(currentEmpNum);
    if (lastUpload && (now - lastUpload) < 15000) {
        console.log(`[UPLOAD-WORD] Lock active for empNum=${currentEmpNum}, skipping duplicate request`);
        return NextResponse.json({ success: false, error: "يتم معالجة الطلب السابق، برجاء الانتظار" }, { status: 429 });
    }
    // سجّل الـ lock فوراً
    uploadLocks.set(currentEmpNum, now);
    
    let connection;
    try {
        const formData = await req.formData();
        const wordFile = formData.get("wordFile");
        const docType = formData.get("docType");
        const subject = formData.get("subject");

        if (!wordFile || !subject) {
            uploadLocks.delete(currentEmpNum);
            return NextResponse.json({ success: false, error: "بيانات ناقصة: يجب توفير الملف والموضوع" }, { status: 400 });
        }

        connection = await getConnection2();

        // توليد DOC_NO فريد
        const docNoResult = await connection.execute(
            `SELECT NVL(MAX(DOC_NO), 0) + 1 FROM DOC_DATA_NEW`
        );
        let newDocNo = docNoResult.rows[0][0];
        const mainDoc = newDocNo;
        const mainDocNo = newDocNo;

        // تحديد نوع المكاتبة (افتراضي 1 إذا لم يحدد)
        const finalDocType = docType ? parseInt(docType) : 500;
        
        // استخدام نوع المكاتبة لاسم الملف أيضاً
        let docDescE = "DOC";
        try {
            const kindResult = await connection.execute(
                `SELECT DOC_DESC FROM DOC_KIND WHERE DOC_KIND = :docType`,
                { docType: finalDocType }
            );
            if (kindResult.rows.length > 0) docDescE = kindResult.rows[0][0] || "DOC";
        } catch (e) { /* يكمل حتى لو فشل */ }

        // تحضير المسار على السيرفر
        const nowDate = new Date();
        const year = nowDate.getFullYear().toString();
        const month = (nowDate.getMonth() + 1).toString().padStart(2, '0');
        const day = nowDate.getDate().toString().padStart(2, '0');
        const dateStr = `${day}-${month}-${year}`;

        const baseNetworkPath = `\\\\192.168.13.12\\homes\\DOCUMENTS`;
        const dynamicFolder = `${baseNetworkPath}\\${year}\\${month}\\${day}\\${currentEmpNum}`;
        const fileName = `${newDocNo}_${docDescE}_${dateStr}`;

        if (!fs.existsSync(dynamicFolder)) {
            fs.mkdirSync(dynamicFolder, { recursive: true });
        }

        // تحديد امتداد الملف
        const originalName = wordFile.name;
        const extension = originalName.toLowerCase().endsWith('.docx') ? '.docx' : '.docm';
        const destinationPath = `${dynamicFolder}\\${fileName}${extension}`;

        // حفظ الملف المرفوع على السيرفر
        const bytes = await wordFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        fs.writeFileSync(destinationPath, buffer);

        const basePathForDb = `${dynamicFolder}\\${fileName}`;

        // إدراج في قاعدة البيانات مع retry تلقائي
        let insertSuccess = false;
        let insertAttempts = 0;
        while (!insertSuccess && insertAttempts < 5) {
            try {
                await connection.execute(`
                    INSERT INTO DOC_DATA_NEW (
                        DOC_NO, DOC_DATE, PLACE_C, SUBJECT, DOC_TYPE, EMP_NO, FILE_NAME, SECTORE, FLAG, TRANS_TYPE, MAIN_DOC, MAIN_DOC_NO
                    ) VALUES (
                        :newDocNo, SYSDATE, :currentEmpNum, :subject, :docType, :currentEmpNum, :filePath, 0, 1, 1, :mainDoc, :mainDocNo
                    )
                `, {
                    newDocNo,
                    currentEmpNum,
                    subject,
                    docType: finalDocType,
                    filePath: basePathForDb,
                    mainDoc,
                    mainDocNo
                }, { autoCommit: true });
                insertSuccess = true;
            } catch (insertErr) {
                if (insertErr.message && insertErr.message.includes('ORA-00001') && insertAttempts < 4) {
                    insertAttempts++;
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
            filePath: `${basePathForDb}${extension}`,
            generatedPath: `${basePathForDb}${extension}`,
            message: "تم رفع الملف بنجاح"
        });

    } catch (err) {
        console.error("Upload Word API Error:", err);
        if (connection) await connection.rollback().catch(() => { });
        return NextResponse.json({ success: false, error: "حدث خطأ: " + err.message }, { status: 500 });
    } finally {
        // إزالة الـ lock بعد الانتهاء
        uploadLocks.delete(currentEmpNum);
        if (connection) await connection.close();
    }
}

export const dynamic = "force-dynamic";
