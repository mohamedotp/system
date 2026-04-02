import { NextResponse } from "next/server";
import { getConnection, getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";

// جلب التنبيهات للمستخدم الحالي
export async function GET(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false }, { status: 401 });

    const empNumStr = String(session.empNum);

    let salaryConn;
    let docConn;
    try {
        let result;
        let finalRows = [];

        // 1. محاولة جلب التنبيهات من حساب الراتب
        try {
            salaryConn = await getConnection();
            result = await salaryConn.execute(
                `SELECT n.ROWID as NOTIF_ID, n.SENDER_ID, n.RECEIVER_ID, n.MESSAGE, n.DOC_NO, 
                        NVL(n.READ_FLAG, 0) as READ_FLAG,
                        TO_CHAR(n.CREATED_AT, 'YYYY-MM-DD HH24:MI') as TIME_STR
                 FROM SYSTEM_NOTIFICATIONS n
                 WHERE n.RECEIVER_ID = :empNum
                 ORDER BY n.CREATED_AT DESC`,
                { empNum: empNumStr },
                { maxRows: 50, outFormat: 4002 }
            );
            finalRows = result.rows.map(r => ({ ...r, ID: r.NOTIF_ID }));
        } catch (salaryErr) {
            if (salaryConn) await salaryConn.close().catch(() => { });
            salaryConn = null;
            docConn = await getConnection2();
            result = await docConn.execute(
                `SELECT n.ROWID as NOTIF_ID, n.SENDER_ID, n.RECEIVER_ID, n.MESSAGE, n.DOC_NO, 
                        NVL(n.READ_FLAG, 0) as READ_FLAG,
                        TO_CHAR(n.CREATED_AT, 'YYYY-MM-DD HH24:MI') as TIME_STR
                 FROM SYSTEM_NOTIFICATIONS n
                 WHERE n.RECEIVER_ID = :empNum
                 ORDER BY n.CREATED_AT DESC`,
                { empNum: empNumStr },
                { maxRows: 50, outFormat: 4002 }
            );
            finalRows = result.rows.map(r => ({ ...r, ID: r.NOTIF_ID }));
        }

        // 2. دمج بيانات المرسل والمكاتبة
        if (finalRows.length > 0) {
            if (!docConn) docConn = await getConnection2();
            const senderIds = [...new Set(finalRows.map(r => String(r.SENDER_ID)).filter(id => !!id))];
            let senderMap = {};
            if (senderIds.length > 0) {
                const senderPlaceholders = senderIds.map((_, i) => `:id${i}`).join(",");
                const senderBinds = {};
                senderIds.forEach((id, i) => senderBinds[`id${i}`] = id);

                const empResult = await docConn.execute(
                    `SELECT EMP_NUM, EMP_NAME FROM EMP_DOC WHERE EMP_NUM IN (${senderPlaceholders})`,
                    senderBinds
                );
                empResult.rows.forEach(r => { senderMap[String(r[0])] = r[1]; });
            }

            const docNos = [...new Set(finalRows.map(r => r.DOC_NO).filter(id => !!id))];
            let docMap = {};
            if (docNos.length > 0) {
                const docPlaceholders = docNos.map((_, i) => `:d${i}`).join(",");
                const docBinds = {};
                docNos.forEach((id, i) => docBinds[`d${i}`] = id);

                const docResult = await docConn.execute(
                    `SELECT DOC_NO, FILE_NAME, TO_CHAR(DOC_DATE, 'YYYY-MM-DD') as D_DATE FROM DOC_DATA_NEW WHERE DOC_NO IN (${docPlaceholders})`,
                    docBinds,
                    { outFormat: 4002 }
                );
                docResult.rows.forEach(r => { 
                    docMap[r.DOC_NO] = { path: r.FILE_NAME, date: r.D_DATE }; 
                });
            }

            finalRows = finalRows.map(row => ({
                ...row,
                SENDER_NAME: senderMap[String(row.SENDER_ID)] || "موظف " + row.SENDER_ID,
                DOC_PATH: docMap[row.DOC_NO]?.path || null,
                DOC_DATE: docMap[row.DOC_NO]?.date || null
            }));
        }

        return NextResponse.json({ success: true, data: finalRows });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (salaryConn) await salaryConn.close().catch(() => { });
        if (docConn) await docConn.close().catch(() => { });
    }
}

// إرسال تنبيه جديد
export async function POST(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false }, { status: 401 });

    const { receiverId, message, docNo } = await req.json();

    const result = await sendNotification({
        senderId: session.empNum,
        receiverId,
        message,
        docNo
    });

    if (result.success) {
        return NextResponse.json({ success: true });
    } else {
        return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
}

// حذف جميع التنبيهات للمستخدم الحالي
export async function DELETE(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false }, { status: 401 });
    const empNumStr = String(session.empNum);
    let connection;
    try {
        try {
            connection = await getConnection();
            await connection.execute(`DELETE FROM SYSTEM_NOTIFICATIONS WHERE RECEIVER_ID = :empNum`, { empNum: empNumStr }, { autoCommit: true });
        } catch (salaryErr) {
            if (connection) await connection.close().catch(() => { });
            connection = await getConnection2();
            await connection.execute(`DELETE FROM SYSTEM_NOTIFICATIONS WHERE RECEIVER_ID = :empNum`, { empNum: empNumStr }, { autoCommit: true });
        }
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close().catch(() => { });
    }
}

// حذف تنبيه واحد
export async function PATCH(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false }, { status: 401 });
    const { notificationId } = await req.json();
    const empNumStr = String(session.empNum);
    let connection;
    try {
        try {
            connection = await getConnection();
            await connection.execute(`DELETE FROM SYSTEM_NOTIFICATIONS WHERE ROWID = :id AND RECEIVER_ID = :empNum`, { id: notificationId, empNum: empNumStr }, { autoCommit: true });
        } catch (salaryErr) {
            if (connection) await connection.close().catch(() => { });
            connection = await getConnection2();
            await connection.execute(`DELETE FROM SYSTEM_NOTIFICATIONS WHERE ROWID = :id AND RECEIVER_ID = :empNum`, { id: notificationId, empNum: empNumStr }, { autoCommit: true });
        }
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close().catch(() => { });
    }
}