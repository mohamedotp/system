import { NextResponse } from "next/server";
import { getConnection } from "@/lib/oracle";
import fs from "fs/promises";
import path from "path";

export async function POST(request) {
    let connection;
    try {
        const formData = await request.formData();
        const file = formData.get("signature");
        const empNum = formData.get("empNum");
        const adminEmpNum = formData.get("adminEmpNum");

        // التحقق من صلاحية الأدمن
        if (adminEmpNum !== "938") {
            return NextResponse.json({
                success: false,
                error: "غير مصرح لك برفع التوقيعات"
            }, { status: 403 });
        }

        if (!file || !empNum) {
            return NextResponse.json({
                success: false,
                error: "الملف ورقم الموظف مطلوبان"
            }, { status: 400 });
        }

        // مسار حفظ التوقيعات
        const signaturesDir = "\\\\192.168.1.7\\Scanned_Docs\\Signatures";

        // التأكد من وجود المجلد
        try {
            await fs.access(signaturesDir);
        } catch {
            await fs.mkdir(signaturesDir, { recursive: true });
        }

        // حفظ الملف
        const fileExtension = path.extname(file.name);
        const fileName = `signature_${empNum}${fileExtension}`;
        const filePath = path.join(signaturesDir, fileName);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await fs.writeFile(filePath, buffer);

        // حفظ المسار في قاعدة البيانات
        connection = await getConnection();

        const checkResult = await connection.execute(
            `SELECT EMP_NUM FROM EMPLOYEE_SIGNATURES WHERE EMP_NUM = :empNum`,
            { empNum }
        );

        if (checkResult.rows.length > 0) {
            await connection.execute(
                `UPDATE EMPLOYEE_SIGNATURES 
                 SET SIGNATURE_PATH = :filePath, UPDATED_DATE = SYSDATE 
                 WHERE EMP_NUM = :empNum`,
                { empNum, filePath },
                { autoCommit: true }
            );
        } else {
            await connection.execute(
                `INSERT INTO EMPLOYEE_SIGNATURES (EMP_NUM, SIGNATURE_PATH, CREATED_DATE, UPDATED_DATE) 
                 VALUES (:empNum, :filePath, SYSDATE, SYSDATE)`,
                { empNum, filePath },
                { autoCommit: true }
            );
        }

        return NextResponse.json({
            success: true,
            message: "تم رفع التوقيع بنجاح",
            filePath
        });

    } catch (error) {
        console.error("Error uploading signature:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Error closing connection:", err);
            }
        }
    }
}
