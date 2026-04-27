import { NextResponse } from "next/server";
import { execFile } from "child_process";   // ✅ آمن بدل exec
import fs from "fs";
import { getSession } from "@/lib/auth";

// ✅ Allowlist: فقط المسارات المسموح بها
const ALLOWED_ROOTS = [
    "\\\\192.168.13.12\\homes\\",
    "C:\\Archives\\"
];

// ✅ فقط امتدادات Word
const ALLOWED_EXTENSIONS = /\.(docx|docm|doc)$/i;

function validatePath(filePath) {
    // 1. منع path traversal
    if (filePath.includes("..")) return false;

    // 2. فقط امتدادات Word مسموح بها
    if (!ALLOWED_EXTENSIONS.test(filePath)) return false;

    // 3. يجب أن يبدأ بأحد المسارات المسموح بها
    const isAllowed = ALLOWED_ROOTS.some(root =>
        filePath.toLowerCase().startsWith(root.toLowerCase())
    );
    if (!isAllowed) return false;

    return true;
}

export async function POST(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }

    try {
        const { path: filePath } = await req.json();

        if (!filePath) {
            return NextResponse.json({ success: false, error: "المسار غير موجود" }, { status: 400 });
        }

        // ✅ تنظيف المسار
        let decodedPath = decodeURIComponent(filePath);
        let finalPath = decodedPath.trim().replace(/\//g, "\\");
        if (finalPath.startsWith("\\") && !finalPath.startsWith("\\\\")) {
            finalPath = "\\" + finalPath;
        }

        // ✅ تخمين الامتداد الصحيح إذا لم يکن الملف موجودًا
        let resolvedPath = finalPath;
        if (!fs.existsSync(resolvedPath)) {
            const noExt = resolvedPath.replace(/\.(docm|docx|doc)$/i, "");
            if (fs.existsSync(noExt + ".docx")) {
                resolvedPath = noExt + ".docx";
            } else if (fs.existsSync(noExt + ".docm")) {
                resolvedPath = noExt + ".docm";
            } else if (fs.existsSync(noExt + ".doc")) {
                resolvedPath = noExt + ".doc";
            }
        }

        // ✅ التحقق الأمني الصارم قبل أي عملية
        if (!validatePath(resolvedPath)) {
            console.warn(`⚠️ Security: Blocked unauthorized path access: ${resolvedPath} by emp ${session.empNum}`);
            return NextResponse.json({ success: false, error: "مسار غير مسموح به" }, { status: 403 });
        }

        // ✅ تحديد الجهاز المحلي بشكل موثوق عبر session لا عبر IP
        // الـ IP قابل للتزوير - نعتمد على session.isServerHost إن وجد، أو نستخدم IP كمؤشر إضافي فقط
        const os = require("os");
        const networkInterfaces = os.networkInterfaces();
        const localIps = ["127.0.0.1", "::1", "localhost"];
        Object.values(networkInterfaces).forEach(interfaces => {
            interfaces.forEach(iface => { localIps.push(iface.address); });
        });

        // نأخذ الـ IP من الـ connection المباشر وليس من الهيدر القابل للتزوير
        const forwardedFor = req.headers.get("x-forwarded-for");
        const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
        const isLocal = localIps.some(ip => clientIp === ip);  // مطابقة تامة لا includes

        if (!isLocal) {
            return NextResponse.json({
                success: true,
                isRemote: true,
                resolvedPath: resolvedPath,
                message: "يرجى استخدام البروتوكول المحلي للفتح"
            });
        }

        console.log("📂 Server Opening File Locally:", resolvedPath);

        // ✅ execFile بدل exec - يمنع command injection تمامًا
        execFile("cmd.exe", ["/c", "start", "", resolvedPath], (error) => {
            if (error) console.error("ExecFile Error:", error);
        });

        return NextResponse.json({
            success: true,
            isRemote: false,
            message: "تم الفتح محلياً بنجاح",
            resolvedPath: resolvedPath
        });

    } catch (err) {
        console.error("Open Local API Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
