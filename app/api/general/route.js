import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const search = searchParams.get("search");

  let connection;

  try {
    connection = await getConnection2();

    let query = `
      SELECT r.*, a.ANSERED_DESC 
      FROM RECIP_GEHA_NEW r
      JOIN ANSERED_TYPE a ON r.ANSERED = a.ANSERED_C
      WHERE a.ANSERED_DESC = 'جارى الرد'
    `;

    const binds = {};

    // فلترة التاريخ - لو مفيش تاريخ يبعت تاريخ اليوم
    if (fromDate && toDate) {
      query += ` AND r.DOC_DATE BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD') AND TO_DATE(:toDate, 'YYYY-MM-DD')`;
      binds.fromDate = fromDate;
      binds.toDate = toDate;
    } else {
      query += ` AND TRUNC(r.DOC_DATE) = TRUNC(SYSDATE)`;
    }

    // البحث بالاسم أو الرقم
    if (search) {
      query += ` AND (r.SUBJECT LIKE :search OR r.DOC_NO LIKE :search)`;
      binds.search = `%${search}%`;
    }

    query += ` ORDER BY r.DOC_DATE DESC`;

    const result = await connection.execute(query, binds);

    const columns = result.metaData.map(c => c.name);

    const rows = result.rows.map(row => {
      const obj = {};
      row.forEach((val, idx) => {
        obj[columns[idx]] = val;
      });
      return obj;
    });

    return NextResponse.json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (err) {
    console.error("Database API Error:", err);
    return NextResponse.json(
      { success: false, error: "Database error" },
      { status: 500 }
    );
  } finally {
    if (connection) await connection.close();
  }
}

export const dynamic = "force-dynamic";
