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
    let notifConn;
    try {
        mainConn = await getConnection2();

        // 1. جلب معلومات المكاتبة
        const docRes = await mainConn.execute(
            `SELECT SUBJECT FROM DOC_DATA_NEW WHERE DOC_NO = :docNo AND ROWNUM = 1`,
            { docNo }
        );
        const docSubject = docRes.rows[0]?.[0] || 'بدون موضوع';

        const userRes = await mainConn.execute(
            `SELECT EMP_NAME FROM EMP_DOC WHERE EMP_NUM = :empNum`,
            { empNum: currentEmpNum }
        );
        const currentUserName = userRes.rows[0]?.[0] || 'غير معروف';

        // 2. تجميع الموظفين المتأثرين (لإرسال إشعارات لهم)
        // سنكتفي حالياً بحذف الموظف المستهدف أو كل المحول لهم من قبل المستخدم الحالي
        const affectedRecipients = new Set();
        if (targetEmpNum) {
            affectedRecipients.add(targetEmpNum);

            // حذف الموظف المحدد
            await mainConn.execute(
                `DELETE FROM RECIP_GEHA_NEW WHERE DOC_NO = :docNo AND GEHA_C = :targetEmpNum AND PLACE_C = :currentEmpNum`,
                { docNo, targetEmpNum, currentEmpNum }
            );
        } else {
            // جلب كل من حول لهم المستخدم الحالي لهذه المكاتبة
            const recipsRes = await mainConn.execute(
                `SELECT GEHA_C FROM RECIP_GEHA_NEW WHERE DOC_NO = :docNo AND PLACE_C = :currentEmpNum`,
                { docNo, currentEmpNum }
            );
            recipsRes.rows.forEach(r => affectedRecipients.add(r[0]));

            // حذف كل التحويلات التي قام بها المستخدم الحالي لهذه المكاتبة
            await mainConn.execute(
                `DELETE FROM RECIP_GEHA_NEW WHERE DOC_NO = :docNo AND PLACE_C = :currentEmpNum`,
                { docNo, currentEmpNum }
            );
        }

        // 3. إرسال الإشعارات (استخدام الراتب أولاً)
        if (affectedRecipients.size > 0) {
            const notificationMessage = `تم إلغاء/حذف تحويل المكاتبة "${docSubject}" من قبل الموظف: ${currentUserName}`;
            for (const recipientEmpNum of affectedRecipients) {
                if (String(recipientEmpNum) === String(currentEmpNum)) continue;
                await sendNotification({
                    senderId: currentEmpNum,
                    receiverId: recipientEmpNum,
                    message: notificationMessage,
                    docNo: docNo
                });
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
        if (notifConn) await notifConn.close().catch(() => { });
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
