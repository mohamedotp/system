import { NextResponse } from "next/server";
import { getConnection } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function GET(req) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const empNum = searchParams.get("empNum");

  if (empNum !== session.empNum) {
    return NextResponse.json({ success: false, error: "Forbidden: You can only view your own data" }, { status: 403 });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT 
    m.emp_num,
    m.emp_name,
    g.*,
    es.empstat_n AS status_name,
    s.sec_n AS sector_name,

    -- الخصومات الخاصة بالموظف
    (
        SELECT NVL(SUM(d1.ded_val),0)
        FROM deddata d1
        WHERE d1.last_flag = 1
        AND d1.ded_cod between 139 and 149
          AND d1.d_emp_num = m.emp_num
    ) AS club_subscription,

    -- إجمالي الخصومات الثابتة للموظف
    (
        SELECT NVL(SUM(d2.ded_val),0)
        FROM deddata d2
        WHERE d2.last_flag = 1
          AND d2.d_emp_num = m.emp_num
    ) AS fixed_deductions,

    dc.ded_n AS deduction_name,
    d.ded_cod,
    d.ded_val  AS deduction_value,
    d.ded_org  AS deduction_organization,
    d.ded_stay AS deduction_stay

FROM main_mast m

LEFT JOIN general g 
    ON m.emp_num = g.emp_num
   AND g.last_flag = 1

LEFT JOIN deddata d
    ON d.d_emp_num = m.emp_num
   AND d.last_flag = 1
   
LEFT JOIN sector s 
    ON s.sec_no = g.nmber

LEFT JOIN empstat es
    ON es.empstat_c = g.status_c

LEFT JOIN deduction dc 
    ON dc.ded_c = d.ded_cod

WHERE m.emp_num = :emp_num

ORDER BY 
    s.sec_n,
    d.ded_cod`
      ,
      [empNum]
    );

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
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    if (connection) await connection.close();
  }
}

export const dynamic = "force-dynamic";
