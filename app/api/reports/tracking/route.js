import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function GET(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const docNo = searchParams.get("docNo");

    if (!docNo) {
        return NextResponse.json({ success: false, error: "رقم المكاتبة مطلوب" }, { status: 400 });
    }

    let connection;
    try {
        connection = await getConnection2();

        // 1. جلب الـ MAIN_DOC للمكاتبة المطلوبة لضمان الحصول على السلسلة كاملة
        const pivotRes = await connection.execute(
            `SELECT MAIN_DOC, SUBJECT FROM DOC_DATA_NEW WHERE DOC_NO = :docNo AND ROWNUM = 1`,
            { docNo }
        );

        if (pivotRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: "المكاتبة غير موجودة" }, { status: 404 });
        }

        const mainDocId = pivotRes.rows[0][0] || docNo; // لو مفيش MAIN_DOC يبقى هي نفسها الـ root

        // 2. جلب كافة المكاتبات التي تنتمي لهذا الأصل (السلسلة الكاملة)
        // نربط DOC_DATA_NEW مع RECIP_GEHA_NEW لجلب كافة أطراف العملية
        const query = `
            SELECT d.DOC_NO, d.MAIN_DOC_NO, d.MAIN_DOC, d.SUBJECT, NVL(d.TRANS_TYPE, 1) as TRANS_TYPE,
                   TO_CHAR(d.DOC_DATE, 'YYYY-MM-DD HH24:MI') as DOC_DATE_STR,
                   r.PLACE_C as SENDER_ID, ep.EMP_NAME as SENDER_NAME, ep.SEC_N as SENDER_SEC,
                   r.GEHA_C as RECEIVER_ID, eg.EMP_NAME as RECEIVER_NAME, eg.SEC_N as RECEIVER_SEC,
                   TO_CHAR(r.SEND_DATE, 'YYYY-MM-DD HH24:MI') as SEND_DATE_STR_SHORT,
                   TO_CHAR(r.SEND_DATE, 'YYYY-MM-DD HH24:MI:SS') as SEND_DATE_STR,
                   r.SEEN_FLAG,
                   TO_CHAR(r.SEEN_DATE, 'YYYY-MM-DD HH24:MI') as SEEN_DATE_STR,
                   st.SITUATION_DESC,
                   d.FILE_NAME,
                   a.ANSERED_DESC
            FROM DOC_DATA_NEW d
            LEFT JOIN RECIP_GEHA_NEW r ON d.DOC_NO = r.DOC_NO
            LEFT JOIN EMP_DOC ep ON r.PLACE_C = ep.EMP_NUM
            LEFT JOIN EMP_DOC eg ON r.GEHA_C = eg.EMP_NUM
            LEFT JOIN SITUATION_TYPE st ON r.SITUATION = st.SITUATION_C
            LEFT JOIN ANSERED_TYPE a ON r.ANSERED = a.ANSERED_C
            WHERE d.MAIN_DOC = :mainDocId OR d.DOC_NO = :mainDocId
            ORDER BY d.DOC_DATE ASC, r.SEND_DATE ASC
        `;

        const result = await connection.execute(query, { mainDocId });
        const columns = result.metaData.map(col => col.name);
        const rawRows = result.rows.map(row => {
            const obj = {};
            row.forEach((val, idx) => { obj[columns[idx]] = val; });
            return obj;
        });

        // 3. جلب المرفقات لهذه المكاتبات لتحقيق رؤية المستخدم (كل شخص يرى مرفقاته فقط)
        if (rawRows.length > 0) {
            const docNos = [...new Set(rawRows.map(r => r.DOC_NO))];
            const CHUNK_SIZE = 1000;
            let allAttachments = [];

            for (let i = 0; i < docNos.length; i += CHUNK_SIZE) {
                const chunk = docNos.slice(i, i + CHUNK_SIZE);
                const placeholders = chunk.map((_, idx) => `:d${idx}`).join(',');
                const attBinds = {};
                chunk.forEach((d, idx) => attBinds[`d${idx}`] = d);

                const attQuery = `
                    SELECT DOC_NO, FILE_PATH, FILE_DESC, ATTACH_TYPE, PLACE_C,
                           TO_CHAR(DOC_DATE, 'YYYY-MM-DD HH24:MI:SS') as ATTACH_DATE
                    FROM ATTACHMENTS
                    WHERE DOC_NO IN (${placeholders})
                    ORDER BY DOC_DATE DESC
                `;

                const attResult = await connection.execute(attQuery, attBinds);
                allAttachments.push(...attResult.rows.map(r => ({
                    DOC_NO: r[0],
                    FILE_PATH: r[1],
                    FILE_DESC: r[2],
                    ATTACH_TYPE: r[3],
                    PLACE_C: r[4],
                    ATTACH_DATE: r[5]
                })));
            }

            rawRows.forEach(row => {
                row.ATTACHMENTS_LIST = allAttachments.filter(a =>
                    a.DOC_NO === row.DOC_NO &&
                    (!row.SEND_DATE_STR || a.ATTACH_DATE <= row.SEND_DATE_STR)
                );
            });
        }

        // سنرسل البيانات كما هي (كل عملية تحويل/إرسال مستقلة) لتبني الشجرة في الفرونت إند
        // مع التأكد من وجود بيانات المكاتبة حتى لو لم يكن لها مستلمون (حالة مسودة مثلاً - رغم أن التتبع يظهر المحول)
        return NextResponse.json({
            success: true,
            mainDoc: mainDocId,
            history: rawRows
        });

    } catch (err) {
        console.error("Tracking Report API Error:", err);
        return NextResponse.json({ success: false, error: "Database error: " + err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export const dynamic = "force-dynamic";
