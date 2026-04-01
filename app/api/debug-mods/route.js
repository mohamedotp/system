import { NextResponse } from "next/server";
import { getConnection, getConnection2 } from "@/lib/oracle";
import oracledb from "oracledb";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("filePath");

    if (!filePath) return NextResponse.json({ error: "Missing filePath" });

    const decentPath = filePath.trim().replace(/\//g, "\\");
    const results = [];

    async function checkDb(getConn, label) {
        let conn;
        try {
            conn = await getConn();
            const tables = ['DOC_MODIFICATIONS', 'DOC_MODIFICATIONS_NEW'];
            for (const t of tables) {
                try {
                    const res = await conn.execute(
                        `SELECT ID, FILE_PATH, USER_EMP_NUM, TYPE FROM ${t} WHERE UPPER(FILE_PATH) = UPPER(:path)`,
                        { path: decentPath },
                        { outFormat: oracledb.OUT_FORMAT_OBJECT }
                    );
                    if (res.rows.length > 0) {
                        results.push({ db: label, table: t, rows: res.rows });
                    }
                } catch (e) {
                    // Table might not exist
                }
            }
        } catch (err) {
            results.push({ db: label, error: err.message });
        } finally {
            if (conn) await conn.close();
        }
    }

    await checkDb(getConnection, "Salary");
    await checkDb(getConnection2, "Doc");

    return NextResponse.json({
        inputPath: filePath,
        decentPath,
        results
    });
}
