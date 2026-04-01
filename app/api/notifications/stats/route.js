import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function GET(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const empNum = session.empNum;
    let connection;

    try {
        connection = await getConnection2();

        const query = `
            SELECT 
                COUNT(CASE WHEN TRUNC(r.DOC_DATE) = TRUNC(SYSDATE) THEN 1 END) as TODAY_COUNT,
                COUNT(CASE WHEN TRUNC(r.DOC_DATE) < TRUNC(SYSDATE) AND (r.ANSERED = 0 OR r.ANSERED IS NULL OR r.ANSERED <> 1) THEN 1 END) as UNREPLIED_PAST_COUNT
            FROM RECIP_GEHA_NEW r
            WHERE r.GEHA_C = :empNum
        `;

        const result = await connection.execute(query, { empNum });

        const todayMemoCount = result.rows[0][0] || 0;
        const unrepliedPastMemosCount = result.rows[0][1] || 0;

        return NextResponse.json({ 
            success: true, 
            data: {
                todayMemos: todayMemoCount,
                unrepliedPastMemos: unrepliedPastMemosCount
            }
        });

    } catch (err) {
        console.error("Stats API Error:", err);
        return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    } finally {
        if (connection) {
            await connection.close().catch(() => {});
        }
    }
}
