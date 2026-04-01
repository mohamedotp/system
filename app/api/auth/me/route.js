import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getConnection, getConnection2 } from "@/lib/oracle";

export async function GET() {
    let connection;
    try {
        const session = await getSession();

        // 1. التحقق من وجود جلسة
        if (!session || !session.empNum) {
            return NextResponse.json({ success: false, error: "No session found" }, { status: 401 });
        }

        const empNumInput = session.empNum;
        let userData = null;

        // 2. محاولة جلب الاسم من قاعدة البيانات
        try {
            // نحاول الحساب الأول (Salary)
            try {
                connection = await getConnection();
                const result = await connection.execute(
                    `SELECT emp_name FROM main_mast WHERE emp_num = :empNum`,
                    { empNum: empNumInput }
                );
                if (result.rows && result.rows.length > 0) {
                    userData = { empNum: empNumInput, empName: result.rows[0][0] };
                }
            } catch (err) {
                console.warn(`[AuthMe] Salary DB check failed: ${err.message}`);
            } finally {
                if (connection) {
                    await connection.close().catch(() => { });
                    connection = null;
                }
            }

            // إذا لم نجد الاسم، نحاول الحساب الثاني (Doc)
            if (!userData) {
                try {
                    connection = await getConnection2();
                    const result2 = await connection.execute(
                        `SELECT emp_name FROM main_mast WHERE emp_num = :empNum`,
                        { empNum: empNumInput }
                    );
                    if (result2.rows && result2.rows.length > 0) {
                        userData = { empNum: empNumInput, empName: result2.rows[0][0] };
                    }
                } catch (err) {
                    console.warn(`[AuthMe] Doc DB check failed: ${err.message}`);
                } finally {
                    if (connection) {
                        await connection.close().catch(() => { });
                        connection = null;
                    }
                }
            }
        } catch (dbErr) {
            console.error("[AuthMe] Database abstraction layer failed:", dbErr.message);
        }

        // 3. الرد النهائي (حتى لو فشلت قاعدة البيانات تماماً سنرد برقم الملف لضمان استمرار عمل الواجهة)
        if (!userData) {
            console.log(`[AuthMe] User ${empNumInput} not found in DB, returning session data only.`);
            userData = { empNum: empNumInput, empName: "مستخدم " + empNumInput };
        }

        return NextResponse.json({ success: true, user: userData });

    } catch (fatalError) {
        console.error("[AuthMe] Fatal Crash:", fatalError);
        // نضمن إرسال JSON صالح حتى لو حدث انهيار غير متوقع
        return NextResponse.json({
            success: false,
            error: "Server encountered a fatal error",
            details: fatalError.message
        }, { status: 500 });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) { }
        }
    }
}
