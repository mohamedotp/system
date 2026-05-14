import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function GET(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const docNo = searchParams.get("docNo");

    if (!docNo) {
        return NextResponse.json({ success: false, error: "رقم المكاتبة مطلوب" }, { status: 400 });
    }

    let connection;
    try {
        connection = await getConnection2();

        const result = await connection.execute(
            `SELECT FILE_PATH, FILE_DESC, ATTACH_TYPE
             FROM ATTACHMENTS
             WHERE DOC_NO = :docNo
             ORDER BY ROWID`,
            { docNo }
        );

        const attachments = result.rows.map(row => ({
            path: row[0],
            desc: row[1],
            type: row[2],
            name: row[0] ? row[0].split("\\").pop().split("/").pop() : "مرفق"
        }));

        return NextResponse.json({ success: true, attachments });

    } catch (err) {
        console.error("Fetch Attachments Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export const dynamic = "force-dynamic";
