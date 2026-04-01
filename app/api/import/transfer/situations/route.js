import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function GET(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }

    let connection;
    try {
        connection = await getConnection2();

        const query = `
            SELECT SITUATION_C, SITUATION_DESC 
            FROM SITUATION_TYPE 
            ORDER BY SITUATION_C
        `;

        const result = await connection.execute(query);
        const columns = result.metaData.map(c => c.name);
        const rows = result.rows.map(row => {
            const obj = {};
            row.forEach((val, idx) => {
                obj[columns[idx]] = val;
            });
            return obj;
        });

        return NextResponse.json({
            success: true,
            data: rows
        });

    } catch (err) {
        console.error("Fetch Situations API Error:", err);
        return NextResponse.json({ success: false, error: "خطأ في جلب بيانات الحالات" }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export const dynamic = "force-dynamic";
