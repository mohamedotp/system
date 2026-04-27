import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function GET(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }

    let connection;
    try {
        const currentEmpNum = session.empNum;
        connection = await getConnection2();

        // جلب المكاتبات التي ليس لها سجلات في RECIP_GEHA_NEW (أي لم يتم إرسالها)
        // ومصنفة أنها من هذا الموظف
        const result = await connection.execute(
            `SELECT d.DOC_NO, d.SUBJECT, d.DOC_DATE, d.FILE_NAME, d.DOC_TYPE, k.DOC_DESC_A
             FROM DOC_DATA_NEW d
             LEFT JOIN DOC_KIND k ON d.DOC_TYPE = k.DOC_KIND
             WHERE (LTRIM(d.PLACE_C, '0') = LTRIM(:currentEmpNum, '0') OR LTRIM(d.EMP_NO, '0') = LTRIM(:currentEmpNum, '0'))
             AND d.SUBJECT IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM RECIP_GEHA_NEW r WHERE r.DOC_NO = d.DOC_NO)
             ORDER BY d.DOC_DATE DESC`,
            { currentEmpNum: currentEmpNum.toString() }
        );

        const drafts = result.rows.map(row => ({
            docNo: row[0],
            subject: row[1],
            date: row[2],
            fileName: row[3],
            docType: row[4],
            docTypeDesc: row[5]
        }));

        return NextResponse.json({ success: true, drafts });

    } catch (err) {
        console.error("Drafts API Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export async function DELETE(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }

    let connection;
    try {
        const { docNo } = await req.json();
        if (!docNo) {
            return NextResponse.json({ success: false, error: "رقم المكاتبة مطلوب" }, { status: 400 });
        }

        const currentEmpNum = session.empNum;
        connection = await getConnection2();

        // فحص ما إذا كانت المكاتبة ملك للمستخدم ولم يتم أرشفتها بعد
        const checkRes = await connection.execute(
            `SELECT DOC_NO FROM DOC_DATA_NEW 
             WHERE DOC_NO = :docNo 
             AND (LTRIM(PLACE_C, '0') = LTRIM(:currentEmpNum, '0') OR LTRIM(EMP_NO, '0') = LTRIM(:currentEmpNum, '0'))
             AND NOT EXISTS (SELECT 1 FROM RECIP_GEHA_NEW r WHERE r.DOC_NO = :docNo)`,
            { docNo, currentEmpNum: currentEmpNum.toString() }
        );

        if (checkRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: "لا يمكن حذف هذه المكاتبة أو أنها مؤرشفة بالفعل" }, { status: 403 });
        }

        // حذف المرفقات المرتبطة (إن وجدت)
        await connection.execute(
            `DELETE FROM ATTACHMENTS WHERE DOC_NO = :docNo`,
            { docNo }
        );

        // حذف المكاتبة
        await connection.execute(
            `DELETE FROM DOC_DATA_NEW WHERE DOC_NO = :docNo`,
            { docNo },
            { autoCommit: true }
        );

        return NextResponse.json({ success: true, message: "تم حذف المسودة بنجاح" });

    } catch (err) {
        console.error("Delete Draft API Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export const dynamic = "force-dynamic";
