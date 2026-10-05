import { NextResponse } from "next/server";
import { getConnection, getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";

// تنفيذ عملية الحذف النهائي والتنبيهات بشكل مباشر ومبسط
export async function DELETE(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

    let bodyData;
    try {
        bodyData = await req.json();
    } catch (e) {
        return NextResponse.json({ success: false, error: "خطأ في قراءة البيانات" }, { status: 400 });
    }

    const { docNo, targetEmpNum } = bodyData;
    const currentEmpNum = session.empNum;

    if (!docNo) return NextResponse.json({ success: false, error: "رقم المكاتبة مطلوب" }, { status: 400 });

    let mainConn;
    try {
        mainConn = await getConnection2();

        // 1. جلب الرقم الرئيسي وموضوع المكاتبة
        const pivotRes = await mainConn.execute(
            `SELECT NVL(MAIN_DOC, DOC_NO), SUBJECT FROM DOC_DATA_NEW WHERE DOC_NO = :docNo AND ROWNUM = 1`,
            { docNo }
        );
        if (pivotRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: "المكاتبة غير موجودة" }, { status: 404 });
        }
        const rootDocId = pivotRes.rows[0][0] || docNo;
        const docSubject = pivotRes.rows[0][1] || 'بدون موضوع';

        const userRes = await mainConn.execute(
            `SELECT EMP_NAME FROM EMP_DOC WHERE EMP_NUM = :empNum`,
            { empNum: currentEmpNum }
        );
        const currentUserName = userRes.rows[0]?.[0] || 'غير معروف';

        // 2. جلب كل مستندات العائلة (DOC_DATA_NEW)
        const docsRes = await mainConn.execute(
            `SELECT DOC_NO, PLACE_C, MAIN_DOC_NO FROM DOC_DATA_NEW 
             WHERE MAIN_DOC = :rootDocId OR DOC_NO = :rootDocId`,
            { rootDocId }
        );
        const allDocs = docsRes.rows.map(row => ({
            docNo: String(row[0]),
            creator: String(row[1]),
            parentDocNo: row[2] ? String(row[2]) : null
        }));

        // 3. جلب كل تحويلات العائلة (RECIP_GEHA_NEW)
        const docNos = allDocs.map(d => d.docNo);
        const docNoBinds = {};
        const placeholders = docNos.map((id, index) => {
            const key = `docNo${index}`;
            docNoBinds[key] = id;
            return `:${key}`;
        }).join(', ');

        const transQuery = `
            SELECT DOC_NO, PLACE_C, GEHA_C 
            FROM RECIP_GEHA_NEW 
            WHERE MAIN_DOC = :rootDocId OR DOC_NO = :rootDocId 
               ${placeholders ? `OR DOC_NO IN (${placeholders})` : ''}
        `;
        const transBinds = { rootDocId, ...docNoBinds };
        const transRes = await mainConn.execute(transQuery, transBinds);
        const allTransfers = transRes.rows.map(row => ({
            docNo: String(row[0]),
            sender: String(row[1]),
            receiver: String(row[2])
        }));

        // 4. خوارزمية تحديد المسارات النشطة وغير النشطة (Reachability Graph)
        const startToDelete = t => {
            if (targetEmpNum) {
                return t.docNo === String(docNo) && t.sender === String(currentEmpNum) && t.receiver === String(targetEmpNum);
            } else {
                return t.docNo === String(docNo) && t.sender === String(currentEmpNum);
            }
        };

        const activeTransfers = allTransfers.filter(t => !startToDelete(t));

        // حساب الوصول
        const reachableAccess = new Set();
        const reachableTransfers = new Set();
        const queue = [];

        // المبتدأ: الجذور النشطة (المستندات الرئيسية التي ليس لها أب أو التي هي أصل الشجرة)
        const rootDoc = allDocs.find(d => d.docNo === String(rootDocId));
        if (rootDoc) {
            reachableAccess.add(`${rootDoc.docNo}:${rootDoc.creator}`);
            queue.push({ type: 'access', docNo: rootDoc.docNo, empNum: rootDoc.creator });
        }

        for (const d of allDocs) {
            if (!d.parentDocNo || d.docNo === d.parentDocNo || d.docNo === String(rootDocId)) {
                const key = `${d.docNo}:${d.creator}`;
                if (!reachableAccess.has(key)) {
                    reachableAccess.add(key);
                    queue.push({ type: 'access', docNo: d.docNo, empNum: d.creator });
                }
            }
        }

        // تشغيل BFS لتحديد كل ما هو نشط
        while (queue.length > 0) {
            const curr = queue.shift();
            if (curr.type === 'access') {
                // التحويلات التي قام بها هذا المستخدم للمستند الحالي
                for (const t of activeTransfers) {
                    if (t.docNo === curr.docNo && t.sender === curr.empNum) {
                        const tKey = `${t.docNo}:${t.sender}:${t.receiver}`;
                        if (!reachableTransfers.has(tKey)) {
                            reachableTransfers.add(tKey);
                            queue.push({ type: 'transfer', docNo: t.docNo, sender: t.sender, receiver: t.receiver });
                        }
                    }
                }
                // الردود التي أنشأها هذا المستخدم وتعتمد على المستند الحالي كأب
                for (const d of allDocs) {
                    if (d.parentDocNo === curr.docNo && d.creator === curr.empNum) {
                        const aKey = `${d.docNo}:${d.creator}`;
                        if (!reachableAccess.has(aKey)) {
                            reachableAccess.add(aKey);
                            queue.push({ type: 'access', docNo: d.docNo, empNum: d.creator });
                        }
                    }
                }
            } else if (curr.type === 'transfer') {
                // وصول المستلم للمستند
                const aKey = `${curr.docNo}:${curr.receiver}`;
                if (!reachableAccess.has(aKey)) {
                    reachableAccess.add(aKey);
                    queue.push({ type: 'access', docNo: curr.docNo, empNum: curr.receiver });
                }
            }
        }

        // 5. تجميع العناصر التي سيتم حذفها (غير النشطة/غير القابلة للوصول)
        const unreachableTransfers = allTransfers.filter(t => {
            const tKey = `${t.docNo}:${t.sender}:${t.receiver}`;
            return !reachableTransfers.has(tKey);
        });

        const unreachableDocs = allDocs.filter(d => {
            if (d.docNo === String(rootDocId)) return false; // لا نحذف المستند الرئيسي أبداً من DOC_DATA_NEW
            const aKey = `${d.docNo}:${d.creator}`;
            return !reachableAccess.has(aKey);
        });

        // 6. تنفيذ عمليات الحذف بقاعدة البيانات
        // أ. حذف التحويلات غير القابلة للوصول
        for (const t of unreachableTransfers) {
            await mainConn.execute(
                `DELETE FROM RECIP_GEHA_NEW WHERE DOC_NO = :docNo AND PLACE_C = :sender AND GEHA_C = :receiver`,
                { docNo: t.docNo, sender: t.sender, receiver: t.receiver }
            );
        }

        // ب. حذف الردود غير القابلة للوصول ومرفقاتها
        for (const d of unreachableDocs) {
            await mainConn.execute(
                `DELETE FROM ATTACHMENTS WHERE DOC_NO = :docNo`,
                { docNo: d.docNo }
            );
            await mainConn.execute(
                `DELETE FROM DOC_DATA_NEW WHERE DOC_NO = :docNo`,
                { docNo: d.docNo }
            );
        }

        // 7. إرسال التنبيهات للأشخاص المتأثرين
        const affectedRecipients = new Set(unreachableTransfers.map(t => t.receiver));
        if (affectedRecipients.size > 0) {
            const notificationMessage = `تم إلغاء/حذف تحويل المكاتبة "${docSubject}" من قبل الموظف: ${currentUserName}`;
            for (const recipientEmpNum of affectedRecipients) {
                if (String(recipientEmpNum) === String(currentEmpNum)) continue;
                try {
                    await sendNotification({
                        senderId: currentEmpNum,
                        receiverId: recipientEmpNum,
                        message: notificationMessage,
                        docNo: docNo
                    });
                } catch (notifErr) {
                    console.error("Failed to send notification:", notifErr);
                }
            }
        }

        await mainConn.commit();
        return NextResponse.json({
            success: true,
            message: targetEmpNum ? "تم حذف تحويل الموظف بنجاح" : "تم إلغاء وحذف كافة التحويلات بنجاح"
        });

    } catch (err) {
        if (mainConn) await mainConn.rollback().catch(() => { });
        console.error("Delete Transfer API Final Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (mainConn) await mainConn.close().catch(() => { });
    }
}

// دالة GET للتحقق (مبسطة جداً)
export async function GET(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const docNo = searchParams.get("docNo");
    const currentEmpNum = session.empNum;
    let connection;
    try {
        connection = await getConnection2();
        const res = await connection.execute(
            `SELECT r.GEHA_C, e.EMP_NAME, r.ANSERED, r.DOC_NO
             FROM RECIP_GEHA_NEW r
             JOIN EMP_DOC e ON r.GEHA_C = e.EMP_NUM
             WHERE r.DOC_NO = :docNo AND r.PLACE_C = :currentEmpNum`,
            { docNo, currentEmpNum }
        );
        const recipients = res.rows.map(row => ({
            empNum: row[0], empName: row[1], ansered: row[2], childDocNo: row[3]
        }));
        return NextResponse.json({ success: true, recipients, canDelete: true });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message });
    } finally {
        if (connection) await connection.close().catch(() => { });
    }
}