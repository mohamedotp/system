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

    let pnftRows = [];
    let queryUsed = "";

    // المحاولة 1: استعلام مباشر برقم الموظف p_emp_num مع أحدث تاريخ لـ PNF_NUMBER = 1 من جدول pnft فقط
    try {
      const sqlWithEmp = `
        SELECT * FROM pnft 
        WHERE p_emp_num = :empNum 
          AND up_date = (SELECT MAX(up_date) FROM pnft WHERE PNF_NUMBER = 1)
      `;
      const resWithEmp = await connection.execute(sqlWithEmp, [requestedEmpNum]);
      if (resWithEmp.rows && resWithEmp.rows.length > 0) {
        const cols = resWithEmp.metaData.map((c) => c.name.toUpperCase());
        pnftRows = resWithEmp.rows.map((row) => {
          const obj = {};
          row.forEach((val, idx) => {
            obj[cols[idx]] = val;
          });
          return obj;
        });
        queryUsed = "p_emp_num_with_max_update";
      }
    } catch (errWithEmp) {
      console.warn("Incentives query attempt 1 warning:", errWithEmp.message);
    }

    // المحاولة 2: إذا لم يتم العثور على سجل بالشرط السابق، جلب أحدث سجل مسجل لهذا الموظف تحديداً
    if (pnftRows.length === 0) {
      try {
        const sqlLatestEmp = `
          SELECT * FROM (
            SELECT * FROM pnft 
            WHERE p_emp_num = :empNum 
            ORDER BY up_date DESC
          ) WHERE ROWNUM = 1
        `;
        const resLatest = await connection.execute(sqlLatestEmp, [requestedEmpNum]);
        if (resLatest.rows && resLatest.rows.length > 0) {
          const cols = resLatest.metaData.map((c) => c.name.toUpperCase());
          pnftRows = resLatest.rows.map((row) => {
            const obj = {};
            row.forEach((val, idx) => {
              obj[cols[idx]] = val;
            });
            return obj;
          });
          queryUsed = "p_emp_num_latest";
        }
      } catch (errLatest) {
        console.warn("Incentives query attempt 2 warning:", errLatest.message);
      }
    }

    // في حال عدم وجود أي سجل لهذا الموظف في جدول pnft
    if (pnftRows.length === 0) {
      return NextResponse.json({
        success: true,
        found: false,
        employee: {
          empNum: String(requestedEmpNum),
          empName: session.empName || `موظف ${requestedEmpNum}`,
          sectorName: "-",
          empDeg: "-"
        },
        message: "لم يتم العثور على سجلات حوافز مسجلة لحسابك في آخر تحديث",
        data: null
      });
    }

    const rawData = pnftRows[0];

    // جلب بيانات الموظف من جدول pnft فقط دون الرجوع لأي جدول آخر
    const empName = rawData.P_EMP_NAME || rawData.EMP_NAME || rawData.P_NAME || rawData.NAME || session.empName || `موظف ${requestedEmpNum}`;
    const sectorName = rawData.SEC_N || rawData.SECTOR_NAME || rawData.P_SEC_N || "-";
    const empDeg = rawData.EMP_DEG || rawData.P_DEG || "-";

    const employeeInfo = {
      empNum: String(rawData.P_EMP_NUM || requestedEmpNum),
      empName,
      sectorName,
      empDeg
    };

    // 1. إجمالي الحافز
    const gft = Number(rawData.GFT ?? rawData.P_GFT ?? 0);

    // 2. الضريبة
    const pTaxe = Number(rawData.P_TAXE ?? rawData.TAXE ?? rawData.G_TAXE ?? 0);

    // 3. المعاشات / التأمينات
    // عمود التأمينات المتغيرة في جدول pnft هو P_PRS_VAR_INS
    const pPrsVarIns = Number(rawData.P_PRS_VAR_INS ?? 0);
    const pPrsBasIns = Number(rawData.P_PRS_BAS_INS ?? rawData.G_PRS_BAS_INS ?? 0);
    const pPrsEndPnft = Number(rawData.P_PRS_END_PNFT ?? rawData.G_PRS_END_PNFT ?? 0);
    const gPrsVarIns = Number(rawData.G_PRS_VAR_INS ?? 0);
    const rawPensions = Number(rawData.PENSIONS ?? rawData.P_INS ?? rawData.TOT_INS ?? 0);

    // إجمالي المعاشات: يشمل التأمينات المتغيرة P_PRS_VAR_INS والأساسية ومكافأة نهاية الخدمة إن وجدت
    const pensionsSum = pPrsVarIns + pPrsBasIns + pPrsEndPnft + gPrsVarIns;
    const pensions = rawPensions > 0 ? rawPensions : pensionsSum;

    // 4. الصافي
    const dbNet = (rawData.NET !== undefined && rawData.NET !== null) ? Number(rawData.NET) : null;
    const calculatedNet = gft - (pensions + pTaxe);
    const net = dbNet !== null ? dbNet : calculatedNet;

    // 5. إجمالي الاستقطاعات
    const totalDeductions = pensions + pTaxe;

    return NextResponse.json({
      success: true,
      found: true,
      employee: employeeInfo,
      queryUsed,
      data: {
        gft, // قيمة الحافز
        pensions, // إجمالي المعاشات
        pPrsVarIns, // حصة العامل في التأمينات المتغيرة
        gPrsBasIns: pPrsBasIns, // حصة المعاش الأساسي
        gPrsEndPnft: pPrsEndPnft, // مكافأة نهاية الخدمة 1%
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
      error: `خطأ في استعلام الحوافز: ${err.message}`
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
