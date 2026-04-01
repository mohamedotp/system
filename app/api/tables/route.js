import { NextResponse } from "next/server";
import { getConnection } from "@/lib/oracle";

export async function GET() {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            `SELECT emp_num,emp_name , from main_mast join general on main_mast.emp_num = emp_mas.emp_num`
        );
        // map the result to json
        const tables = result.rows.map(row => ({
            emp_num: row[0],
            emp_name: row[1]

        }));
        return NextResponse.json({
            success: true,
            count: result.rows.length,
            tables: tables
        });

    } catch (err) {
        console.error("Database API Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Connection close error:", err);
            }
        }
    }
}

export const dynamic = 'force-dynamic';
