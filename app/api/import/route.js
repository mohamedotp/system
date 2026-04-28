import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
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
    const isExact = searchParams.get("isExact") === "true"; // هل البحث دقيق؟
    const docCategory = searchParams.get("docCategory");
    const status = searchParams.get("status");
    const allPending = searchParams.get("allPending") === "true";

    const empNum = session.empNum;
    let connection;

    try {
        console.log("🚀 Import API: Fetching for user:", empNum);

        connection = await getConnection2();
        console.log("✅ Import API: Database connection successful");

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
            console.warn("⚠️ No access to SALARY.SYSTEM_NOTIFICATIONS from doc user. Notifications will be skipped in import query.");
            hasSalaryAccess = false;
        }

        // ==========================================
        // بناء الـ Query بناءً على الصلاحية
        // ==========================================
        const notifsSentSubquery = hasSalaryAccess
            ? `(SELECT XMLAGG(XMLELEMENT(E, e_notif_r.EMP_NAME || ' (' || TO_CHAR(n_sent.CREATED_AT, 'DD/MM HH24:MI') || ') : ' || n_sent.MESSAGE || ' | ') ORDER BY n_sent.CREATED_AT DESC).GETCLOBVAL()
                    FROM SALARY.SYSTEM_NOTIFICATIONS n_sent
                    JOIN EMP_DOC e_notif_r ON n_sent.RECEIVER_ID = e_notif_r.EMP_NUM
                    WHERE n_sent.DOC_NO = r.DOC_NO 
                    AND n_sent.SENDER_ID = :empNum
                    AND NVL(n_sent.IS_MANUAL, 0) = 1) as NOTIFS_SENT_STR`
            : `NULL as NOTIFS_SENT_STR`;

        const notifsReceivedSubquery = hasSalaryAccess
            ? `(SELECT XMLAGG(XMLELEMENT(E, e_notif_s.EMP_NAME || ' (' || TO_CHAR(n_rec.CREATED_AT, 'DD/MM HH24:MI') || ') : ' || n_rec.MESSAGE || ' | ') ORDER BY n_rec.CREATED_AT DESC).GETCLOBVAL()
                    FROM SALARY.SYSTEM_NOTIFICATIONS n_rec
                    JOIN EMP_DOC e_notif_s ON n_rec.SENDER_ID = e_notif_s.EMP_NUM
                    WHERE n_rec.DOC_NO = r.DOC_NO 
                    AND n_rec.RECEIVER_ID = :empNum
                    AND NVL(n_rec.IS_MANUAL, 0) = 1) as NOTIFS_RECEIVED_STR`
            : `NULL as NOTIFS_RECEIVED_STR`;

        let query = `
            SELECT r.*, 
                   r.SEEN_FLAG,
                   d.SUBJECT,
                   TO_CHAR(r.DOC_DATE, 'YYYY-MM-DD HH24:MI') as DOC_DATE_STR,
                   a.ANSERED_DESC,
                   ep.EMP_NAME as PLACE_NAME, ep.SEC_N as PLACE_SEC,
                   eg.EMP_NAME as GEHA_NAME, eg.SEC_N as GEHA_SEC,
                   TO_CHAR(r.SEND_DATE, 'YYYY-MM-DD HH24:MI:SS') as SEND_DATE_STR,
                   st.SITUATION_DESC,
                   dk.DOC_DESC_A,
                   d.FILE_NAME as FILE_NAME,
                   d.FILE_ATTACH,
                   d.DOC_TYPE,
                   d.FLAG,
                   NVL(d.DOC_STATUS, 0) as DOC_STATUS,
                   NVL(d.MAIN_DOC, d.DOC_NO) as NODE_ID,
                   
                    /* 1. الزملاء المستلمين الحاليين (اللي وصلت لهم نفس المكاتبة معايا) */
                   (SELECT XMLAGG(XMLELEMENT(E, 
                        e_other.EMP_NAME || 
                        CASE WHEN st_other.SITUATION_DESC IS NOT NULL 
                             THEN ' (' || st_other.SITUATION_DESC || ')' 
                             ELSE '' 
                        END || ' | ') ORDER BY e_other.EMP_NAME).EXTRACT('//text()').GETCLOBVAL()
                     FROM RECIP_GEHA_NEW r_other
                    JOIN EMP_DOC e_other ON r_other.GEHA_C = e_other.EMP_NUM
                    LEFT JOIN SITUATION_TYPE st_other ON r_other.SITUATION = st_other.SITUATION_C
                    WHERE r_other.DOC_NO = r.DOC_NO 
                    AND r_other.PLACE_C = r.PLACE_C
                    AND r_other.GEHA_C <> :empNum) as ALL_RECIPIENTS,
                   
                   /* 2. المحول إليهم مني (أنا اللي حولت لهم المكاتبة دي) */
                   (SELECT XMLAGG(XMLELEMENT(E, 
                        e_my.EMP_NAME || 
                        CASE WHEN st_my.SITUATION_DESC IS NOT NULL 
                             THEN ' (' || st_my.SITUATION_DESC || ')' 
                             ELSE '' 
                        END || 
                        ' - ' || TO_CHAR(r_my.DOC_DATE, 'DD/MM') || ' | ') ORDER BY r_my.DOC_DATE DESC).EXTRACT('//text()').GETCLOBVAL()
                    FROM RECIP_GEHA_NEW r_my
                    JOIN EMP_DOC e_my ON r_my.GEHA_C = e_my.EMP_NUM
                    LEFT JOIN SITUATION_TYPE st_my ON r_my.SITUATION = st_my.SITUATION_C
                    WHERE r_my.MAIN_DOC_NO = r.DOC_NO 
                    AND r_my.PLACE_C = :empNum) as MY_TRANSFERS,
                    
                   /* 3. عدد المحول إليهم مني */
                   (SELECT COUNT(*)
                    FROM RECIP_GEHA_NEW r_count
                    WHERE r_count.MAIN_DOC_NO = r.DOC_NO 
                    AND r_count.PLACE_C = :empNum) as MY_TRANSFERS_COUNT,
                    
                   /* 4. إشعارات التنبيه التي أرسلتها */
                   ${notifsSentSubquery},

                   /* 5. إشعارات التنبيه التي استلمتها */
                   ${notifsReceivedSubquery}
                   
            FROM RECIP_GEHA_NEW r
            LEFT JOIN DOC_DATA_NEW d ON r.DOC_NO = d.DOC_NO
            LEFT JOIN ANSERED_TYPE a ON r.ANSERED = a.ANSERED_C
            LEFT JOIN DOC_KIND dk ON d.DOC_TYPE = dk.DOC_KIND
            LEFT JOIN EMP_DOC ep ON r.PLACE_C = ep.EMP_NUM
            LEFT JOIN SITUATION_TYPE st ON r.SITUATION = st.SITUATION_C
            LEFT JOIN EMP_DOC eg ON r.GEHA_C = eg.EMP_NUM
            WHERE r.GEHA_C = :empNum`;

        const binds = {
            empNum
        };

        // ✅ فلترة التاريخ: (يتم تجاهلها في حال البحث الدقيق برقم المكاتبة)
        if (!isExact) {
            if (allPending) {
                // لو مختار "كل الجاري"، نجيب كل اللي مش "تم الرد" بغض النظر عن التاريخ
                query += ` AND (r.ANSERED = 0 OR r.ANSERED IS NULL OR r.ANSERED <> 1)`;
            } else {
                if (fromDate && toDate) {
                    query += `
                        AND TRUNC(r.DOC_DATE)
                        BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD')
                        AND TO_DATE(:toDate, 'YYYY-MM-DD')
                    `;
                    binds.fromDate = fromDate;
                    binds.toDate = toDate;
                } else if (!search && status !== 'pending') {
                    // لو مفيش بحث ولا تواريخ، ديفولت اليوم باستثناء المكاتبات غير المردود عليها
                    query += ` AND TRUNC(r.DOC_DATE) = TRUNC(SYSDATE)`;
                }
            }
        }

        if (search) {
            if (isExact) {
                // بحث دقيق برقم المكاتبة فقط
                query += ` AND TRIM(r.DOC_NO) = :search`;
                binds.search = search;
            } else {
                query += `
                    AND (
                        UPPER(d.SUBJECT) LIKE UPPER(:search)
                        OR r.DOC_NO LIKE :search
                        OR UPPER(r.DOC_NO) LIKE UPPER(:search)
                        OR UPPER(ep.EMP_NAME) LIKE UPPER(:search)
                    )
                `;
                binds.search = `%${search}%`;
            }
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
            // الجاري الرد عليها: هو أي حاجة مش "تم الرد" (1)
            query += ` AND (r.ANSERED = 0 OR r.ANSERED IS NULL OR r.ANSERED <> 1)`;
        }

        query += ` ORDER BY r.DOC_DATE DESC`;

        // 🚀 زيادة maxRows لجلب كل البيانات
        const result = await connection.execute(query, binds, { maxRows: 50000 });

        console.log(`📊 Import API: Found ${result.rows.length} rows`);

        const columns = result.metaData.map(col => col.name);

        const rows = result.rows.map(row => {
            const obj = {};
            row.forEach((val, idx) => {
                let processedVal = val;
                if (typeof val === 'string') {
                    // إزالة تاغات XML في حال وجودها وفك ترميز الرموز الخاصة
                    processedVal = val.replace(/<E>/g, '').replace(/<\/E>/g, '')
                                     .replace(/&amp;/g, '&')
                                     .replace(/&lt;/g, '<')
                                     .replace(/&gt;/g, '>')
                                     .replace(/&quot;/g, '"')
                                     .replace(/&apos;/g, "'")
                                     .replace(/ \| $/, '');
                }
                obj[columns[idx]] = processedVal;
            });
            return obj;
        });

        // --- جلب المرفقات من الجدول الجديد لجميع المكاتبات الناتجة ---
        if (rows.length > 0) {
            const nodeIds = Array.from(new Set(rows.map(r => r.NODE_ID)));

            // تقسيم الأرقام إلى مجموعات (مثلاً كل 1000 رقم) لتجنب تجاوز حد الـ IN clause في أوراكل
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

            // دمج المرفقات مع الصفوف
            rows.forEach(row => {
                const seenPaths = new Set();
                row.ATTACHMENTS_LIST = allAttachments
                    .filter(a => a.MAIN_DOC_NODE === row.NODE_ID || a.DOC_NO === row.DOC_NO)
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
        console.error("Database API Error:", err);
        return NextResponse.json(
            { success: false, error: "Database error" },
            { status: 500 }
        );
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

export const dynamic = "force-dynamic";
