import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function GET(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    if (!search || search.length < 2) {
        return NextResponse.json({ success: true, data: [] });
    }

    let connection;
    try {
        connection = await getConnection2();
        // نبحث في المكاتبات التي شارك فيها المستخدم كمرسل أو مستقبل أو موجودة في البيانات الأساسية
        const result = await connection.execute(
            `SELECT DISTINCT d.DOC_NO, d.SUBJECT, d.FILE_NAME
             FROM DOC_DATA_NEW d
             LEFT JOIN RECIP_GEHA_NEW r ON d.DOC_NO = r.DOC_NO
             WHERE (UPPER(d.SUBJECT) LIKE UPPER(:search) OR d.DOC_NO LIKE :search)
               AND (r.PLACE_C = :empNum OR r.GEHA_C = :empNum OR d.SENDER_EMP = :empNum)
             ORDER BY d.DOC_NO DESC`,
            {
                search: `%${search}%`,
                empNum: session.empNum
            },
            { maxRows: 10 }
        );

        const columns = result.metaData.map(col => col.name);
        const rows = result.rows.map(row => {
            const obj = {};
            row.forEach((val, idx) => { obj[columns[idx]] = val; });
            return obj;
        });

        return NextResponse.json({ success: true, data: rows });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}
