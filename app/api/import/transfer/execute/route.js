import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";

// قائمة المستخدمين الخاصين (يجب أن تكون مطابقة للـ frontend)
const SPECIAL_TRANSFER_USERS = ["1714", "1712", "1716"];

export async function POST(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }

    let connection;
    try {
        const { docNo, recipients, attachments } = await req.json();

        if (!docNo || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({ success: false, error: "بيانات ناقصة" }, { status: 400 });
        }

        const currentEmpNum = session.empNum.toString(); // تأكد من تحويله لنص للمقارنة
        connection = await getConnection2();

        // 1. جلب MAIN_DOC_NO و TRANS_TYPE للمكاتبة الحالية (الرقم الرئيسي)
        const mainDocResult = await connection.execute(
            `SELECT MAIN_DOC_NO, TRANS_TYPE FROM DOC_DATA_NEW WHERE DOC_NO = :docNo`,
            { docNo }
        );

        if (mainDocResult.rows.length === 0) {
            return NextResponse.json({ success: false, error: "لم يتم العثور على المكاتبة" }, { status: 404 });
        }

        const transType = mainDocResult.rows[0][1];
        const isReply = transType === 3;

        // إذا كانت المكاتبة عبارة عن رد (TRANS_TYPE = 3)، نعتبر أن رقمها الرئيسي هو نفسها
        // حتى لا يتم حظر تحويل الرد لأشخاص استلموا المكاتبة الأصلية
        const mainDocNo = isReply ? docNo : (mainDocResult.rows[0][0] || docNo);

        // ✅ التحقق من وجود المستلمين سابقاً
        const targetEmpNums = recipients.map(r => r.empNum.toString());
        const empNumPlaceholders = targetEmpNums.map((_, i) => `:empNum${i}`).join(', ');

        let blockedEmployees = [];

        try {
            const checkExistingRecipQuery = `
                SELECT DISTINCT EMP_NUM, EMP_NAME FROM (
                    SELECT r.GEHA_C as EMP_NUM, e.EMP_NAME FROM RECIP_GEHA_NEW r LEFT JOIN EMP_DOC e ON r.GEHA_C = e.EMP_NUM WHERE r.MAIN_DOC_NO = :mainDocNo
                    UNION ALL
                    SELECT r.PLACE_C as EMP_NUM, e.EMP_NAME FROM RECIP_GEHA_NEW r LEFT JOIN EMP_DOC e ON r.PLACE_C = e.EMP_NUM WHERE r.MAIN_DOC_NO = :mainDocNo
                    UNION ALL
                    SELECT d.PLACE_C as EMP_NUM, e.EMP_NAME FROM DOC_DATA_NEW d LEFT JOIN EMP_DOC e ON d.PLACE_C = e.EMP_NUM WHERE d.DOC_NO = :mainDocNo
                ) WHERE EMP_NUM IN (${empNumPlaceholders})
            `;

            const checkBindVars = { mainDocNo };
            targetEmpNums.forEach((emp, i) => {
                checkBindVars[`empNum${i}`] = emp;
            });

            const existingRecipsResult = await connection.execute(checkExistingRecipQuery, checkBindVars);

            blockedEmployees = existingRecipsResult.rows.map(row => ({
                empNum: row[0],
                empName: row[1] || `موظف ${row[0]}`
            }));

        } catch (joinError) {
            if (joinError.errorNum === 942) {
                console.warn("EMPLOYEES table not found, falling back to emp numbers only");

                const fallbackQuery = `
                    SELECT DISTINCT EMP_NUM FROM (
                        SELECT GEHA_C as EMP_NUM FROM RECIP_GEHA_NEW WHERE MAIN_DOC_NO = :mainDocNo
                        UNION ALL
                        SELECT PLACE_C as EMP_NUM FROM RECIP_GEHA_NEW WHERE MAIN_DOC_NO = :mainDocNo
                        UNION ALL
                        SELECT PLACE_C as EMP_NUM FROM DOC_DATA_NEW WHERE DOC_NO = :mainDocNo
                    ) WHERE EMP_NUM IN (${empNumPlaceholders})
                `;

                const fallbackBindVars = { mainDocNo };
                targetEmpNums.forEach((emp, i) => {
                    fallbackBindVars[`empNum${i}`] = emp;
                });

                const fallbackResult = await connection.execute(fallbackQuery, fallbackBindVars);

                blockedEmployees = fallbackResult.rows.map(row => ({
                    empNum: row[0],
                    empName: `موظف ${row[0]}`
                }));
            } else {
                throw joinError;
            }
        }

        if (blockedEmployees.length > 0) {
            await connection.rollback();
            return NextResponse.json({
                success: false,
                error: "لا يمكن تحويل المكاتبة لهؤلاء الموظفين لأنهم طرف في شجرة المكاتبة (إما كراسل أو مستقبل سابق)",
                blockedEmployees
            }, { status: 400 });
        }

        // 2. جلب بيانات المكاتبة الأصلية
        const originalDocQuery = `
            SELECT * FROM (
                SELECT * FROM DOC_DATA_NEW 
                WHERE DOC_NO = :docNo 
                ORDER BY DOC_DATE DESC
            ) WHERE ROWNUM = 1
        `;
        const originalDocResult = await connection.execute(originalDocQuery, { docNo });

        if (originalDocResult.rows.length === 0) {
            return NextResponse.json({ success: false, error: "لم يتم العثور على المكاتبة الأصلية" }, { status: 404 });
        }

        const docMeta = originalDocResult.metaData;
        const docRow = originalDocResult.rows[0];
        const originalDocData = {};
        docMeta.forEach((m, idx) => { originalDocData[m.name] = docRow[idx]; });

        // دمج المرفقات
        let finalAttachmentsStr = originalDocData.FILE_ATTACH || "";

        // تحويل المرفقات القادمة من الواجهة إلى مصفوفة مسارات للمقارنة
        const incomingPaths = Array.isArray(attachments)
            ? attachments.map(att => att.path)
            : (typeof attachments === 'string' ? attachments.split('|') : []);

        const originalAttachments = originalDocData.FILE_ATTACH || "";

        if (originalAttachments && incomingPaths.length > 0) {
            const origSet = new Set(originalAttachments.split('|').filter(a => !!a));
            incomingPaths.forEach(p => { if (p) origSet.add(p); });
            finalAttachmentsStr = Array.from(origSet).join('|');
        } else if (incomingPaths.length > 0) {
            finalAttachmentsStr = incomingPaths.join('|');
        } else if (originalAttachments) {
            finalAttachmentsStr = originalAttachments;
        }

        // 3. التحقق من وجود تحويل سابق
        const checkExistingQuery = `
            SELECT DOC_NO FROM (
                SELECT DOC_NO FROM DOC_DATA_NEW 
                WHERE MAIN_DOC_NO = :docNo AND PLACE_C = :currentEmpNum AND NVL(TRANS_TYPE, 0) = 2
                ORDER BY DOC_DATE DESC
            ) WHERE ROWNUM = 1
        `;
        const existingResult = await connection.execute(checkExistingQuery, { docNo, currentEmpNum });

        let targetDocNo;
        let isNewTransfer = false;

        if (existingResult.rows.length > 0) {
            targetDocNo = existingResult.rows[0][0];
        } else {
            const docNoRes = await connection.execute(`SELECT COALESCE(MAX(DOC_NO), 0) + 1 FROM DOC_DATA_NEW`);
            targetDocNo = docNoRes.rows[0][0];
            isNewTransfer = true;
        }

        const mainDoc = originalDocData.MAIN_DOC || docNo;
        const isVacationDoc = originalDocData.FROM_DATE && originalDocData.TO_DATE;

        // --- التعامل مع المرفقات الجديدة في جدول ATTACHMENTS ---
        // المرفقات الواصلة من الفرونت إند (مصفوفة من {path, desc})
        const newAttachmentsToSave = Array.isArray(attachments) ? attachments : [];

        for (const att of newAttachmentsToSave) {
            await connection.execute(
                `INSERT INTO ATTACHMENTS (
                    DOC_NO, DOC_DATE, MAIN_DOC_NO, MAIN_DOC_DATE, MAIN_DOC, 
                    FILE_PATH, PLACE_C, MAIN_DATE, ATTACH_TYPE, FILE_DESC
                ) VALUES (
                    :targetDocNo, SYSDATE, :mainDocNo, :mainDocDate, :mainDoc,
                    :filePath, :placeC, :mainDate, 1, :fileDesc
                )`,
                {
                    targetDocNo,
                    mainDocNo: originalDocData.MAIN_DOC_NO || docNo,
                    mainDocDate: originalDocData.MAIN_DOC_DATE || originalDocData.DOC_DATE,
                    mainDoc: originalDocData.MAIN_DOC || docNo,
                    filePath: att.path,
                    placeC: currentEmpNum,
                    mainDate: originalDocData.MAIN_DATE || originalDocData.DOC_DATE,
                    fileDesc: att.desc || path.basename(att.path)
                }
            );
        }

        // --- نسخ المرفقات القديمة للمكاتبة الجديدة (تحويل) ---
        if (isNewTransfer) {
            // جلب مرفقات المكاتبة الأصلية لنسخها
            const oldAttachments = await connection.execute(
                `SELECT FILE_PATH, FILE_DESC FROM ATTACHMENTS WHERE DOC_NO = :docNo`,
                { docNo }
            );

            for (const row of oldAttachments.rows) {
                await connection.execute(
                    `INSERT INTO ATTACHMENTS (
                        DOC_NO, DOC_DATE, MAIN_DOC_NO, MAIN_DOC_DATE, MAIN_DOC, 
                        FILE_PATH, PLACE_C, MAIN_DATE, ATTACH_TYPE, FILE_DESC
                    ) VALUES (
                        :targetDocNo, SYSDATE, :mainDocNo, :mainDocDate, :mainDoc,
                        :filePath, :placeC, :mainDate, 2, :fileDesc
                    )`,
                    {
                        targetDocNo,
                        mainDocNo: originalDocData.MAIN_DOC_NO || docNo,
                        mainDocDate: originalDocData.MAIN_DOC_DATE || originalDocData.DOC_DATE,
                        mainDoc: originalDocData.MAIN_DOC || docNo,
                        filePath: row[0],
                        placeC: currentEmpNum,
                        mainDate: originalDocData.MAIN_DATE || originalDocData.DOC_DATE,
                        fileDesc: row[1]
                    }
                );
            }
        }

        // تحديث FILE_ATTACH في جدول DOC_DATA_NEW للتوافق مع النظام القديم
        const allAttsResult = await connection.execute(
            `SELECT FILE_PATH FROM ATTACHMENTS WHERE DOC_NO = :targetDocNo`,
            { targetDocNo }
        );
        const finalAttachmentStr = allAttsResult.rows.map(r => r[0]).join('|');

        // 4. إنشاء سجل جديد إذا كان تحويلاً جديداً
        if (isNewTransfer) {
            const docCols = [];
            const selDocVals = [];
            const activeDocBinds = { whereDocNo: docNo };

            const subject = recipients[0].subject || originalDocData.SUBJECT;

            docMeta.forEach(m => {
                docCols.push(`"${m.name}"`);
                if (m.name === 'DOC_NO') {
                    selDocVals.push(':newDocNo');
                    activeDocBinds.newDocNo = targetDocNo;
                }
                else if (m.name === 'EMP_NO') {
                    if (isVacationDoc) {
                        selDocVals.push('"EMP_NO"');
                    } else {
                        selDocVals.push(':targetEmp');
                        activeDocBinds.targetEmp = recipients[0].empNum;
                    }
                }
                else if (m.name === 'PLACE_C') {
                    selDocVals.push(':currentEmpNum');
                    activeDocBinds.currentEmpNum = currentEmpNum;
                }
                else if (m.name === 'TRANS_TYPE') {
                    selDocVals.push(':transType');
                    activeDocBinds.transType = 2;
                }
                else if (m.name === 'MAIN_DOC') {
                    selDocVals.push(':mainDoc');
                    activeDocBinds.mainDoc = mainDoc;
                }
                else if (m.name === 'MAIN_DOC_NO') {
                    selDocVals.push(':mainDocNo');
                    activeDocBinds.mainDocNo = docNo;
                }
                else if (m.name === 'SUBJECT') {
                    selDocVals.push(':subject');
                    activeDocBinds.subject = subject;
                }
                else if (m.name === 'FILE_ATTACH') {
                    selDocVals.push(':finalAttachments');
                    activeDocBinds.finalAttachments = finalAttachmentsStr || null;
                }
                else if (m.name === 'DOC_DATE') {
                    selDocVals.push('SYSDATE');
                }
                else {
                    selDocVals.push(`"${m.name}"`);
                }
            });

            const insertDocSql = `
                INSERT INTO DOC_DATA_NEW (${docCols.join(', ')})
                SELECT ${selDocVals.join(', ')}
                FROM DOC_DATA_NEW
                WHERE DOC_NO = :whereDocNo AND ROWNUM = 1
            `;
            await connection.execute(insertDocSql, activeDocBinds, { autoCommit: false });
        } else {
            // تحديث السجل الموجود لو فيه مرفقات جديدة
            await connection.execute(
                `UPDATE DOC_DATA_NEW SET FILE_ATTACH = :finalAttachmentStr WHERE DOC_NO = :targetDocNo`,
                { finalAttachmentStr, targetDocNo },
                { autoCommit: false }
            );
        }

        // 5. معالجة المستلمين الجدد (المستلمين)
        let addedCount = 0;
        for (const recipient of recipients) {
            const { empNum: targetEmp, situationId } = recipient;

            const checkRecipQuery = `SELECT 1 FROM RECIP_GEHA_NEW WHERE DOC_NO = :targetDocNo AND GEHA_C = :targetEmp`;
            const recipExists = await connection.execute(checkRecipQuery, { targetDocNo, targetEmp });

            if (recipExists.rows.length === 0) {
                // 🔹 المستلمون الجدد دائماً "جارٍ الرد" (ANSERED = 0)
                const anseredValue = 0;

                await connection.execute(
                    `INSERT INTO RECIP_GEHA_NEW (
                        DOC_NO, DOC_DATE, PLACE_C, GEHA_C, SITUATION, MAIN_DOC, MAIN_DOC_NO, ANSERED, SEND_DATE, SEEN_FLAG
                    ) VALUES (
                        :targetDocNo, SYSDATE, :currentEmpNum, :targetEmp, :situationId, :mainDoc, :docNo, :ansered, SYSDATE, 0
                    )`,
                    {
                        targetDocNo,
                        currentEmpNum,
                        targetEmp,
                        situationId: situationId || null,
                        mainDoc,
                        docNo,
                        ansered: anseredValue
                    },
                    { autoCommit: false }
                );
                addedCount++;

                // إرسال تنبيه للمستلم
                await sendNotification({
                    senderId: currentEmpNum,
                    receiverId: targetEmp,
                    message: `تم تحويل مكاتبة جديدة إليك بعنوان: ${recipient.subject || originalDocData.SUBJECT}`,
                    docNo: targetDocNo
                });
            }
        }

        // ✅ إذا كان المستخدم الحالي من المستخدمين الخاصين، نقوم بتحديث حالة الرد الخاصة به في المكاتبة الأصلية
        if (SPECIAL_TRANSFER_USERS.includes(currentEmpNum)) {
            // تحديث سجل المستلم الخاص به في RECIP_GEHA_NEW للمكاتبة الأصلية (docNo)
            await connection.execute(
                `UPDATE RECIP_GEHA_NEW SET ANSERED = 1 WHERE DOC_NO = :docNo AND GEHA_C = :currentEmpNum`,
                { docNo, currentEmpNum },
                { autoCommit: false }
            );
        }

        await connection.commit();
        return NextResponse.json({
            success: true,
            message: `تم تحويل المكاتبة بنجاح (رقم: ${targetDocNo}). تم إضافة ${addedCount} مستلم جديد.`,
            docNo: targetDocNo
        });

    } catch (err) {
        console.error("Transfer Error:", err);
        if (connection) await connection.rollback().catch(() => { });
        return NextResponse.json({ success: false, error: "فشل التحويل: " + err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export const dynamic = "force-dynamic";
