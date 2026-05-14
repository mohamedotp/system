import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }

    let connection;
    try {
        const formData = await req.formData();
        const docNo = formData.get("docNo");
        const files = formData.getAll("files");
        const descriptions = formData.getAll("descriptions");

        if (!docNo || !files || files.length === 0) {
            return NextResponse.json({ success: false, error: "بيانات ناقصة" }, { status: 400 });
        }

        connection = await getConnection2();

        // 1. جلب بيانات المكاتبة (المسار + بيانات الجدول اللازمة لـ ATTACHMENTS)
        const result = await connection.execute(
            `SELECT FILE_NAME, DOC_DATE, MAIN_DOC, MAIN_DOC_NO, MAIN_DOC_DATE, PLACE_C, MAIN_DATE
             FROM DOC_DATA_NEW WHERE DOC_NO = :docNo`,
            { docNo }
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ success: false, error: "رقم المكاتبة غير صحيح" }, { status: 404 });
        }

        const [mainDocPath, docDate, mainDoc, mainDocNo, mainDocDate, placeC, mainDate] = result.rows[0];

        if (!mainDocPath) {
            return NextResponse.json({ success: false, error: "لم يتم تحديد مسار للمكاتبة بعد" }, { status: 400 });
        }

        const dirPath = path.dirname(mainDocPath);
        const attachmentData = [];

        // 2. حفظ الملفات على الديسك + إدراجها في جدول ATTACHMENTS
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const desc = descriptions[i] || file.name;
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // تنظيف اسم الملف والحفاظ على الامتداد
            const originalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
            const newFileName = `Att_${docNo}_${Date.now()}_${i}_${originalName}`;
            const finalPath = path.join(dirPath, newFileName);

            let written = false;
            let writeAttempts = 0;
            while (!written && writeAttempts < 3) {
                try {
                    fs.writeFileSync(finalPath, buffer);
                    written = true;
                } catch (writeErr) {
                    writeAttempts++;
                    if (writeErr.code === 'EBUSY' && writeAttempts < 3) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else {
                        throw writeErr;
                    }
                }
            }

            attachmentData.push({ path: finalPath, desc });

            // ✅ حفظ في جدول ATTACHMENTS حتى تظهر عند فتح المسودة لاحقاً
            try {
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
                        mainDocNo: mainDocNo || docNo,
                        mainDocDate: mainDocDate || docDate,
                        mainDoc: mainDoc || docNo,
                        filePath: finalPath,
                        placeC,
                        mainDate: mainDate || docDate,
                        fileDesc: desc
                    },
                    { autoCommit: false }
                );
            } catch (dbErr) {
                // لو فشل الإدراج في DB نكمل — الملف محفوظ على الديسك على الأقل
                console.error(`[UPLOAD] Failed to insert attachment into DB for docNo=${docNo}:`, dbErr.message);
            }
        }

        await connection.commit();

        return NextResponse.json({
            success: true,
            attachments: attachmentData
        });

    } catch (err) {
        console.error("Upload Error:", err);
        if (connection) await connection.rollback().catch(() => {});
        return NextResponse.json({ success: false, error: "فشل رفع الملف: " + err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export const dynamic = "force-dynamic";
