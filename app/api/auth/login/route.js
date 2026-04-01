import { NextResponse } from "next/server";
import { getConnection } from "@/lib/oracle";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";

export async function POST(req) {
    try {
        const { empNum, password } = await req.json();

        if (!empNum || !password) {
            return NextResponse.json(
                { success: false, error: " رقم الملف وكلمة المرور مطلوبان" },
                { status: 400 }
            );
        }

        console.log("Login attempt for:", empNum);
        const connection = await getConnection();
        console.log("DB Connection successful");

        try {
            const result = await connection.execute(
                "SELECT password_hash FROM USER_PASSWORD WHERE emp_num = :empNum",
                [empNum]
            );

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: "  برجاء انشئ حساب للدخول اولا   " },
                    { status: 401 }
                );
            }

            const hashedPassword = result.rows[0][0]; // or result.rows[0].PASSWORD_HASH depending on config
            // Note: result.rows[0] depends on oracledb fetch type. Default is array.

            const isPasswordValid = await bcrypt.compare(password, hashedPassword);
            console.log("Password check result:", isPasswordValid);

            if (!isPasswordValid) {
                return NextResponse.json(
                    { success: false, error: "كلمة المرور غير صحيحة" },
                    { status: 401 }
                );
            }

            // إنشاء الجلسة
            await createSession(empNum);

            return NextResponse.json({
                success: true,
                message: "تم تسجيل الدخول بنجاح"
            });

        } finally {
            await connection.close();
        }
    } catch (error) {
        console.error("Login Error Detailed:", error);
        return NextResponse.json(
            { success: false, error: `خطأ في السيرفر: ${error.message}` },
            { status: 500 }
        );
    }
}
