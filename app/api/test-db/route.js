import { NextResponse } from "next/server";
import { getConnection, getConnection2 } from "@/lib/oracle";

export async function GET() {
    let salaryInfo = [];
    let docInfo = [];

    async function getInfo(getConnFunc) {
        let conn;
        try {
            conn = await getConnFunc();
            const resT = await conn.execute("SELECT table_name FROM user_tables WHERE table_name LIKE '%NOTIF%' OR table_name LIKE '%MODIF%'");
            const resS = await conn.execute("SELECT sequence_name FROM user_sequences WHERE sequence_name LIKE '%NOTIF%' OR sequence_name LIKE '%MODIF%'");
            const info = [
                ...resT.rows.map(r => "TABLE: " + r[0]),
                ...resS.rows.map(r => "SEQ: " + r[0])
            ];
            await conn.close();
            return info;
        } catch (e) { return ["Error: " + e.message]; }
    }

    salaryInfo = await getInfo(getConnection);
    docInfo = await getInfo(getConnection2);

    return NextResponse.json({ salaryInfo, docInfo });
}
