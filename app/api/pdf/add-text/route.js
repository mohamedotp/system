import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { getConnection, getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

// 🔹 قاموس تشكيل الحروف العربية (للتعامل مع الحروف المتصلة والمنفصلة)
const ARABIC_FORMS = {
    // [مستقل, في البداية, في الوسط, في النهاية]
    'ا': ['\uFE8D', '\uFE8D', '\uFE8E', '\uFE8E'],
    'ب': ['\uFE8F', '\uFE91', '\uFE92', '\uFE90'],
    'ت': ['\uFE95', '\uFE97', '\uFE98', '\uFE96'],
    'ث': ['\uFE99', '\uFE9B', '\uFE9C', '\uFE9A'],
    'ج': ['\uFE9D', '\uFE9F', '\uFEA0', '\uFE9E'],
    'ح': ['\uFEA1', '\uFEA3', '\uFEA4', '\uFEA2'],
    'خ': ['\uFEA5', '\uFEA7', '\uFEA8', '\uFEA6'],
    'د': ['\uFEA9', '\uFEA9', '\uFEAA', '\uFEAA'],
    'ذ': ['\uFEAB', '\uFEAB', '\uFEAC', '\uFEAC'],
    'ر': ['\uFEAD', '\uFEAD', '\uFEAE', '\uFEAE'],
    'ز': ['\uFEAF', '\uFEAF', '\uFEB0', '\uFEB0'],
    'س': ['\uFEB1', '\uFEB3', '\uFEB4', '\uFEB2'],
    'ش': ['\uFEB5', '\uFEB7', '\uFEB8', '\uFEB6'],
    'ص': ['\uFEB9', '\uFEBB', '\uFEBC', '\uFEBA'],
    'ض': ['\uFEBD', '\uFEBF', '\uFEC0', '\uFEBE'],
    'ط': ['\uFEC1', '\uFEC3', '\uFEC4', '\uFEC2'],
    'ظ': ['\uFEC5', '\uFEC7', '\uFEC8', '\uFEC6'],
    'ع': ['\uFEC9', '\uFECB', '\uFECC', '\uFECA'],
    'غ': ['\uFECD', '\uFECF', '\uFED0', '\uFECE'],
    'ف': ['\uFED1', '\uFED3', '\uFED4', '\uFED2'],
    'ق': ['\uFED5', '\uFED7', '\uFED8', '\uFED6'],
    'ك': ['\uFED9', '\uFEDB', '\uFEDC', '\uFEDA'],
    'ل': ['\uFEDD', '\uFEDF', '\uFEE0', '\uFEDE'],
    'م': ['\uFEE1', '\uFEE3', '\uFEE4', '\uFEE2'],
    'ن': ['\uFEE5', '\uFEE7', '\uFEE8', '\uFEE6'],
    'ه': ['\uFEE9', '\uFEEB', '\uFEEC', '\uFEEA'],
    'و': ['\uFEED', '\uFEED', '\uFEEE', '\uFEEE'],
    'ي': ['\uFEF1', '\uFEF3', '\uFEF4', '\uFEF2'],
    'ى': ['\uFEEF', '\uFEEF', '\uFEF0', '\uFEF0'],
    'ة': ['\uFE93', '\uFE93', '\uFE94', '\uFE94'],
    'ئ': ['\uFE89', '\uFE8B', '\uFE8C', '\uFE8A'],
    'ؤ': ['\uFE87', '\uFE87', '\uFE88', '\uFE88'],
    'إ': ['\uFE87', '\uFE87', '\uFE88', '\uFE88'],
    'أ': ['\uFE83', '\uFE83', '\uFE84', '\uFE84'],
    'آ': ['\uFE81', '\uFE81', '\uFE82', '\uFE82'],
    'ء': ['\uFE80', '\uFE80', '\uFE80', '\uFE80'],
    'ﻻ': ['\uFEFB', '\uFEFB', '\uFEFC', '\uFEFC'], // Lam-Alif
};

const DONT_CONNECT_TO_NEXT = ['ا', 'د', 'ذ', 'ر', 'ز', 'و', 'أ', 'إ', 'آ', 'ؤ', 'ء', 'ة'];

function reshapeArabic(text) {
    if (!text) return "";
    let reshaped = "";

    // معالجة "لا" (لام ألف) أولاً
    text = text.replace(/لا/g, "ﻻ");

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (!ARABIC_FORMS[char]) {
            reshaped += char;
            continue;
        }

        const prev = i > 0 ? text[i - 1] : null;
        const next = i < text.length - 1 ? text[i + 1] : null;

        const connectsToPrev = prev && ARABIC_FORMS[prev] && !DONT_CONNECT_TO_NEXT.includes(prev);
        const connectsToNext = next && ARABIC_FORMS[next];

        let formIndex = 0; // Independent
        if (connectsToPrev && connectsToNext) formIndex = 2; // Medial
        else if (connectsToPrev) formIndex = 3; // Final
        else if (connectsToNext) formIndex = 1; // Initial

        reshaped += ARABIC_FORMS[char][formIndex];
    }

    // ملاحظة: قمت بإلغاء العكس هنا مؤقتاً للتجربة إذا كان نظام الخط يدعم الـ RTL
    // إذا ظهرت الحروف صحيحة ولكن الترتيب مقلوب، سنقوم بتفعيله مجدداً
    return reshaped;
}

export async function POST(request) {
    let connection; // تعريف المتغير لاستخدامه في finally
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json(
                { success: false, error: "غير مصرح" },
                { status: 401 }
            );
        }

        const body = await request.json();
        // إضافة docNo إلى المتغيرات المستخرجة
        const { filePath, viewWidth, viewHeight, texts, docNo } = body;

        if (!filePath || !Array.isArray(texts) || !texts.length) {
            return NextResponse.json(
                { success: false, error: "المعاملات ناقصة" },
                { status: 400 }
            );
        }

        const decentPdfPath = filePath.trim().replace(/\//g, "\\");

        if (!fs.existsSync(decentPdfPath)) {
            return NextResponse.json(
                { success: false, error: "ملف PDF غير موجود" },
                { status: 404 }
            );
        }

        const backupPath = decentPdfPath + ".bak";
        if (!fs.existsSync(backupPath)) {
            fs.copyFileSync(decentPdfPath, backupPath);
        }

        const pdfBytes = fs.readFileSync(decentPdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfDoc.registerFontkit(fontkit);

        const pages = pdfDoc.getPages();

        // تحميل الخط (كما هو)
        let arabicFont;
        const fontPath = path.join(process.cwd(), "public/fonts/Cairo-Regular.ttf");
        try {
            if (fs.existsSync(fontPath)) {
                const fontBytes = fs.readFileSync(fontPath);
                arabicFont = await pdfDoc.embedFont(fontBytes);
            } else {
                console.warn("⚠️ Cairo font not found, using Helvetica.");
                arabicFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            }
        } catch (fError) {
            console.error("Font loading error:", fError);
            arabicFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        }

        const fontSize = 16;
        console.log(`Processing ${texts.length} text items for PDF: ${decentPdfPath}`);

        // مصفوفة لتخزين بيانات التعديلات لإدراجها في قاعدة البيانات
        const modificationsToInsert = [];

        for (const item of texts) {
            let { text, pageIndex, x, y } = item;
            if (!text) continue;

            // تطبيق التشكيل
            text = reshapeArabic(text);

            const targetPage = pages[pageIndex] || pages[0];
            const { width: actualWidth, height: actualHeight } = targetPage.getSize();

            const currentViewWidth = item.viewWidth || viewWidth;
            const currentViewHeight = item.viewHeight || viewHeight;

            let finalX = x;
            let finalY = y;

            if (currentViewWidth && currentViewHeight) {
                const scaleX = actualWidth / currentViewWidth;
                const scaleY = actualHeight / currentViewHeight;
                finalX = x * scaleX;
                finalY = y * scaleY;

                console.log(`[Text Item] "${text}" -> Original(x:${x}, y:${y}), Scaled(x:${finalX.toFixed(2)}, y:${finalY.toFixed(2)}) on Page:${pageIndex}`);
            }

            targetPage.drawText(text, {
                x: finalX,
                y: finalY,
                size: fontSize,
                font: arabicFont,
                color: rgb(1, 0, 0),
            });

            // إضافة بيانات هذا النص إلى مصفوفة التعديلات
            modificationsToInsert.push({
                filePath: decentPdfPath,
                userEmpNum: session.empNum,
                type: 'text',
                textContent: text,
                pageIndex: pageIndex,
                x: finalX,
                y: finalY,
                docNo: docNo || null
            });
        }

        // حفظ الملف المعدل (مع تكرار المحاولة في حالة القفل EBUSY)
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
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    throw writeErr;
                }
            }
        }
        console.log(`Successfully saved ${texts.length} texts to ${decentPdfPath}`);

        // إدراج التعديلات في قاعدة البيانات (معالجة تشتت الجدول والعداد)
        if (modificationsToInsert.length > 0) {
            try {
                let conn;

                const getNextId = async () => {
                    let seqConn;
                    try {
                        seqConn = await getConnection2();
                        const r = await seqConn.execute(`SELECT DOC_MODIFICATIONS_SEQ.NEXTVAL FROM DUAL`);
                        return r.rows[0][0];
                    } catch (e) {
                        try {
                            if (seqConn) await seqConn.close().catch(() => { });
                            seqConn = await getConnection();
                            const r = await seqConn.execute(`SELECT DOC_MODIFICATIONS_SEQ.NEXTVAL FROM DUAL`);
                            return r.rows[0][0];
                        } catch (e2) { return null; }
                    } finally { if (seqConn) await seqConn.close().catch(() => { }); }
                };

                const tryInsert = async (dbConn, tableName, mod) => {
                    const nextId = await getNextId() || Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
                    const sql = `INSERT INTO ${tableName} (ID, FILE_PATH, USER_EMP_NUM, TYPE, TEXT_CONTENT, PAGE_INDEX, X, Y, DOC_NO, CREATED_AT)
                                 VALUES (:id, :filePath, :userEmpNum, 'text', :textContent, :pageIndex, :x, :y, :docNo, CURRENT_TIMESTAMP)`;
                    
                    // نبعث فقط الحقول المطلوبة لتجنب خطأ ORA-01036
                    const binds = {
                        id: nextId,
                        filePath: mod.filePath,
                        userEmpNum: mod.userEmpNum,
                        textContent: mod.textContent,
                        pageIndex: mod.pageIndex,
                        x: mod.x,
                        y: mod.y,
                        docNo: mod.docNo || null
                    };

                    await dbConn.execute(sql, binds);
                    await dbConn.commit();
                };

                try {
                    conn = await getConnection();
                    for (const mod of modificationsToInsert) {
                        try {
                            await tryInsert(conn, 'DOC_MODIFICATIONS', mod);
                        } catch (e) {
                            await tryInsert(conn, 'DOC_MODIFICATIONS_NEW', mod);
                        }
                    }
                } catch (salaryErr) {
                    if (conn) await conn.close().catch(() => { });
                    conn = await getConnection2();
                    for (const mod of modificationsToInsert) {
                        try {
                            await tryInsert(conn, 'DOC_MODIFICATIONS', mod);
                        } catch (e) {
                            await tryInsert(conn, 'DOC_MODIFICATIONS_NEW', mod);
                        }
                    }
                } finally {
                    if (conn) await conn.close().catch(() => { });
                }
            } catch (dbError) {
                console.error("Error inserting text modifications into database:", dbError);
            }
        }

        return NextResponse.json({
            success: true,
            count: texts.length,
            message: `تم حفظ ${texts.length} نص بنجاح`
        });

    } catch (error) {
        console.error("Error adding text to PDF:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error("Error closing connection:", e); }
        }
    }
}