import { NextResponse } from "next/server";
import { getConnection } from "@/lib/oracle";

export async function GET() {
    let conn;
    try {
        conn = await getConnection();
        await conn.execute(`
            CREATE TABLE SYSTEM_PUSH_SUBS (
                EMP_NUM VARCHAR2(50),
                SUBSCRIPTION_JSON CLOB,
                CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (EMP_NUM)
            )
        `);
        await conn.commit();
        return NextResponse.json({ success: true, message: "Table SYSTEM_PUSH_SUBS created" });
    } catch (e) {
        if (e.message.includes("ORA-00955")) {
            return NextResponse.json({ success: true, message: "Table already exists" });
        }
        return NextResponse.json({ success: false, error: e.message });
    } finally {
        if (conn) await conn.close();
    }
}
