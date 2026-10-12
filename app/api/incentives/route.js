import { NextResponse } from "next/server";
import { getConnection } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function GET(req) {
  const session = await getSession();

  if (!session || !session.empNum) {
    return NextResponse.json({ success: false, error: "غير مصرح - يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requestedEmpNum = searchParams.get("empNum") || session.empNum;

  // الحماية: كل موظف يرى بياناته فقط
  if (requestedEmpNum !== session.empNum) {
    return NextResponse.json(
      { success: false, error: "غير مصرح: يمكنك فقط الاطلاع على بياناتك الخاصة" },
      { status: 403 }
    );
  }

  let connection;
  try {
    connection = await getConnection();

    // 1. جلب بيانات الموظف الأساسية من main_mast
    let employeeInfo = {
      empNum: requestedEmpNum,
      empName: session.empName || `موظف ${requestedEmpNum}`,
      sectorName: "-",
      empDeg: "-"
    };

    try {
      const empRes = await connection.execute(
        `SELECT 
          m.emp_num,
          m.emp_name,
          s.sec_n AS sector_name,
          g.emp_deg
        FROM main_mast m
        LEFT JOIN (
          SELECT emp_num, nmber, emp_deg FROM (
            SELECT emp_num, nmber, emp_deg, ROW_NUMBER() OVER (PARTITION BY emp_num ORDER BY up_date DESC) AS rn 
            FROM general WHERE flag = 1
          ) WHERE rn = 1
        ) g ON m.emp_num = g.emp_num
        LEFT JOIN sector s ON s.sec_no = g.nmber
        WHERE m.emp_num = :empNum`,
        [requestedEmpNum]
      );

      if (empRes.rows && empRes.rows.length > 0) {
        const [empNum, empName, sectorName, empDeg] = empRes.rows[0];
        employeeInfo = {
          empNum: String(empNum || requestedEmpNum),
          empName: empName || employeeInfo.empName,
          sectorName: sectorName || "-",
          empDeg: empDeg || "-"
        };
      }
    } catch (empErr) {
      console.warn("Could not fetch extra emp info:", empErr.message);
    }

    // 2. استعلام الحوافز من جدول pnft
    // الاستعلام الأساسي المطلوب:
    // select gft, g_prs_bas_ins+g_prs_end_pnft, p_taxe, net from pnft where up_date=(select max(up_date) from pnft where PNF_NUMBER=1)
    let pnftRows = [];
    let queryUsed = "";

    // المحاولة 1: استعلام مرتبط برقم الموظف لضمان الخصوصية إن وجد عمود emp_num في جدول pnft
    try {
      const sqlWithEmp = `
        SELECT 
          NVL(gft, 0) AS gft,
          (NVL(g_prs_bas_ins, 0) + NVL(g_prs_end_pnft, 0)) AS pensions,
          NVL(g_prs_bas_ins, 0) AS g_prs_bas_ins,
          NVL(g_prs_end_pnft, 0) AS g_prs_end_pnft,
          NVL(p_taxe, 0) AS p_taxe,
          NVL(net, 0) AS net,
          up_date,
          pnf_number
        FROM pnft 
        WHERE emp_num = :empNum 
          AND up_date = (SELECT MAX(up_date) FROM pnft WHERE PNF_NUMBER = 1)
      `;
      const resWithEmp = await connection.execute(sqlWithEmp, [requestedEmpNum]);
      if (resWithEmp.rows && resWithEmp.rows.length > 0) {
        const cols = resWithEmp.metaData.map(c => c.name.toUpperCase());
        pnftRows = resWithEmp.rows.map(row => {
          const obj = {};
          row.forEach((val, idx) => { obj[cols[idx]] = val; });
          return obj;
        });
        queryUsed = "with_emp_filter";
      }
    } catch (empQueryErr) {
      console.log("Query with emp_num condition bypassed or column absent:", empQueryErr.message);
    }

    // المحاولة 2: إذا لم يتم العثور على صفوف مع كود الموظف، ننفذ الاستعلام المباشر كما تم إرساله تماماً
    if (pnftRows.length === 0) {
      const sqlDirect = `
        SELECT 
          NVL(gft, 0) AS gft,
          (NVL(g_prs_bas_ins, 0) + NVL(g_prs_end_pnft, 0)) AS pensions,
          NVL(g_prs_bas_ins, 0) AS g_prs_bas_ins,
          NVL(g_prs_end_pnft, 0) AS g_prs_end_pnft,
          NVL(p_taxe, 0) AS p_taxe,
          NVL(net, 0) AS net,
          up_date,
          pnf_number
        FROM pnft 
        WHERE up_date = (SELECT MAX(up_date) FROM pnft WHERE PNF_NUMBER = 1)
      `;
      const resDirect = await connection.execute(sqlDirect);
      if (resDirect.rows && resDirect.rows.length > 0) {
        const cols = resDirect.metaData.map(c => c.name.toUpperCase());
        pnftRows = resDirect.rows.map(row => {
          const obj = {};
          row.forEach((val, idx) => { obj[cols[idx]] = val; });
          return obj;
        });
        queryUsed = "direct_query";
      }
    }

    if (pnftRows.length === 0) {
      return NextResponse.json({
        success: true,
        found: false,
        employee: employeeInfo,
        message: "لم يتم العثور على سجلات حوافز مسجلة للشهر الأخير",
        data: null
      });
    }

    const rawData = pnftRows[0];
    const gft = Number(rawData.GFT || 0);
    const pensions = Number(rawData.PENSIONS || (Number(rawData.G_PRS_BAS_INS || 0) + Number(rawData.G_PRS_END_PNFT || 0)));
    const gPrsBasIns = Number(rawData.G_PRS_BAS_INS || 0);
    const gPrsEndPnft = Number(rawData.G_PRS_END_PNFT || 0);
    const pTaxe = Number(rawData.P_TAXE || 0);
    const net = Number(rawData.NET || (gft - (pensions + pTaxe)));
    const totalDeductions = pensions + pTaxe;

    return NextResponse.json({
      success: true,
      found: true,
      employee: employeeInfo,
      queryUsed,
      data: {
        gft, // قيمة الحافز
        pensions, // المعاشات
        gPrsBasIns, // حصة المعاش الأساسي
        gPrsEndPnft, // مكافأة نهاية الخدمة 1%
        pTaxe, // الضريبة
        net, // صافي الحافز
        totalDeductions, // إجمالي الاستقطاعات
        upDate: rawData.UP_DATE || null,
        pnfNumber: rawData.PNF_NUMBER || 1
      }
    });

  } catch (err) {
    console.error("Incentives API Error:", err);
    return NextResponse.json({
      success: false,
      error: `خطأ في قاعدة البيانات: ${err.message}`
    }, { status: 500 });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error("Error closing connection:", e);
      }
    }
  }
}

export const dynamic = "force-dynamic";
