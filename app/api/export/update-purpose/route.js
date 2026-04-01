import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

async function saveAttachments(files, docNo) {
    if (!files || files.length === 0) return "";

    const uploadDir = path.join(process.env.ATTACHMENTS_PATH || "C:\\Archives", docNo);
    await mkdir(uploadDir, { recursive: true });

    const paths = [];

    for (const file of files) {
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = path.join(uploadDir, fileName);
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);
        paths.push(filePath);
    }

    return paths.join("|");
}

export async function POST(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }

    const empNum = session.empNum;
    const formData = await req.formData();
    const docNo = formData.get("docNo");
    const newPurpose = formData.get("newPurpose");
    const subject = formData.get("subject");
    const attachments = formData.getAll("attachments");

    const keptAttachments = formData.getAll("keptAttachments");

    if (!docNo) {
        return NextResponse.json({ success: false, error: "بيانات ناقصة (رقم المكاتبة)" }, { status: 400 });
    }

    let connection;
    try {
        connection = await getConnection2();

        // التحقق من أن المستخدم هو المرسل (صاحب التوجيه) في جدول الصادر
        const checkResult = await connection.execute(
            `SELECT COUNT(*) AS CNT FROM RECIP_GEHA_NEW WHERE DOC_NO = :docNo AND PLACE_C = :empNum`,
            { docNo, empNum }
        );
        if (checkResult.rows[0][0] === 0) {
            return NextResponse.json({ success: false, error: "لا يمكنك تعديل هذه المكاتبة" }, { status: 403 });
        }

        // جلب الرقم المرجعي الرئيسي (MAIN_DOC) للمكاتبة لضمان تحديث كل "شجرة" التحويلات
        const mainDocRes = await connection.execute(
            `SELECT NVL(MAIN_DOC, DOC_NO), DOC_DATE, MAIN_DOC_NO, MAIN_DOC_DATE, MAIN_DATE 
             FROM DOC_DATA_NEW WHERE DOC_NO = :docNo`,
            { docNo }
        );
        const [rootDocId, docDate, mainDocNo, mainDocDate, mainDate] = mainDocRes.rows[0];

        // --- معالجة المرفقات في الجدول الجديد ATTACHMENTS ---
        if (formData.has("manageAttachments")) {
            const currentKept = keptAttachments.filter(Boolean);

            // 1. تحديد المرفقات المطلوب حذفها (الموجودة حالياً وليست في قائمة kept)
            const currentAttsRes = await connection.execute(
                `SELECT FILE_PATH FROM ATTACHMENTS WHERE DOC_NO = :docNo`,
                { docNo }
            );
            const currentPaths = currentAttsRes.rows.map(r => r[0]);
            const pathsToDelete = currentPaths.filter(p => !currentKept.includes(p));

            for (const pathToDelete of pathsToDelete) {
                // حذف المرفق من المكاتبة الحالية وكل المكاتبات التي تم تحويله إليها (ATTACH_TYPE=2)
                // نستخدم المسار كمعرف للمرفق في السلسلة
                await connection.execute(
                    `DELETE FROM ATTACHMENTS 
                     WHERE (DOC_NO = :docNo OR (MAIN_DOC = :rootDocId AND ATTACH_TYPE = 2))
                     AND FILE_PATH = :pathToDelete`,
                    { docNo, rootDocId, pathToDelete }
                );
            }
        }

        // 2. رفع وحفظ المرفقات الجديدة
        if (attachments.length > 0) {
            const descriptions = formData.getAll("descriptions");
            for (let i = 0; i < attachments.length; i++) {
                const file = attachments[i];
                const fileDesc = descriptions[i] || file.name;

                // حفظ الملف فيزيائياً
                const uploadDir = path.join(process.env.ATTACHMENTS_PATH || "C:\\Archives", docNo);
                await mkdir(uploadDir, { recursive: true });
                const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
                const filePath = path.join(uploadDir, fileName);
                const buffer = Buffer.from(await file.arrayBuffer());
                await writeFile(filePath, buffer);

                // إدراج في جدول ATTACHMENTS
                // إدراج في جدول ATTACHMENTS
                await connection.execute(
                    `INSERT INTO ATTACHMENTS (
                        DOC_NO, DOC_DATE, MAIN_DOC_NO, MAIN_DOC_DATE, MAIN_DOC, 
                        FILE_PATH, PLACE_C, MAIN_DATE, ATTACH_TYPE, FILE_DESC
                    ) VALUES (
                        :docNo, :attachDate, :mainDocNo, :mainDocDate, :rootDocId,
                        :filePath, :empNum, :mainDate, 1, :fileDesc
                    )`,
                    {
                        docNo,
                        mainDocNo: mainDocNo || docNo,
                        mainDocDate: mainDocDate || docDate,
                        rootDocId: rootDocId || docNo,
                        filePath: filePath,
                        empNum: empNum,
                        mainDate: mainDate || docDate,
                        fileDesc: fileDesc,
                        attachDate: docDate
                    }
                );
            }
        }

        // تحديث FILE_ATTACH في DOC_DATA_NEW للتوافق (سلسلة مسارات مفصولة بـ |)
        const allAttsRes = await connection.execute(
            `SELECT FILE_PATH FROM ATTACHMENTS WHERE DOC_NO = :docNo`,
            { docNo }
        );
        const finalAttachmentsStr = allAttsRes.rows.map(r => r[0]).join("|");

        // تحديث جدول DOC_DATA_NEW (الموضوع والمرفقات) ليظهر التحديث لكل المستلمين في شجرة التحويل
        const updateFields = [];
        const bindVars = { rootDocId, docNo };

        if (subject !== null && subject !== undefined) {
            updateFields.push("SUBJECT = :subject");
            bindVars.subject = subject;
        }

        // تحديث FILE_ATTACH لكل المكاتبات في السلسلة لضمان التزامن في النظام القديم
        updateFields.push("FILE_ATTACH = :attachPath");
        bindVars.attachPath = finalAttachmentsStr || null;

        if (updateFields.length > 0) {
            // تحديث المكاتبة الأصلية وكل المكاتبات المشتقة منها (التحويلات)
            await connection.execute(
                `UPDATE DOC_DATA_NEW SET ${updateFields.join(", ")} 
                 WHERE DOC_NO = :rootDocId OR MAIN_DOC = :rootDocId OR DOC_NO = :docNo`,
                bindVars,
                { autoCommit: false }
            );
        }

        // تحديث الغرض في جدول RECIP_GEHA_NEW للمستلمين التابعين لهذا الشخص (من أرسل إليهم المكاتبة)
        if (newPurpose) {
            await connection.execute(
                `UPDATE RECIP_GEHA_NEW SET SITUATION = :newPurpose WHERE DOC_NO = :docNo AND PLACE_C = :empNum`,
                { newPurpose: parseInt(newPurpose), docNo, empNum },
                { autoCommit: false }
            );
        }

        // تنفيذ commit
        await connection.commit();

        return NextResponse.json({
            success: true,
            message: "تم تحديث المكاتبة بنجاح",
        });

    } catch (err) {
        console.error("Update Purpose Error:", err);
        if (connection) await connection.rollback();
        return NextResponse.json(
            { success: false, error: "حدث خطأ في قاعدة البيانات" },
            { status: 500 }
        );
    } finally {
        if (connection) await connection.close();
    }
}