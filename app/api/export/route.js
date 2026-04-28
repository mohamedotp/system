import { NextResponse } from "next/server";
import { getConnection, getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function GET(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: "غير مصرح بالوصول" },
            { status: 401 }
        );
    }

    const { searchParams } = new URL(req.url);

    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const search = searchParams.get("search");
    const docCategory = searchParams.get("docCategory");
    const status = searchParams.get("status");
    const allPending = searchParams.get("allPending") === "true";

    const empNum = session.empNum;
    let connection;

    try {
        connection = await getConnection2();

        // ==========================================
        // نتحقق أولاً هل مستخدم المكاتبات عنده
        // صلاحية الوصول لـ SALARY.SYSTEM_NOTIFICATIONS
        // ==========================================
        let hasSalaryAccess = false;
        try {
            await connection.execute(
                `SELECT 1 FROM SALARY.SYSTEM_NOTIFICATIONS WHERE ROWNUM = 1`,
                {},
                { maxRows: 1 }
            );
            hasSalaryAccess = true;
        } catch (accessErr) {
            console.warn("⚠️ No access to SALARY.SYSTEM_NOTIFICATIONS from doc user. Notifications will be skipped in export query.");
            hasSalaryAccess = false;
        }

        // ==========================================
        // بناء الـ Query بناءً على الصلاحية
        // ==========================================
        const notifsSentSubquery = hasSalaryAccess
            ? `MAX((SELECT SUBSTR(LISTAGG(
                        e_notif_r.EMP_NAME || ' (' || TO_CHAR(n_sent.CREATED_AT, 'DD/MM HH24:MI') || ') : ' || n_sent.MESSAGE, 
                        ' | '
                    ) WITHIN GROUP (ORDER BY n_sent.CREATED_AT DESC), 1, 3900)
                    FROM SALARY.SYSTEM_NOTIFICATIONS n_sent
                    JOIN EMP_DOC e_notif_r ON n_sent.RECEIVER_ID = e_notif_r.EMP_NUM
                    WHERE n_sent.DOC_NO = r.DOC_NO 
                    AND n_sent.SENDER_ID = :empNum)) as NOTIFS_SENT_STR`
            : `NULL as NOTIFS_SENT_STR`;

        const notifsReceivedSubquery = hasSalaryAccess
            ? `MAX((SELECT SUBSTR(LISTAGG(
                        e_notif_s.EMP_NAME || ' (' || TO_CHAR(n_rec.CREATED_AT, 'DD/MM HH24:MI') || ') : ' || n_rec.MESSAGE, 
                        ' | '
                    ) WITHIN GROUP (ORDER BY n_rec.CREATED_AT DESC), 1, 3900)
                    FROM SALARY.SYSTEM_NOTIFICATIONS n_rec
                    JOIN EMP_DOC e_notif_s ON n_rec.SENDER_ID = e_notif_s.EMP_NUM
                    WHERE n_rec.DOC_NO = r.DOC_NO 
                    AND n_rec.RECEIVER_ID = :empNum)) as NOTIFS_RECEIVED_STR`
            : `NULL as NOTIFS_RECEIVED_STR`;

        let query = `
            SELECT r.DOC_NO, 
                   MAX(r.DOC_DATE) as DOC_DATE,
                   TO_CHAR(MAX(r.DOC_DATE), 'YYYY-MM-DD HH24:MI') as DOC_DATE_STR,
                   MAX(d.SUBJECT) as SUBJECT,
                   LISTAGG(eg.EMP_NAME, ' | ' ON OVERFLOW TRUNCATE) WITHIN GROUP (ORDER BY eg.EMP_NAME) as GEHA_NAME,
                   LISTAGG(eg.SEC_N, ' | ' ON OVERFLOW TRUNCATE) WITHIN GROUP (ORDER BY eg.EMP_NAME) as GEHA_SEC,
                   LISTAGG(NVL(r.SEEN_FLAG, 0), ' | ' ON OVERFLOW TRUNCATE) WITHIN GROUP (ORDER BY eg.EMP_NAME) as GEHA_SEEN_FLAGS,
                   LISTAGG(NVL(TO_CHAR(r.SEEN_DATE, 'YYYY-MM-DD HH24:MI'), 'N/A'), ' | ' ON OVERFLOW TRUNCATE) WITHIN GROUP (ORDER BY eg.EMP_NAME) as GEHA_SEEN_DATES,
                   MAX(a.ANSERED_DESC) as ANSERED_DESC,
                   MAX(st.SITUATION_DESC) as SITUATION_DESC,
                   MAX(dk.DOC_DESC_A) as DOC_DESC_A,
                   MAX(d.FILE_ATTACH) as FILE_ATTACH,
                   MAX(d.FLAG) as FLAG,
                   MAX(r.ANSERED) as ANSERED,
                   MAX(d.FILE_NAME) as FILE_NAME,
                   MAX(d.DOC_TYPE) as DOC_TYPE,
                   MAX(d.TRANS_TYPE) as TRANS_TYPE,
                   MAX(r.GEHA_C) as GEHA_C,
                   MAX(r.SEEN_FLAG) as SEEN_FLAG,
                   TO_CHAR(MAX(r.SEEN_DATE), 'YYYY-MM-DD HH24:MI') as SEEN_DATE_STR,
                   TO_CHAR(MAX(r.SEND_DATE), 'YYYY-MM-DD HH24:MI:SS') as SEND_DATE_STR,
                   MAX(NVL(d.MAIN_DOC, d.DOC_NO)) as NODE_ID,
                   ${notifsSentSubquery},
                   ${notifsReceivedSubquery}
            FROM RECIP_GEHA_NEW r
            LEFT JOIN DOC_DATA_NEW d ON r.DOC_NO = d.DOC_NO
            LEFT JOIN ANSERED_TYPE a ON r.ANSERED = a.ANSERED_C
            LEFT JOIN DOC_KIND dk ON d.DOC_TYPE = dk.DOC_KIND
            LEFT JOIN SITUATION_TYPE st ON r.SITUATION = st.SITUATION_C
            LEFT JOIN EMP_DOC eg ON r.GEHA_C = eg.EMP_NUM
            WHERE r.PLACE_C = :empNum`;

        const binds = { empNum };

        if (!allPending) {
            if (fromDate && toDate) {
                query += `
                    AND TRUNC(r.DOC_DATE)
                    BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD')
                    AND TO_DATE(:toDate, 'YYYY-MM-DD')
                `;
                binds.fromDate = fromDate;
                binds.toDate = toDate;
            }
        }

        if (search) {
            query += `
                AND (
                    UPPER(d.SUBJECT) LIKE UPPER(:search)
                    OR r.DOC_NO LIKE :search
                    OR UPPER(r.DOC_NO) LIKE UPPER(:search)
                    OR UPPER(eg.EMP_NAME) LIKE UPPER(:search)
                )
            `;
            binds.search = `%${search}%`;
        }

        if (docCategory === "incoming") {
            query += ` AND d.DOC_TYPE = 27`;
        }

        if (docCategory === "internal") {
            query += ` AND d.DOC_TYPE <> 27`;
        }

        if (status === "answered") {
            query += ` AND r.ANSERED = 1`;
        }

        if (status === "pending") {
            query += ` AND (r.ANSERED = 0 OR r.ANSERED IS NULL OR r.ANSERED <> 1)`;
        }

        query += ` GROUP BY r.DOC_NO ORDER BY MAX(r.DOC_DATE) DESC`;

        const result = await connection.execute(query, binds, { maxRows: 50000 });

        const columns = result.metaData.map(col => col.name);

        const rows = result.rows.map(row => {
            const obj = {};
            row.forEach((val, idx) => {
                obj[columns[idx]] = val;
            });
            return obj;
        });

        // --- جلب المرفقات من الجدول الجديد لجميع المكاتبات الناتجة ---
        if (rows.length > 0) {
            const nodeIds = Array.from(new Set(rows.map(r => r.NODE_ID)));

            const CHUNK_SIZE = 1000;
            let allAttachments = [];

            for (let i = 0; i < nodeIds.length; i += CHUNK_SIZE) {
                const chunk = nodeIds.slice(i, i + CHUNK_SIZE);
                const placeholders = chunk.map((_, idx) => `:d${idx}`).join(',');
                const attBinds = {};
                chunk.forEach((d, idx) => attBinds[`d${idx}`] = d);

                const attQuery = `
                    SELECT DOC_NO, FILE_PATH, FILE_DESC, ATTACH_TYPE, PLACE_C,
                           TO_CHAR(DOC_DATE, 'YYYY-MM-DD HH24:MI:SS') as ATTACH_DATE,
                           NVL(MAIN_DOC, DOC_NO) as MAIN_DOC_NODE
                    FROM ATTACHMENTS
                    WHERE MAIN_DOC IN (${placeholders}) OR DOC_NO IN (${placeholders})
                    ORDER BY DOC_DATE DESC
                `;

                const attResult = await connection.execute(attQuery, attBinds);
                allAttachments.push(...attResult.rows.map(r => ({
                    DOC_NO: r[0],
                    FILE_PATH: r[1],
                    FILE_DESC: r[2],
                    ATTACH_TYPE: r[3],
                    PLACE_C: r[4],
                    ATTACH_DATE: r[5],
                    MAIN_DOC_NODE: r[6]
                })));
            }

            rows.forEach(row => {
                const seenPaths = new Set();
                row.ATTACHMENTS_LIST = allAttachments
                    .filter(a => a.MAIN_DOC_NODE === row.NODE_ID)
                    .filter(a => {
                        if (seenPaths.has(a.FILE_PATH)) return false;
                        seenPaths.add(a.FILE_PATH);
                        return true;
                    });
            });
        }

        return NextResponse.json({
            success: true,
            count: rows.length,
            data: rows
        });

    } catch (err) {
        console.error("Outbox API Error:", err);
        return NextResponse.json(
            { success: false, error: err.message || "Database error" },
            { status: 500 }
        );
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

export const dynamic = "force-dynamic";
