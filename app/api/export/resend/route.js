import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

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

        const currentEmpNum = session.empNum;
        connection = await getConnection2();

        // جلب بيانات المكاتبة للحصول على الحقول الرئيسية (MAIN_DOC_NO, etc.)
        const docDataRes = await connection.execute(
            `SELECT DOC_DATE, MAIN_DOC_NO, MAIN_DOC_DATE, MAIN_DOC, MAIN_DATE, TRANS_TYPE
             FROM DOC_DATA_NEW WHERE DOC_NO = :docNo`,
            { docNo }
        );
        if (docDataRes.rows.length === 0) {
            return NextResponse.json({ success: false, error: "المكاتبة غير موجودة" }, { status: 404 });
        }
        const [docDate, mainDocNoRaw, mainDocDate, mainDoc, mainDate, transType] = docDataRes.rows[0];
        
        const isReply = transType === 3;
        // إذا كانت المكاتبة عبارة عن رد (TRANS_TYPE = 3)، نعتبر أن رقمها الرئيسي هو نفسها
        const mainDocNo = isReply ? docNo : (mainDocNoRaw || docNo);

        // ============================================
        // ✅ التحقق من وجود المستلمين سابقاً (في شجرة المكاتبة بالكامل)
        // ============================================
        const targetEmpNums = recipients.map(r => r.empNum.toString());

        // إنشاء أسماء فريدة لكل bind variable
        const empNumPlaceholders = targetEmpNums.map((_, i) => `:empNum${i}`).join(', ');

        let blockedEmployees = [];

        // محاولة الاستعلام مع الـ join أولاً
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

            const bindVars = { mainDocNo };
            targetEmpNums.forEach((emp, i) => {
                bindVars[`empNum${i}`] = emp;
            });

            const existingRecipsResult = await connection.execute(checkExistingRecipQuery, bindVars);

            blockedEmployees = existingRecipsResult.rows.map(row => ({
                empNum: row[0],
                empName: row[1] || `موظف ${row[0]}` // إذا كان الاسم null، نعرض الرقم
            }));

        } catch (joinError) {
            // إذا فشل بسبب عدم وجود جدول EMPLOYEES (ORA-00942)
            if (joinError.errorNum === 942) {
                console.warn("EMPLOYEES table not found, falling back to emp numbers only");

                // استعلام احتياطي بدون join
                const fallbackQuery = `
                    SELECT DISTINCT EMP_NUM FROM (
                        SELECT GEHA_C as EMP_NUM FROM RECIP_GEHA_NEW WHERE MAIN_DOC_NO = :mainDocNo
                        UNION ALL
                        SELECT PLACE_C as EMP_NUM FROM RECIP_GEHA_NEW WHERE MAIN_DOC_NO = :mainDocNo
                        UNION ALL
                        SELECT PLACE_C as EMP_NUM FROM DOC_DATA_NEW WHERE DOC_NO = :mainDocNo
                    ) WHERE EMP_NUM IN (${empNumPlaceholders})
                `;

                const bindVarsFallback = { mainDocNo };
                targetEmpNums.forEach((emp, i) => {
                    bindVarsFallback[`empNum${i}`] = emp;
                });

                const fallbackResult = await connection.execute(fallbackQuery, bindVarsFallback);

                blockedEmployees = fallbackResult.rows.map(row => ({
                    empNum: row[0],
                    empName: `موظف ${row[0]}` // عرض الرقم كاسم افتراضي
                }));
            } else {
                // إذا كان خطأ آخر، نعيد طرحه
                throw joinError;
            }
        }

        if (blockedEmployees.length > 0) {
            return NextResponse.json({
                success: false,
                error: "لا يمكن إعادة الإرسال لهؤلاء الموظفين لأنهم مسجلون بالفعل في مسار هذه المكاتبة (كراسلين أو مستلمين سابقين)",
                blockedEmployees
            }, { status: 400 });
        }
        // ============================================

        // ============================================

        // (تم جلب docDataRes مسبقاً)
        // const [docDate, mainDocNo, mainDocDate, mainDoc, mainDate] = docDataRes.rows[0];

        // 0. تحديث المرفقات في جدول ATTACHMENTS لو تم إرسالها
        const newAttachmentsToSave = Array.isArray(attachments) ? attachments : [];
        for (const att of newAttachmentsToSave) {
            await connection.execute(
                `INSERT INTO ATTACHMENTS (
                    DOC_NO, DOC_DATE, MAIN_DOC_NO, MAIN_DOC_DATE, MAIN_DOC, 
                    FILE_PATH, PLACE_C, MAIN_DATE, ATTACH_TYPE, FILE_DESC
                ) VALUES (
                    :docNo, SYSDATE, :mainDocNo, :mainDocDate, :mainDoc,
                    :filePath, :placeC, :mainDate, 1, :fileDesc
                )`,
                {
                    docNo,
                    mainDocNo: mainDocNo || docNo,
                    mainDocDate: mainDocDate || docDate,
                    mainDoc: mainDoc || docNo,
                    filePath: att.path,
                    placeC: currentEmpNum,
                    mainDate: mainDate || docDate,
                    fileDesc: att.desc || path.basename(att.path)
                }
            );
        }

        // تحديث FILE_ATTACH في جدول DOC_DATA_NEW للتوافق مع النظام القديم
        const allAttsResult = await connection.execute(
            `SELECT DISTINCT FILE_PATH FROM ATTACHMENTS WHERE DOC_NO = :docNo`,
            { docNo }
        );
        const finalAttachmentStr = allAttsResult.rows.map(r => r[0]).join('|');

        if (newAttachmentsToSave.length > 0) {
            await connection.execute(
                `UPDATE DOC_DATA_NEW SET FILE_ATTACH = :finalAttachmentStr WHERE DOC_NO = :docNo`,
                { finalAttachmentStr, docNo },
                { autoCommit: false }
            );
        }

        // 1. جلب بيانات التوجيه الأصلية لهذه المكاتبة
        const originalRecipQuery = `
            SELECT * FROM (
                SELECT * FROM RECIP_GEHA_NEW 
                WHERE DOC_NO = :docNo
            ) WHERE ROWNUM = 1
        `;
        const originalRecipResult = await connection.execute(originalRecipQuery, { docNo });

        if (originalRecipResult.rows.length === 0) {
            return NextResponse.json({ success: false, error: "لم يتم العثور على بيانات المكاتبة الأصلية" }, { status: 404 });
        }

        const recipMeta = originalRecipResult.metaData;

        // 2. إدراج كل مستلم جديد
        for (let i = 0; i < recipients.length; i++) {
            const { empNum: targetEmp, situationId } = recipients[i];

            const rCols = recipMeta.map(m => `"${m.name}"`);
            const selRVals = [];
            const rBinds = {
                docNo,
                currentEmpNum,
                targetEmp,
                situationId: parseInt(situationId) || 7
            };

            recipMeta.forEach(m => {
                if (m.name === 'DOC_NO') selRVals.push(':docNo');
                else if (m.name === 'PLACE_C') selRVals.push(':currentEmpNum');
                else if (m.name === 'GEHA_C') selRVals.push(':targetEmp');
                else if (m.name === 'SITUATION') selRVals.push(':situationId');
                else if (m.name === 'ANSERED') selRVals.push('0');
                else if (m.name === 'SEND_DATE') selRVals.push('SYSDATE');
                else if (m.name === 'SEEN_FLAG') selRVals.push('0');
                else if (m.name === 'SEEN_DATE') selRVals.push('NULL');
                else selRVals.push(`"${m.name}"`);
            });

            const insertSql = `
                INSERT INTO RECIP_GEHA_NEW (${rCols.join(', ')})
                SELECT ${selRVals.join(', ')}
                FROM RECIP_GEHA_NEW
                WHERE DOC_NO = :docNo AND ROWNUM = 1
            `;
            await connection.execute(insertSql, rBinds, { autoCommit: false });
        }

        await connection.commit();
        return NextResponse.json({
            success: true,
            message: `تم إعادة إرسال المكاتبة إلى ${recipients.length} موظف بنجاح`
        });

    } catch (err) {
        console.error("Resend API Error:", err);
        if (connection) await connection.rollback().catch(() => { });
        return NextResponse.json({ success: false, error: "فشل إعادة الإرسال: " + err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export const dynamic = "force-dynamic";