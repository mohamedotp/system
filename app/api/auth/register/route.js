import { NextResponse } from "next/server";
import { getConnection } from "@/lib/oracle";
import bcrypt from "bcryptjs";

export async function POST(req) {
    try {
        const { empNum, password } = await req.json();

        if (!empNum || !password) {
            return NextResponse.json(
                { success: false, error: "كود الملف وكلمة المرور مطلوبان" },
                { status: 400 }
            );
        }

        const connection = await getConnection();

        try {
            // 1. التأكد من وجود الموظف في جدول MAIN_MAST
            const checkEmp = await connection.execute(
                "SELECT emp_num FROM main_mast WHERE emp_num = :empNum",
                [empNum]
            );

            if (checkEmp.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: "رقم الملف غير موجود في قاعدة بيانات الشركة" },
                    { status: 404 }
                );
            }

            // 2. التأكد من أن الموظف لم يسجل من قبل
            const checkUser = await connection.execute(
                "SELECT emp_num FROM USER_PASSWORD WHERE emp_num = :empNum",
                [empNum]
            );

            if (checkUser.rows.length > 0) {
                return NextResponse.json(
                    { success: false, error: "رقم الملف مسجل بالفعل" },
                    { status: 400 }
                );
            }

            // 3. تشفير كلمة المرور
            const hashedPassword = await bcrypt.hash(password, 10);

            // 4. إدراج الموظف في جدول USER_PASSWORD
            await connection.execute(
                `INSERT INTO USER_PASSWORD (EMP_NUM, PASSWORD_HASH, CREATED_AT) 
         VALUES (:empNum, :hashedPassword, SYSDATE)`,
                [empNum, hashedPassword],
                { autoCommit: true }
            );

            return NextResponse.json({
                success: true,
                message: "تم التسجيل بنجاح، يمكنك الآن تسجيل الدخول"
            });

        } finally {
            await connection.close();
        }
    } catch (error) {
        console.error("Register Error:", error);
        return NextResponse.json(
            { success: false, error: "حدث خطأ أثناء التسجيل" },
            { status: 500 }
        );
    }
}
