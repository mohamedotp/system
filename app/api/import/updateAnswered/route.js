import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function POST(req) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
  }

  const { docNo, status } = await req.json(); // رقم المكاتبة والحالة الاختيارية
  const empNum = session.empNum;

  if (!docNo) {
    return NextResponse.json({ success: false, error: "رقم المكاتبة مطلوب" }, { status: 400 });
  }

  // الحالة الافتراضية هي 1 (تم الرد) إلا لو اتبعتت قيمة تانية (زي 0 لإلغاء الرد)
  const targetStatus = status !== undefined ? status : 1;

  let connection;
  try {
    connection = await getConnection2();

    // تحديث الحالة وتاريخ المشاهدة في جدول المستلمين
    await connection.execute(
      `UPDATE RECIP_GEHA_NEW SET ANSERED = :targetStatus, SEEN_DATE = SYSDATE, SEEN_FLAG = 1 
       WHERE DOC_NO = :docNo AND GEHA_C = :empNum`,
      { docNo, empNum, targetStatus },
      { autoCommit: false }
    );

    // تم إلغاء تحديث TRANS_TYPE بناءً على طلب المستخدم للحفاظ على نوع المكاتبة الأصلي

    await connection.commit();

    return NextResponse.json({ success: true, message: "تم تحديث الحالة بنجاح" });
  } catch (err) {
    console.error("Update ANSERED Error:", err);
    return NextResponse.json({ success: false, error: "حدث خطأ أثناء تحديث البيانات" }, { status: 500 });
  } finally {
    if (connection) await connection.close();
  }
}

export const dynamic = "force-dynamic";
