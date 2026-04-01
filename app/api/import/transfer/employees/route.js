import { NextResponse } from "next/server";
import { getConnection } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function GET(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }

    let connection;
    try {
        connection = await getConnection();

        const query = `
      SELECT emp_num, emp_name, sec_no, sec_n, MIN(nmber_doc) as nmber_doc
      FROM (
          /* الموظفين العاديين (سجل نشط) */
          SELECT m.emp_num, m.emp_name, mas.nmber as sec_no, s.sec_n, mas.nmber_doc
          FROM salary.main_mast m
          JOIN salary.MASTER mas ON m.emp_num = mas.emp_num AND mas.last_flag = 1
          LEFT JOIN salary.sector s ON mas.nmber = s.sec_no
          
          UNION ALL
          
          /* المجموعات الخاصة أو الموظفين بأكواد محددة حتى لو سجلاتهم غير نمطية (أمن البوابة مثلاً) */
          SELECT m.emp_num, m.emp_name, mas.nmber as sec_no, s.sec_n, 3 as nmber_doc
          FROM salary.main_mast m
          JOIN salary.MASTER mas ON m.emp_num = mas.emp_num 
            AND mas.up_date = (SELECT DISTINCT MAX (up_date) FROM salary.MASTER e WHERE e.emp_num = m.emp_num)
          LEFT JOIN salary.sector s ON mas.nmber = s.sec_no
          WHERE m.emp_num IN (5000, 1734, 153, 260, 5051, 5033, 5035, 3780, 5006, 5020, 1726, 370, 654, 394, 146, 169, 3782, 50009, 9020)
      )
      GROUP BY emp_num, emp_name, sec_no, sec_n
      ORDER BY nmber_doc, emp_num
    `;

        const session = await getSession();
        const currentEmpNum = session?.empNum;

        const result = await connection.execute(query);
        const columns = result.metaData.map(c => c.name);
        const rows = result.rows
            .map(row => {
                const obj = {};
                row.forEach((val, idx) => {
                    obj[columns[idx]] = val;
                });
                return obj;
            })
            // تصفية الشخص المرسل (نفسه)
            .filter(emp => emp.EMP_NUM !== currentEmpNum);

        return NextResponse.json({
            success: true,
            data: rows
        });

    } catch (err) {
        console.error("Transfer Employees API Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export const dynamic = "force-dynamic";
