import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { getSession } from "@/lib/auth";
import { getConnection, getConnection2 } from "@/lib/oracle";
import oracledb from "oracledb";

// 🔹 قاموس تشكيل الحروف العربية
const ARABIC_FORMS = {
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
    'أ': ['\uFE83', '\uFE83', '\uFE84', '\uFE84'],
    'إ': ['\uFE87', '\uFE87', '\uFE88', '\uFE88'],
    'آ': ['\uFE81', '\uFE81', '\uFE82', '\uFE82'],
    'ء': ['\uFE80', '\uFE80', '\uFE80', '\uFE80'],
    'ﻻ': ['\uFEFB', '\uFEFB', '\uFEFC', '\uFEFC']
};

const DONT_CONNECT_TO_NEXT = ['ا', 'د', 'ذ', 'ر', 'ز', 'و', 'أ', 'إ', 'آ', 'ؤ', 'ء', 'ة'];

function reshapeArabic(text) {
    if (!text) return "";
    let reshaped = "";
    text = text.replace(/لا/g, "ﻻ");
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (!ARABIC_FORMS[char]) { reshaped += char; continue; }
        const prev = i > 0 ? text[i - 1] : null;
        const next = i < text.length - 1 ? text[i + 1] : null;
        const connectsToPrev = prev && ARABIC_FORMS[prev] && !DONT_CONNECT_TO_NEXT.includes(prev);
        const connectsToNext = next && ARABIC_FORMS[next];
        let formIndex = 0;
        if (connectsToPrev && connectsToNext) formIndex = 2;
        else if (connectsToPrev) formIndex = 3;
        else if (connectsToNext) formIndex = 1;
        reshaped += ARABIC_FORMS[char][formIndex];
    }
    return reshaped;
}

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

        const { filePath, docNo } = await request.json();
        if (!filePath) return NextResponse.json({ success: false, error: "المسار مطلوب" }, { status: 400 });

        const decentPdfPath = filePath.trim().replace(/\//g, "\\");
        const backupPath = decentPdfPath + ".bak";

        if (!fs.existsSync(backupPath)) {
            return NextResponse.json({ success: false, error: "لا توجد نسخة احتياطية للتراجع عنها" });
        }

        const seenCompositeKeys = new Set();
        const allOtherMods = [];
        const userModIdsByDbTable = [];

        // تنظيف هوية المستخدم الحالي للمقارنة الدقيقة
        const currentUserId = String(session.empNum || '').trim().toLowerCase().replace(/^0+/, '');

        async function fetchMods(getConnFunc, dbLabel) {
            let conn;
            try {
                conn = await getConnFunc();
                const tables = ['DOC_MODIFICATIONS', 'DOC_MODIFICATIONS_NEW'];
                for (const tableName of tables) {
                    try {
                        const res = await conn.execute(
                            `SELECT ID, FILE_PATH, USER_EMP_NUM, TYPE, SIGNATURE_PATH, TEXT_CONTENT, PAGE_INDEX, X, Y, WIDTH, HEIGHT, DOC_NO, CREATED_AT 
                             FROM ${tableName} WHERE UPPER(FILE_PATH) = UPPER(:p)`,
                            { p: decentPdfPath },
                            { outFormat: oracledb.OUT_FORMAT_OBJECT }
                        );

                        for (const row of res.rows) {
                            const mod = {};
                            for (const key in row) {
                                let val = row[key];
                                if (typeof val === 'string') val = val.trim();
                                mod[key.toLowerCase()] = val;
                            }

                            const compositeKey = `${dbLabel}-${tableName}-${mod.id}`.toLowerCase();
                            if (seenCompositeKeys.has(compositeKey)) continue;
                            seenCompositeKeys.add(compositeKey);

                            // مقارنة دقيقة جداً لهوية الموظف (بدون أصفار بادئة)
                            const modUserId = String(mod.user_emp_num || '').trim().toLowerCase().replace(/^0+/, '');

                            if (modUserId !== '' && modUserId === currentUserId) {
                                // تخص المستخدم الحالي -> إضافة للحذف
                                let tableEntry = userModIdsByDbTable.find(t => t.db === dbLabel && t.table === tableName);
                                if (!tableEntry) {
                                    tableEntry = { db: dbLabel, table: tableName, ids: [] };
                                    userModIdsByDbTable.push(tableEntry);
                                }
                                tableEntry.ids.push(mod.id);
                            } else {
                                // تخص زملائه -> إعادة رسمها
                                allOtherMods.push(mod);
                            }
                        }
                    } catch (e) { /* Table may not exist */ }
                }
            } catch (err) {
                console.warn(`Query failed for ${dbLabel}:`, err.message);
            } finally {
                if (conn) await conn.close().catch(() => { });
            }
        }

        await fetchMods(getConnection, "Salary");
        await fetchMods(getConnection2, "Doc");

        console.log(`Unsign Logic: Found ${allOtherMods.length} other signatures and ${userModIdsByDbTable.reduce((acc, curr) => acc + curr.ids.length, 0)} user signatures.`);

        // 2. إعادة بناء الملف
        const originalPdfBytes = fs.readFileSync(backupPath);
        const pdfDoc = await PDFDocument.load(originalPdfBytes);
        pdfDoc.registerFontkit(fontkit);

        let arabicFont;
        const fontPath = path.join(process.cwd(), "public/fonts/Cairo-Regular.ttf");
        try {
            if (fs.existsSync(fontPath)) {
                arabicFont = await pdfDoc.embedFont(fs.readFileSync(fontPath));
            } else {
                arabicFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            }
        } catch { arabicFont = await pdfDoc.embedFont(StandardFonts.Helvetica); }

        // ترتيب التعديلات زمنياً بدقة
        allOtherMods.sort((a, b) => {
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            if (timeA !== timeB) return timeA - timeB;
            return (a.id || 0) - (b.id || 0);
        });

        for (const mod of allOtherMods) {
            try {
                const pages = pdfDoc.getPages();
                const pageIdx = parseInt(mod.page_index) || 0;
                const targetPage = pages[pageIdx] || pages[0];
                const type = (mod.type || '').toLowerCase();

                if (type === 'signature') {
                    if (mod.signature_path && fs.existsSync(mod.signature_path)) {
                        const sigBytes = fs.readFileSync(mod.signature_path);
                        const sigImage = mod.signature_path.toLowerCase().endsWith('.png') ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes);

                        targetPage.drawImage(sigImage, {
                            x: parseFloat(mod.x),
                            y: parseFloat(mod.y),
                            width: parseFloat(mod.width || 150),
                            height: parseFloat(mod.height || 70)
                        });

                        const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                        const date = mod.created_at ? new Date(mod.created_at) : new Date();
                        const timestampText = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                        targetPage.drawText(timestampText, {
                            x: parseFloat(mod.x) + (parseFloat(mod.width || 150) / 2) - (helveticaFont.widthOfTextAtSize(timestampText, 10) / 2),
                            y: parseFloat(mod.y) - 12, size: 10, font: helveticaFont, color: rgb(0, 0, 1)
                        });
                    }
                } else if (type === 'text') {
                    if (mod.text_content) {
                        targetPage.drawText(mod.text_content, {
                            x: parseFloat(mod.x),
                            y: parseFloat(mod.y),
                            size: 16,
                            font: arabicFont,
                            color: rgb(1, 0, 0)
                        });
                    }
                }
            } catch (drawErr) {
                console.error("Error redrawing modification in unsign:", drawErr);
            }
        }

        // حفظ وحذف
        const modifiedPdfBytes = await pdfDoc.save();
        fs.writeFileSync(decentPdfPath, modifiedPdfBytes);

        for (const item of userModIdsByDbTable) {
            let conn;
            try {
                conn = item.db === 'Salary' ? await getConnection() : await getConnection2();
                const placeholders = item.ids.map((_, i) => `:id${i}`).join(',');
                const params = {};
                item.ids.forEach((id, i) => { params[`id${i}`] = id; });
                await conn.execute(`DELETE FROM ${item.table} WHERE ID IN (${placeholders})`, params);
                await conn.commit();
            } finally {
                if (conn) await conn.close().catch(() => { });
            }
        }

        return NextResponse.json({ success: true, message: "تم التراجع عن تعديلاتك بنجاح مع الحفاظ على توقيعات الآخرين" });

    } catch (error) {
        console.error("Critical Error in unsign:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}