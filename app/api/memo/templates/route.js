import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

const TEMPLATE_DIR = `\\\\192.168.13.12\\homes\\TAMPLET`;
const EMPTY_DOC_PATH = path.join(TEMPLATE_DIR, "EMPTY_DOC_WEB.docm"); // الملف الفارغ الجاهز

export async function GET(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

    let connection;
    try {
        connection = await getConnection2();

        // 1. Fetch DB Records
        const result = await connection.execute(`SELECT DOC_KIND, DOC_DESC_A, DOC_DESC FROM DOC_KIND ORDER BY DOC_DESC_A`);
        const dbKinds = result.rows.map(row => ({
            id: row[0],
            nameAr: row[1],
            nameEn: row[2]
        }));

        // 2. Fetch Files from Folder (نستثني EMPTY_DOC_WEB من الظهور في القائمة)
        let files = [];
        if (fs.existsSync(TEMPLATE_DIR)) {
            files = fs.readdirSync(TEMPLATE_DIR)
                .filter(file => {
                    const lower = file.toLowerCase();
                    return lower.endsWith(".docm") &&
                        lower !== "empty_doc_web.docm" && // نخفي الملف الفارغ من القائمة
                        lower !== "blank_template.docm";   // لو عندك قالب تاني نخفيه
                })
                .map(file => ({
                    fileName: file,
                    pureName: file.replace(/\.docm$/i, ""),
                    path: path.join(TEMPLATE_DIR, file)
                }));
        }

        return NextResponse.json({
            success: true,
            dbKinds,
            files
        });

    } catch (err) {
        console.error("Templates API Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export async function POST(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });

    let connection;
    try {
        const formData = await req.formData();
        const nameAr = formData.get("nameAr");
        const nameEn = formData.get("nameEn");
        const sourceFile = formData.get("sourceFile");
        const uploadedFile = formData.get("file");

        if (!nameAr || !nameEn) {
            return NextResponse.json({ success: false, error: "يجب إدخال الاسم بالعربي والإنجليزي" }, { status: 400 });
        }

        connection = await getConnection2();

        // 1. Generate Next ID
        const idResult = await connection.execute(`SELECT COALESCE(MAX(DOC_KIND), 0) + 1 FROM DOC_KIND`);
        const nextId = idResult.rows[0][0];

        // 2. Insert into DB
        await connection.execute(
            `INSERT INTO DOC_KIND (DOC_KIND, DOC_DESC_A, DOC_DESC) VALUES (:id, :nameAr, :nameEn)`,
            { id: nextId, nameAr, nameEn },
            { autoCommit: true }
        );

        // 3. File Operation
        const targetPath = path.join(TEMPLATE_DIR, `${nameEn}.docm`);

        if (!fs.existsSync(TEMPLATE_DIR)) {
            fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
        }

        if (sourceFile === "UPLOAD" && uploadedFile) {
            // رفع ملف من الجهاز
            const buffer = Buffer.from(await uploadedFile.arrayBuffer());
            fs.writeFileSync(targetPath, buffer);

        } else if (sourceFile && sourceFile !== "BLANK" && sourceFile !== "UPLOAD") {
            // نسخ من قالب موجود
            const sourcePath = path.join(TEMPLATE_DIR, sourceFile);
            if (fs.existsSync(sourcePath)) {
                let copied = false;
                let attempts = 0;
                while (!copied && attempts < 3) {
                    try {
                        fs.copyFileSync(sourcePath, targetPath);
                        copied = true;
                    } catch (copyErr) {
                        attempts++;
                        if (copyErr.code === 'EBUSY' && attempts < 3) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        } else {
                            throw copyErr;
                        }
                    }
                }
            } else {
                return NextResponse.json({ success: false, error: "القالب المصدر غير موجود" }, { status: 400 });
            }

        } else if (sourceFile === "BLANK") {
            // ============================================
            // نسخ من الملف الفارغ الجاهز
            // ============================================

            if (!fs.existsSync(EMPTY_DOC_PATH)) {
                return NextResponse.json({
                    success: false,
                    error: `الملف الفارغ غير موجود في المسار: ${EMPTY_DOC_PATH}. يرجى التأكد من وجود ملف EMPTY_DOC_WEB.docm`
                }, { status: 500 });
            }

            let copied = false;
            let attempts = 0;
            while (!copied && attempts < 3) {
                try {
                    fs.copyFileSync(EMPTY_DOC_PATH, targetPath);
                    copied = true;
                } catch (copyErr) {
                    attempts++;
                    if (copyErr.code === 'EBUSY' && attempts < 3) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else {
                        throw copyErr;
                    }
                }
            }

        } else {
            return NextResponse.json({ success: false, error: "مصدر غير معروف" }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            id: nextId,
            path: targetPath,
            message: "تم إنشاء النوع الجديد وتجهيز القالب"
        });

    } catch (err) {
        console.error("Create Template API Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export async function DELETE(req) {
    const session = await getSession();
    const authorizedUsers = [181, 938, 1714];
    if (!session || !authorizedUsers.includes(parseInt(session.empNum))) {
        return NextResponse.json({ success: false, error: "غير مصرح لك بالحذف" }, { status: 403 });
    }

    let connection;
    try {
        const { id, fileName } = await req.json();

        if (!id || !fileName) {
            return NextResponse.json({ success: false, error: "بيانات ناقصة للحذف" }, { status: 400 });
        }

        connection = await getConnection2();

        // Delete from DB
        await connection.execute(
            `DELETE FROM DOC_KIND WHERE DOC_KIND = :id`,
            { id },
            { autoCommit: true }
        );

        // Delete from Disk
        const filePath = path.join(TEMPLATE_DIR, fileName.toLowerCase().endsWith(".docm") ? fileName : `${fileName}.docm`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return NextResponse.json({ success: true, message: "تم حذف النوع والقالب بنجاح" });

    } catch (err) {
        console.error("Delete Template API Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export const dynamic = "force-dynamic";