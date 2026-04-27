import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";
import fs from "fs";
import { exec } from "child_process";
import util from "util";
import path from "path";
import os from "os";

const execPromise = util.promisify(exec);

export async function POST(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }

    let connection;
    try {
        const { docNo, path: wordPath, situationId, attachments, recipientEmpNums, recipients, docType: frontendDocType } = await req.json();

        if (!docNo || !wordPath) {
            return NextResponse.json({ success: false, error: "بيانات ناقصة" }, { status: 400 });
        }

        // 1. التأكد من وجود ملف الوورد (نبحث عما هو موجود بالفعل)
        let actualWordPath = wordPath;
        if (!fs.existsSync(actualWordPath)) {
            const checkDocm = wordPath.toLowerCase().endsWith(".docm") ? wordPath : `${wordPath}.docm`;
            const checkDocx = wordPath.toLowerCase().endsWith(".docx") ? wordPath : `${wordPath}.docx`;

            if (fs.existsSync(checkDocm)) {
                actualWordPath = checkDocm;
            } else if (fs.existsSync(checkDocx)) {
                actualWordPath = checkDocx;
            } else {
                return NextResponse.json({ success: false, error: `ملف الوورد غير موجود في المسار المحدد: ${wordPath}` }, { status: 404 });
            }
        }
        const extension = actualWordPath.toLowerCase().endsWith(".docx") ? ".docx" : ".docm";

        // 2. تحديد مسار ملف PDF النهائي والقاعدة
        const pdfPathOnDisk = actualWordPath.replace(/\.(docm|docx)$/i, ".pdf");
        const basePath = actualWordPath.replace(/\.(docm|docx)$/i, "");

        // 3. تحديث قاعدة البيانات أولاً لتوفير وقت لتحديث ملف الوورد على الشبكة
        connection = await getConnection2();

        // جلب بيانات المسودة لإكمال الإرسال
        const draftRes = await connection.execute(
            `SELECT PLACE_C, EMP_NO, DOC_DATE, SUBJECT, MAIN_DOC, MAIN_DOC_NO, DOC_TYPE, 
                    NVL(TRANS_TYPE, 2) as TRANS_TYPE, MAIN_DATE, MAIN_DOC_DATE 
             FROM DOC_DATA_NEW 
             WHERE DOC_NO = :docNo`,
            { docNo }
        );

        if (draftRes.rows.length === 0) {
            throw new Error("لم يتم العثور على بيانات المسودة");
        }

        const [senderEmp, recipientEmp, docDate, subject, mainDoc, mainDocNo, docType, transType, mainDate, mainDocDate] = draftRes.rows[0];

        // تحضير نص المرفقات للجدول القديم (اختياري، للرجوع إليه)
        const legacyAttachString = attachments && attachments.length > 0
            ? attachments.map(a => a.path).join(',')
            : null;

        // استخدم النوع القادم من الواجهة، أو النوع الموجود مسبقاً، أو الافتراضي 1
        const finalDocType = frontendDocType ? parseInt(frontendDocType) : (docType || 1);

        await connection.execute(
            `UPDATE DOC_DATA_NEW SET FILE_NAME = :basePath, SECTORE = 1, FILE_ATTACH = :attachmentPath, DOC_TYPE = :finalDocType WHERE DOC_NO = :docNo`,
            {
                basePath,
                docNo,
                attachmentPath: legacyAttachString,
                finalDocType
            },
            { autoCommit: false }
        );

        // إدراج المرفقات في الجدول الجديد ATTACHMENTS
        if (attachments && attachments.length > 0) {
            for (const attach of attachments) {
                await connection.execute(
                    `INSERT INTO ATTACHMENTS (
                        DOC_NO, DOC_DATE, MAIN_DOC_NO, MAIN_DOC_DATE, MAIN_DOC, 
                        FILE_PATH, PLACE_C, MAIN_DATE, ATTACH_TYPE, FILE_DESC
                    ) VALUES (
                        :docNo, :docDate, :mainDocNo, :mainDocDate, :mainDoc, 
                        :filePath, :placeC, :mainDate, 1, :fileDesc
                    )`,
                    {
                        docNo,
                        docDate,
                        mainDocNo,
                        mainDocDate,
                        mainDoc,
                        filePath: attach.path,
                        placeC: senderEmp,
                        mainDate: mainDate || docDate, 
                        fileDesc: attach.desc || path.basename(attach.path)
                    },
                    { autoCommit: false }
                );
            }
        }

        // التحقق من قائمة المستلمين
        let distributions = [];
        if (recipients && recipients.length > 0) {
            distributions = recipients;
        } else {
            distributions = [{ empNum: recipientEmp, situationId: situationId || 7 }];
        }

        // إرسال المكاتبة فعلياً لكل مستلم (مع منع التكرار)
        for (const target of distributions) {
            // التحقق من عدم وجود سجل مسبق لنفس المكاتبة ونفس المستلم
            const existCheck = await connection.execute(
                `SELECT COUNT(*) FROM RECIP_GEHA_NEW WHERE DOC_NO = :docNo AND GEHA_C = :recipient`,
                { docNo, recipient: target.empNum }
            );
            if (existCheck.rows[0][0] > 0) {
                console.log(`[ARCHIVE] Skipping duplicate: DOC_NO=${docNo}, GEHA_C=${target.empNum}`);
                continue;
            }

            await connection.execute(`
            INSERT INTO RECIP_GEHA_NEW (
                DOC_NO, DOC_DATE, PLACE_C, GEHA_C, SITUATION,SECTOR_C, ANSERED, REPLAY_PATH, SEND_DATE, 
                MAIN_DOC, MAIN_DOC_NO, SEEN_FLAG
            ) VALUES (
                :docNo, :docDate, :senderEmp, :recipient, :situationId,1, 0, :pdfPath, SYSDATE,
                :mainDoc, :mainDocNo, 0
            )
        `, {
                docNo,
                docDate,
                senderEmp,
                recipient: target.empNum,
                pdfPath: basePath,
                situationId: parseInt(target.situationId) || 7,
                mainDoc,
                mainDocNo
            }, { autoCommit: false });

            // إرسال تنبيه للمستلم
            await sendNotification({
                senderId: senderEmp,
                receiverId: target.empNum,
                message: `وصلتك مذكرة جديدة بعنوان: ${subject}`,
                docNo: docNo,
                title: `مذكرة جديدة`
            });
        }

        await connection.commit();

        // 4. استراتيجية التحويل بعد الانتهاء من قواعد البيانات
        // هنا قمنا بحذف الـ Powershell واستدعاء API التعديل مباشرة لحل مشكلة الأبعاد بشكل قاطع ومطابق تماماً
        try {
            const protocol = req.headers.get('x-forwarded-proto') || 'http';
            const host = req.headers.get('host') || 'localhost:3000';
            const baseUrl = `${protocol}://${host}`;

            const updatePdfRes = await fetch(`${baseUrl}/api/memo/update-pdf`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: req.headers.get("cookie")
                },
                body: JSON.stringify({ docNo, skipNotifications: true })
            });

            if (!updatePdfRes.ok) {
                const resJson = await updatePdfRes.json().catch(() => ({}));
                throw new Error(resJson.error || "فشل نداء API التعديل");
            }
            
            return NextResponse.json({ success: true, pdfPath: pdfPathOnDisk });

        } catch (convErr) {
            console.error("Conversion via Update API Error:", convErr);
            // نعيد نجاح مع إشعار بالخطأ في التحويل، لأن الداتابيز اكتملت
            return NextResponse.json({ success: true, pdfPath: pdfPathOnDisk, warning: "تم الإرسال ولكن الرجاء تحديث PDF لاحقاً: " + (convErr.message || "خطأ غير معروف") });
        }

    } catch (err) {
        console.error("Archive API Error:", err);
        if (connection) await connection.rollback().catch(() => { });
        const errorMessage = err.message.includes("ORA-") ? "Database Error: " + err.message : err.message;
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}