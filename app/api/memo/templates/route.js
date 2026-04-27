import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";
import util from "util";
import { exec } from "child_process";
import os from "os";

const execPromise = util.promisify(exec);
const TEMPLATE_DIR = `\\\\192.168.13.12\\homes\\TAMPLET`;
const EMPTY_DOC_PATH = path.join(TEMPLATE_DIR, "EMPTY_DOC_WEB.docm"); // للمحافظة على التوافقية لو احتجناه

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
                    const validExt = lower.endsWith(".docm") || lower.endsWith(".docx") || lower.endsWith(".doc");
                    return validExt &&
                        lower !== "empty_doc_web.docm" && // نخفي الملف الفارغ من القائمة
                        lower !== "blank_template.docm";   // لو عندك قالب تاني نخفيه
                })
                .map(file => {
                    const ext = path.extname(file);
                    return {
                        fileName: file,
                        pureName: file.replace(new RegExp(`${ext}$`, "i"), ""),
                        path: path.join(TEMPLATE_DIR, file)
                    };
                });
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
        const nameEnRaw = formData.get("nameEn");
        const sourceFile = formData.get("sourceFile");
        const uploadedFile = formData.get("file");

        if (!nameAr || !nameEnRaw) {
            return NextResponse.json({ success: false, error: "يجب إدخال الاسم بالعربي والإنجليزي" }, { status: 400 });
        }

        // ✅ تنظيف nameEn: نمنع أي حرف خطر يمكن استخدامه لـ injection أو path traversal
        const nameEn = nameEnRaw.trim()
            .replace(/[^a-zA-Z0-9_\-\u0600-\u06FF ]/g, "") // فقط حروف وأرقام وعربي وشرطة
            .replace(/\.\.+/g, "")                          // منع ..
            .trim();

        if (!nameEn) {
            return NextResponse.json({ success: false, error: "الاسم الإنجليزي يحتوي على أحرف غير مسموح بها" }, { status: 400 });
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

        let finalTargetPath = "";

        if (sourceFile === "UPLOAD" && uploadedFile) {
            // رفع ملف من الجهاز
            const ext = path.extname(uploadedFile.name) || ".docx";
            finalTargetPath = path.join(TEMPLATE_DIR, `${nameEn}${ext}`);
            const buffer = Buffer.from(await uploadedFile.arrayBuffer());
            fs.writeFileSync(finalTargetPath, buffer);

        } else if (sourceFile && sourceFile !== "BLANK" && sourceFile !== "UPLOAD") {
            // نسخ من قالب موجود
            // ✅ نستخدم basename فقط لمنع traversal مثل: ../../Windows/System32/cmd.exe
            const safeSourceFile = path.basename(sourceFile);
            const sourcePath = path.join(TEMPLATE_DIR, safeSourceFile);

            // ✅ التأكد أن المصدر داخل TEMPLATE_DIR فقط
            if (!path.resolve(sourcePath).startsWith(path.resolve(TEMPLATE_DIR))) {
                return NextResponse.json({ success: false, error: "مسار القالب المصدر غير مسموح به" }, { status: 403 });
            }

            const ext = path.extname(safeSourceFile) || ".docx";
            if (!/^\.(docx|docm|doc)$/i.test(ext)) {
                return NextResponse.json({ success: false, error: "نوع القالب المصدر غير مسموح" }, { status: 400 });
            }

            finalTargetPath = path.join(TEMPLATE_DIR, `${nameEn}${ext}`);

            if (fs.existsSync(sourcePath)) {
                let copied = false;
                let attempts = 0;
                while (!copied && attempts < 3) {
                    try {
                        fs.copyFileSync(sourcePath, finalTargetPath);
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

            finalTargetPath = path.join(TEMPLATE_DIR, `${nameEn}.docx`);

            // ✅ التأكد أن المسار النهائي داخل TEMPLATE_DIR فقط
            if (!path.resolve(finalTargetPath).startsWith(path.resolve(TEMPLATE_DIR))) {
                return NextResponse.json({ success: false, error: "مسار غير مسموح به" }, { status: 403 });
            }

            // ✅ كتابة المسار في ملف PS1 مؤقت بدل تضمينه في الأمر مباشرة
            // هذا يمنع PowerShell injection لأن finalTargetPath لا يظهر كـ command
            const escapedPath = finalTargetPath.replace(/'/g, "''"); // escape single quotes لـ PS
            const psScript = [
                `$targetPath = '${escapedPath}'`,
                `$word = New-Object -ComObject Word.Application`,
                `$word.Visible = $false`,
                `$word.DisplayAlerts = 0`,
                `try {`,
                `    $doc = $word.Documents.Add()`,
                `    $doc.SaveAs([ref]$targetPath, [ref]12)`,
                `    $doc.Close(0)`,
                `} catch {`,
                `    Write-Error $_.Exception.Message`,
                `    exit 1`,
                `} finally {`,
                `    $word.Quit()`,
                `    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null`,
                `    [GC]::Collect()`,
                `    [GC]::WaitForPendingFinalizers()`,
                `}`
            ].join("\n");

            const tempPs = path.join(os.tmpdir(), `create_blank_${Date.now()}.ps1`);
            fs.writeFileSync(tempPs, psScript, { encoding: 'utf8' });
            // ✅ execFile بدل execPromise لمنع shell injection في اسم الملف المؤقت
            await new Promise((resolve, reject) => {
                const { execFile: execFileFn } = require("child_process");
                execFileFn("powershell.exe", ["-ExecutionPolicy", "Bypass", "-File", tempPs], (err) => {
                    if (fs.existsSync(tempPs)) fs.unlinkSync(tempPs);
                    err ? reject(err) : resolve();
                });
            });

            if (!fs.existsSync(finalTargetPath)) {
                return NextResponse.json({
                    success: false,
                    error: "حدث خطأ أثناء محاولة إنشاء ملف الوورد الجديد عبر PowerShell."
                }, { status: 500 });
            }

        } else {
            return NextResponse.json({ success: false, error: "مصدر غير معروف" }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            id: nextId,
            path: finalTargetPath,
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

        // ✅ Delete from Disk - تأمين ضد path traversal
        const extensions = [".docm", ".docx", ".doc"];
        
        // path.basename يضمن أننا نأخذ اسم الملف فقط بدون أي مسار
        let baseName = path.basename(fileName);
        extensions.forEach(ext => {
            if (baseName.toLowerCase().endsWith(ext)) {
                baseName = baseName.slice(0, -ext.length);
            }
        });

        extensions.forEach(ext => {
            const filePath = path.join(TEMPLATE_DIR, `${baseName}${ext}`);
            // ✅ التأكد من أن المسار داخل TEMPLATE_DIR فقط قبل الحذف
            if (!path.resolve(filePath).startsWith(path.resolve(TEMPLATE_DIR))) {
                console.warn(`⚠️ Security: Blocked delete outside TEMPLATE_DIR: ${filePath}`);
                return;
            }
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        return NextResponse.json({ success: true, message: "تم حذف النوع والقالب بنجاح" });

    } catch (err) {
        console.error("Delete Template API Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) await connection.close();
    }
}

export const dynamic = "force-dynamic";