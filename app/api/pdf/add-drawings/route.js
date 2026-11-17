import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { getConnection, getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";

export async function POST(request) {
    let connection;
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json(
                { success: false, error: "غير مصرح" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { filePath, docNo, drawings } = body;

        if (!filePath || !Array.isArray(drawings) || !drawings.length) {
            return NextResponse.json(
                { success: false, error: "المعاملات ناقصة أو لا توجد تحديدات" },
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

        // إنشاء نسخة احتياطية إذا لم تكن موجودة
        const backupPath = decentPdfPath.replace(/\.pdf$/i, "") + ".bak";
        if (!fs.existsSync(backupPath)) {
            fs.copyFileSync(decentPdfPath, backupPath);
        }

        const pdfBytes = fs.readFileSync(decentPdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        console.log(`Processing ${drawings.length} drawing/highlight layers for PDF: ${decentPdfPath}`);

        const modificationsToInsert = [];

        for (const item of drawings) {
            const { pageIndex, pngDataUrl } = item;
            if (!pngDataUrl || typeof pageIndex !== 'number') continue;

            const targetPage = pages[pageIndex];
            if (!targetPage) continue;

            // إزالة بادئة Data URL وتحويله إلى Buffer
            const base64Data = pngDataUrl.replace(/^data:image\/png;base64,/, "");
            const pngBuffer = Buffer.from(base64Data, "base64");

            // تضمين صورة الشفافية ورسمها على كامل الصفحة
            const pngImage = await pdfDoc.embedPng(pngBuffer);
            const { width: actualWidth, height: actualHeight } = targetPage.getSize();

            targetPage.drawImage(pngImage, {
                x: 0,
                y: 0,
                width: actualWidth,
                height: actualHeight,
            });

            modificationsToInsert.push({
                filePath: decentPdfPath,
                userEmpNum: session.empNum,
                type: 'highlight',
                textContent: 'تحديدات قلم ماركر',
                pageIndex: pageIndex,
                x: 0,
                y: 0,
                docNo: docNo || null
            });
        }

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

        console.log(`Successfully saved ${drawings.length} highlight layers to ${decentPdfPath}`);

        // تسجيل في قاعدة البيانات إن أمكن
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
                                 VALUES (:id, :filePath, :userEmpNum, 'highlight', :textContent, :pageIndex, :x, :y, :docNo, CURRENT_TIMESTAMP)`;

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
                console.error("Error inserting highlight modifications into database:", dbError);
            }
        }

        return NextResponse.json({
            success: true,
            count: drawings.length,
            message: `تم حفظ التحديدات بنجاح`
        });

    } catch (error) {
        console.error("Error adding highlights to PDF:", error);
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

