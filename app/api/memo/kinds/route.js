import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function GET(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }

    let connection;
    try {
        connection = await getConnection2();

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q");

        let sql = `SELECT DOC_KIND, DOC_DESC_A, DOC_DESC FROM DOC_KIND`;
        const binds = {};

        if (query) {
            sql += ` WHERE DOC_DESC_A LIKE :query OR DOC_DESC LIKE :query`;
            binds.query = `%${query}%`;
        }

        sql += ` ORDER BY DOC_DESC_A ASC`;
        // Limit results to avoid huge payloads if query is generic
        if (query) sql = `SELECT * FROM (${sql}) WHERE ROWNUM <= 50`;

        const result = await connection.execute(sql, binds);

        const kinds = result.rows.map(row => ({
            id: row[0],
            label: row[1],
            DOC_DESC: row[2], // English description for template mapping
            DOC_DESC_A: row[1]
        }));

        return NextResponse.json({
            success: true,
            data: kinds
        });

    } catch (err) {
        console.error("Fetch Kinds API Error:", err);
        return NextResponse.json({ success: false, error: "حدث خطأ أثناء جلب أنواع المكاتبات" }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export const dynamic = "force-dynamic";
