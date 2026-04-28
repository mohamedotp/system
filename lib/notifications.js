import { getConnection, getConnection2 } from "./oracle";
import webpush from "web-push";

// إعداد مفاتيح التنبيهات
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

/**
 * إرسال تنبيه لموظف (في قاعدة البيانات وعبر الـ Push Notification)
 */
export async function sendNotification({ senderId, receiverId, message, docNo, title, isManual = 0 }) {
    const receiverIdStr = String(receiverId);
    const senderIdStr = String(senderId);

    let connection;
    try {
        console.log(`🔔 Internal Notification: ${senderIdStr} -> ${receiverIdStr}: ${message}`);

        // 1. الحفظ في قاعدة البيانات
        try {
            connection = await getConnection();
            await connection.execute(
                `INSERT INTO SYSTEM_NOTIFICATIONS (SENDER_ID, RECEIVER_ID, MESSAGE, DOC_NO, READ_FLAG, IS_MANUAL) 
                 VALUES (:senderId, :receiverId, :message, :docNo, 0, :isManual)`,
                {
                    senderId: senderIdStr,
                    receiverId: receiverIdStr,
                    message,
                    docNo: docNo || null,
                    isManual
                },
                { autoCommit: true }
            );
        } catch (salaryErr) {
            console.warn(`⚠️ Notification DB Fallback to Doc: ${salaryErr.message}`);
            if (connection) await connection.close().catch(() => { });
            connection = await getConnection2();
            await connection.execute(
                `INSERT INTO SYSTEM_NOTIFICATIONS (SENDER_ID, RECEIVER_ID, MESSAGE, DOC_NO, READ_FLAG, IS_MANUAL) 
                 VALUES (:senderId, :receiverId, :message, :docNo, 0, :isManual)`,
                {
                    senderId: senderIdStr,
                    receiverId: receiverIdStr,
                    message,
                    docNo: docNo || null,
                    isManual
                },
                { autoCommit: true }
            );
        }

        // 2. إرسال Push Notification للمتصفح (حتى لو مغلق)
        try {
            if (!connection) connection = await getConnection();
            const subRes = await connection.execute(
                `SELECT SUBSCRIPTION_JSON FROM SYSTEM_PUSH_SUBS WHERE EMP_NUM = :empNum`,
                { empNum: receiverIdStr }
            );

            if (subRes.rows.length > 0) {
                const payload = JSON.stringify({
                    title: title || `تنبيه نظام الأرشفة`,
                    body: message,
                    url: docNo ? `/import?docNo=${docNo}` : `/notifications`
                });

                // إرسال لكل الاشتراكات المسجلة (لو فاتح كذا جهاز)
                let pushPromises = subRes.rows.map(row => {
                    const sub = JSON.parse(row[0]);
                    return webpush.sendNotification(sub, payload).catch(err => {
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            console.warn("⚠️ Push subscription expired for one device.");
                            // اختياري: مسح الاشتراك من الداتا بيز لو انتهى
                        } else {
                            console.error("⚠️ Push error for one device:", err.message);
                        }
                    });
                });

                await Promise.all(pushPromises);
                console.log(`🚀 Web Push sent to ${subRes.rows.length} subscriptions.`);
            }
        } catch (pushErr) {
            console.error("⚠️ Web Push Notification failed:", pushErr.message);
        }

        return { success: true };
    } catch (err) {
        console.error("❌ sendNotification Error:", err);
        return { success: false, error: err.message };
    } finally {
        if (connection) await connection.close().catch(() => { });
    }
}
