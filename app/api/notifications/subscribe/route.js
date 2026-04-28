import { NextResponse } from "next/server";
import { getConnection } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function POST(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const subscription = await req.json();
    const empNum = session.empNum;

    let conn;
    try {
        conn = await getConnection();

        // استخدام MERGE للدمج بناءً على رقم الموظف والرابط (Endpoint)
        await conn.execute(`
            MERGE INTO SYSTEM_PUSH_SUBS t
            USING (SELECT :empNum as EMP_NUM, :sub as SUBS_JSON, :endpoint as EP FROM DUAL) s
            ON (t.ENDPOINT = s.EP)
            WHEN MATCHED THEN
                UPDATE SET EMP_NUM = s.EMP_NUM, SUBSCRIPTION_JSON = s.SUBS_JSON, CREATED_AT = CURRENT_TIMESTAMP
            WHEN NOT MATCHED THEN
                INSERT (EMP_NUM, SUBSCRIPTION_JSON, ENDPOINT) VALUES (s.EMP_NUM, s.SUBS_JSON, s.EP)
        `, {
            empNum: String(empNum),
            sub: JSON.stringify(subscription),
            endpoint: subscription.endpoint
        });

        await conn.commit();
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Subscription Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    } finally {
        if (conn) await conn.close();
    }
}
