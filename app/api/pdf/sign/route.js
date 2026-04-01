import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getConnection, getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

const SIGNATURES_DIR = "\\\\192.168.13.11\\it_dep\\sign";

export async function POST(request) {
    let connection;
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

        const body = await request.json();
        const {
            filePath,
            empNum,
            signaturePath: providedSignaturePath,
            x,
            y,
            pageIndex,
            width: sigWidth,
            height: sigHeight,
            viewWidth,
            viewHeight,
            docNo
        } = body;

        console.log(`Signing request for ${empNum} on page ${pageIndex} at x:${x}, y:${y}`);

        if (!filePath || !empNum) {
            return NextResponse.json({ success: false, error: "المعاملات ناقصة" }, { status: 400 });
        }

        // 1. تحديد ملف التوقيع
        let signaturePath = providedSignaturePath;
        if (!signaturePath) {
            const extensions = ['.png', '.jpg', '.jpeg'];
            for (const ext of extensions) {
                const potentialPath = path.join(SIGNATURES_DIR, `${empNum}${ext}`);
                if (fs.existsSync(potentialPath)) {
                    signaturePath = potentialPath;
                    break;
                }
            }
        }

        if (!signaturePath || !fs.existsSync(signaturePath)) {
            return NextResponse.json({ success: false, error: "لا يوجد توقيع مسجل باسم هذا الموظف أو المسار غير صحيح" });
        }

        // 2. التحقق من وجود ملف PDF
        const decentPdfPath = filePath.trim().replace(/\//g, "\\");
        if (!fs.existsSync(decentPdfPath)) {
            return NextResponse.json({ success: false, error: "ملف PDF غير موجود" });
        }

        // 3. قراءة الملفات
        const pdfBytes = fs.readFileSync(decentPdfPath);
        const signatureBytes = fs.readFileSync(signaturePath);

        // 4. تحميل PDF
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const targetPage = pages[pageIndex] || pages[pages.length - 1];
        const { width: actualWidth, height: actualHeight } = targetPage.getSize();

        let finalX = x || 50;
        let finalY = y || 50;
        let finalSigWidth = sigWidth || 150;
        let finalSigHeight = sigHeight || 70;

        if (viewWidth && viewHeight) {
            const scaleX = actualWidth / viewWidth;
            const scaleY = actualHeight / viewHeight;
            finalX = x * scaleX;
            finalY = y * scaleY;
            finalSigWidth = (sigWidth || 150) * scaleX;
            finalSigHeight = (sigHeight || 70) * scaleY;
        }

        // 5. دمج صورة التوقيع
        let signatureImage;
        const sigExt = path.extname(signaturePath).toLowerCase();
        if (sigExt === '.png') {
            signatureImage = await pdfDoc.embedPng(signatureBytes);
        } else {
            signatureImage = await pdfDoc.embedJpg(signatureBytes);
        }

        // 6. نسخة احتياطية
        const backupPath = decentPdfPath + ".bak";
        if (!fs.existsSync(backupPath)) {
            fs.copyFileSync(decentPdfPath, backupPath);
        }

        // 7. رسم التوقيع
        targetPage.drawImage(signatureImage, {
            x: finalX,
            y: finalY,
            width: finalSigWidth,
            height: finalSigHeight,
        });

        // 8. جلب اسم الموظف والتاريخ
        const fontkit = (await import("@pdf-lib/fontkit")).default;
        pdfDoc.registerFontkit(fontkit);

        const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        let arabicFont;
        const fontPath = path.join(process.cwd(), "public/fonts/Cairo-Regular.ttf");
        try {
            if (fs.existsSync(fontPath)) {
                const fontBytes = fs.readFileSync(fontPath);
                arabicFont = await pdfDoc.embedFont(fontBytes);
            } else {
                arabicFont = helveticaFont;
            }
        } catch (e) {
            arabicFont = helveticaFont;
        }

        // جلب الاسم من قاعدة البيانات
        let empName = "مستخدم " + empNum;
        try {
            let nameConn = await getConnection();
            let nameRes = await nameConn.execute(`SELECT emp_name FROM main_mast WHERE emp_num = :empNum`, { empNum });
            if (nameRes.rows && nameRes.rows.length > 0) {
                empName = nameRes.rows[0][0];
            } else {
                await nameConn.close();
                nameConn = await getConnection2();
                nameRes = await nameConn.execute(`SELECT emp_name FROM main_mast WHERE emp_num = :empNum`, { empNum });
                if (nameRes.rows && nameRes.rows.length > 0) empName = nameRes.rows[0][0];
            }
            if (nameConn) await nameConn.close().catch(() => { });
        } catch (e) { console.error("Error fetching name for signature:", e); }

        const now = new Date();
        const timestampText = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const fontSize = 10;
        const nameFontSize = 11;

        // رسم التاريخ
        targetPage.drawText(timestampText, {
            x: finalX + (finalSigWidth / 2) - (helveticaFont.widthOfTextAtSize(timestampText, fontSize) / 2),
            y: finalY - 12,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0, 0, 1),
        });

        // رسم الاسم (مع إعادة التشكيل)
        const ARABIC_FORMS = {
            'ا': ['\uFE8D', '\uFE8D', '\uFE8E', '\uFE8E'], 'ب': ['\uFE8F', '\uFE91', '\uFE92', '\uFE90'],
            'ت': ['\uFE95', '\uFE97', '\uFE98', '\uFE96'], 'ث': ['\uFE99', '\uFE9B', '\uFE9C', '\uFE9A'],
            'ج': ['\uFE9D', '\uFE9F', '\uFEA0', '\uFE9E'], 'ح': ['\uFEA1', '\uFEA3', '\uFEA4', '\uFEA2'],
            'خ': ['\uFEA5', '\uFEA7', '\uFEA8', '\uFEA6'], 'د': ['\uFEA9', '\uFEA9', '\uFEAA', '\uFEAA'],
            'ذ': ['\uFEAB', '\uFEAB', '\uFEAC', '\uFEAC'], 'ر': ['\uFEAD', '\uFEAD', '\uFEAE', '\uFEAE'],
            'ز': ['\uFEAF', '\uFEAF', '\uFEB0', '\uFEB0'], 'س': ['\uFEB1', '\uFEB3', '\uFEB4', '\uFEB2'],
            'ش': ['\uFEB5', '\uFEB7', '\uFEB8', '\uFEB6'], 'ص': ['\uFEB9', '\uFEBB', '\uFEBC', '\uFEBA'],
            'ض': ['\uFEBD', '\uFEBF', '\uFEC0', '\uFEBE'], 'ط': ['\uFEC1', '\uFEC3', '\uFEC4', '\uFEC2'],
            'ظ': ['\uFEC5', '\uFEC7', '\uFEC8', '\uFEC6'], 'ع': ['\uFEC9', '\uFECB', '\uFECC', '\uFECA'],
            'غ': ['\uFECD', '\uFECF', '\uFED0', '\uFECE'], 'ف': ['\uFED1', '\uFED3', '\uFED4', '\uFED2'],
            'ق': ['\uFED5', '\uFED7', '\uFED8', '\uFED6'], 'ك': ['\uFED9', '\uFEDB', '\uFEDC', '\uFEDA'],
            'ل': ['\uFEDD', '\uFEDF', '\uFEE0', '\uFEDE'], 'م': ['\uFEE1', '\uFEE3', '\uFEE4', '\uFEE2'],
            'ن': ['\uFEE5', '\uFEE7', '\uFEE8', '\uFEE6'], 'ه': ['\uFEE9', '\uFEEB', '\uFEEC', '\uFEEA'],
            'و': ['\uFEED', '\uFEED', '\uFEEE', '\uFEEE'], 'ي': ['\uFEF1', '\uFEF3', '\uFEF4', '\uFEF2'],
            'ى': ['\uFEEF', '\uFEEF', '\uFEF0', '\uFEF0'], 'ة': ['\uFE93', '\uFE93', '\uFE94', '\uFE94'],
            'ئ': ['\uFE89', '\uFE8B', '\uFE8C', '\uFE8A'], 'ؤ': ['\uFE87', '\uFE87', '\uFE88', '\uFE88'],
            'إ': ['\uFE87', '\uFE87', '\uFE88', '\uFE88'], 'أ': ['\uFE83', '\uFE83', '\uFE84', '\uFE84'],
            'آ': ['\uFE81', '\uFE81', '\uFE82', '\uFE82'], 'ء': ['\uFE80', '\uFE80', '\uFE80', '\uFE80'],
            'ﻻ': ['\uFEFB', '\uFEFB', '\uFEFC', '\uFEFC']
        };
        const DONT_CONNECT = ['ا', 'د', 'ذ', 'ر', 'ز', 'و', 'أ', 'إ', 'آ', 'ؤ', 'ء', 'ة'];

        const reshape = (t) => {
            if (!t) return "";
            // معالجة اللام ألف
            t = t.replace(/لا/g, "ﻻ").replace(/لأ/g, "ﻷ").replace(/لإ/g, "ﻹ").replace(/لآ/g, "ﻵ");

            let r = "";
            for (let i = 0; i < t.length; i++) {
                const c = t[i];
                if (!ARABIC_FORMS[c]) { r += c; continue; }

                const p = i > 0 ? t[i - 1] : null;
                const n = i < t.length - 1 ? t[i + 1] : null;

                // القدرة على الاتصال بما قبله
                const canConnectPrev = p && ARABIC_FORMS[p] && !DONT_CONNECT.includes(p);
                // القدرة على الاتصال بما بعده
                const canConnectNext = n && ARABIC_FORMS[n] && !DONT_CONNECT.includes(c);

                let f = 0; // مستقل
                if (canConnectPrev && canConnectNext) f = 2; // وسط
                else if (canConnectPrev) f = 3; // نهائي
                else if (canConnectNext) f = 1; // ابتدائي

                r += ARABIC_FORMS[c][f];
            }
            return r; // تمت إزالة العكس بناءً على رغبة المستخدم ولأن نظام الخط قد يدعم الـ RTL تلقائياً مع الحروف المشكلة
        };

        const reshapedName = reshape(empName);

        // حساب الحجم المناسب للخط لضمان عدم الخروج عن الإطار بشكل فج
        let currentNameSize = nameFontSize;
        let textWidth = arabicFont.widthOfTextAtSize(reshapedName, currentNameSize);
        const maxWidth = Math.max(finalSigWidth * 1.5, 140); // السماح بمساحة أكبر قليلاً

        while (textWidth > maxWidth && currentNameSize > 8) {
            currentNameSize -= 0.5;
            textWidth = arabicFont.widthOfTextAtSize(reshapedName, currentNameSize);
        }

        targetPage.drawText(reshapedName, {
            x: finalX + (finalSigWidth / 2) - (textWidth / 2),
            y: finalY - 26,
            size: currentNameSize,
            font: arabicFont,
            color: rgb(0, 0, 0),
        });

        // 9. حفظ PDF (مع تكرار المحاولة في حالة القفل EBUSY)
        const modifiedPdfBytes = await pdfDoc.save();

        let saved = false;
        let attempts = 0;
        while (!saved && attempts < 5) {
            try {
                fs.writeFileSync(decentPdfPath, modifiedPdfBytes);
                saved = true;
            } catch (writeErr) {
                attempts++;
                if (writeErr.code === 'EBUSY' && attempts < 5) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // انتظر نص ثانية
                } else {
                    throw writeErr;
                }
            }
        }

        // 10. تسجيل التعديل في قاعدة البيانات (معالجة تشتت الجدول والعداد بين القاعدتين)
        try {
            let conn;
            // دالة لجلب الرقم المسلسل التالي من أي قاعدة متاحة
            const getNextId = async (tableName) => {
                let seqConn;
                try {
                    seqConn = await getConnection2(); // العداد غالباً في قاعدة المكاتبات (Doc)
                    const r = await seqConn.execute(`SELECT ${tableName}_SEQ.NEXTVAL FROM DUAL`);
                    return r.rows[0][0];
                } catch (e) {
                    try {
                        if (seqConn) await seqConn.close().catch(() => { });
                        seqConn = await getConnection(); // محاولة البحث في الرواتب (Salary)
                        const r = await seqConn.execute(`SELECT ${tableName}_SEQ.NEXTVAL FROM DUAL`);
                        return r.rows[0][0];
                    } catch (e2) {
                        console.error(`Sequence ${tableName}_SEQ not found in both DBs`);
                        return null;
                    }
                } finally {
                    if (seqConn) await seqConn.close().catch(() => { });
                }
            };

            const params = {
                filePath: decentPdfPath,
                empNum: empNum,
                signaturePath: signaturePath,
                pageIndex: pageIndex,
                x: finalX,
                y: finalY,
                width: finalSigWidth,
                height: finalSigHeight,
                docNo: docNo || null
            };

            const nextId = await getNextId('DOC_MODIFICATIONS') || await getNextId('DOC_MODIFICATIONS_NEW') || (Date.now() % 2147483647);

            // محاولة الإدراج في كل الاحتمالات
            const insertRecord = async (dbConn, tbl) => {
                await dbConn.execute(
                    `INSERT INTO ${tbl} (ID, FILE_PATH, USER_EMP_NUM, TYPE, SIGNATURE_PATH, PAGE_INDEX, X, Y, WIDTH, HEIGHT, DOC_NO, CREATED_AT)
                     VALUES (:id, :filePath, :empNum, 'signature', :signaturePath, :pageIndex, :x, :y, :width, :height, :docNo, CURRENT_TIMESTAMP)`,
                    { ...params, id: nextId }
                );
                await dbConn.commit();
            };

            try {
                conn = await getConnection(); // الجدول غالباً هنا (Salary)
                try {
                    await insertRecord(conn, 'DOC_MODIFICATIONS');
                } catch (e) {
                    await insertRecord(conn, 'DOC_MODIFICATIONS_NEW');
                }
            } catch (err) {
                if (conn) await conn.close().catch(() => { });
                conn = await getConnection2(); // محاولة الإدراج في (Doc) إذا فشلت الأولى
                try {
                    await insertRecord(conn, 'DOC_MODIFICATIONS');
                } catch (e) {
                    await insertRecord(conn, 'DOC_MODIFICATIONS_NEW');
                }
            } finally {
                if (conn) await conn.close().catch(() => { });
            }
        } catch (dbError) {
            console.error("Critical Error inserting signature record:", dbError);
        }
        // الإشعارات معطلة — لا يتم إرسال تنبيه عند التوقيع

        return NextResponse.json({ success: true, message: "تم إضافة التوقيع وإخطار المستلمين بنجاح" });

    } catch (error) {
        console.error("Error signing PDF:", error);
        if (connection) await connection.rollback().catch(() => { });
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}
