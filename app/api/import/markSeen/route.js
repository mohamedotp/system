import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function POST(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }

    try {
        const { docNo } = await req.json();
        const empNum = session.empNum;

        if (!docNo) {
            return NextResponse.json({ success: false, error: "رقم المكاتبة مطلوب" }, { status: 400 });
        }

        const connection = await getConnection2();
        try {
            // تحديث حالة القراءة للمستلم الحالي فقط
            // نقوم بالتحديث فقط إذا لم تكن المكاتبة قد قرئت بالفعل (اختياري، لكن أفضل للأداء والارشفة)
            await connection.execute(
                `UPDATE RECIP_GEHA_NEW SET SEEN_FLAG = 1, SEEN_DATE = SYSDATE 
         WHERE DOC_NO = :docNo AND GEHA_C = :empNum AND (SEEN_FLAG = 0 OR SEEN_FLAG IS NULL)`,
                { docNo, empNum },
                { autoCommit: true }
            );

            return NextResponse.json({ success: true, message: "تم تحديث حالة القراءة" });
        } finally {
            await connection.close();
        }
    } catch (err) {
        console.error("Mark Seen Error:", err);
        return NextResponse.json({ success: false, error: "حدث خطأ أثناء تحديث حالة القراءة" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
