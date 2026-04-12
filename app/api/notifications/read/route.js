import { NextResponse } from "next/server";
import { getConnection, getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function POST(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false }, { status: 401 });

    const { notifId, all } = await req.json();

    let connection;
    try {
        try {
            connection = await getConnection();
            if (all) {
                await connection.execute(
                    `UPDATE SYSTEM_NOTIFICATIONS SET READ_FLAG = 1 WHERE RECEIVER_ID = :empNum`,
                    { empNum: session.empNum },
                    { autoCommit: true }
                );
            } else {
                await connection.execute(
                    `UPDATE SYSTEM_NOTIFICATIONS SET READ_FLAG = 1 WHERE ROWID = :notifId`,
                    { notifId },
                    { autoCommit: true }
                );
            }
        } catch (salaryErr) {
            console.warn("⚠️ Notification READ update fail on Salary, trying Doc fallback...");
            if (connection) await connection.close().catch(() => { });
            connection = await getConnection2();
            if (all) {
                await connection.execute(
                    `UPDATE SYSTEM_NOTIFICATIONS SET READ_FLAG = 1 WHERE RECEIVER_ID = :empNum`,
                    { empNum: session.empNum },
                    { autoCommit: true }
                );
            } else {
                await connection.execute(
                    `UPDATE SYSTEM_NOTIFICATIONS SET READ_FLAG = 1 WHERE ROWID = :notifId`,
                    { notifId },
                    { autoCommit: true }
                );
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Notification READ Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close().catch(() => { });
    }
}
