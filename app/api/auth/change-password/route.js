import { NextResponse } from "next/server";
import { getConnection } from "@/lib/oracle";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";

export async function POST(req) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, error: "غير مصرح لك بالوصول" }, { status: 401 });
        }

        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { success: false, error: "كلمة المرور الحالية والجديدة مطلوبتان" },
                { status: 400 }
            );
        }

        const connection = await getConnection();

        try {
            // 1. الحصول على كلمة المرور الحالية من القاعدة
            const result = await connection.execute(
                "SELECT password_hash FROM USER_PASSWORD WHERE emp_num = :empNum",
                [session.empNum]
            );

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { success: false, error: "المستخدم غير موجود" },
                    { status: 404 }
                );
            }

            const currentHashedPassword = result.rows[0][0];

            // 2. التحقق من صحة كلمة المرور الحالية
            const isPasswordValid = await bcrypt.compare(currentPassword, currentHashedPassword);

            if (!isPasswordValid) {
                return NextResponse.json(
                    { success: false, error: "كلمة المرور الحالية غير صحيحة" },
                    { status: 401 }
                );
            }

            // 3. تشفير كلمة المرور الجديدة
            const newHashedPassword = await bcrypt.hash(newPassword, 10);

            // 4. تحديث القاعدة
            await connection.execute(
                `UPDATE USER_PASSWORD 
         SET PASSWORD_HASH = :newHashedPassword, UPDATED_AT = SYSDATE 
         WHERE EMP_NUM = :empNum`,
                [newHashedPassword, session.empNum],
                { autoCommit: true }
            );

            return NextResponse.json({
                success: true,
                message: "تم تغيير كلمة المرور بنجاح"
            });

        } finally {
            await connection.close();
        }
    } catch (error) {
        console.error("Change Password Error:", error);
        return NextResponse.json(
            { success: false, error: "حدث خطأ أثناء تغيير كلمة المرور" },
            { status: 500 }
        );
    }
}
