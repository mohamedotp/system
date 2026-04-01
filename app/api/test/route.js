import { NextResponse } from "next/server";
import { getConnection } from "@/lib/oracle";


export async function GET() {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute("SELECT * FROM PRICES_TAB");

    return NextResponse.json({
      success: true,
      data: result.rows[0][0],
      message: "Connection successful"
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    if (connection) await connection.close();
  }
}
