import { NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import { getSession } from "@/lib/auth";

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

        // تحديد ما إذا كان الطلب قادماً من نفس الجهاز (السيرفر)
        const clientIp = req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";

        // جلب جميع الآي بي الخاص بالجهاز الحالي
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        const localIps = ['127.0.0.1', '::1', 'localhost'];

        Object.values(networkInterfaces).forEach(interfaces => {
            interfaces.forEach(iface => {
                localIps.push(iface.address);
            });
        });

        const isLocal = localIps.some(ip => clientIp.includes(ip));

        // فك تشفير المسار
        let decodedPath = decodeURIComponent(filePath);

        let finalPath = decodedPath.trim().replace(/\//g, "\\");
        if (finalPath.startsWith("\\") && !finalPath.startsWith("\\\\")) {
            finalPath = "\\" + finalPath;
        }

        // ذكاء اصطناعي لتخمين الامتداد الصحيح إذا لم يكن الملف موجوداً كمسار مجرد أو كان بدون امتداد
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

        if (!isLocal) {
            // هامه: إذا كان المستخدم يفتح من جهاز بعيد، نخبره بأن عليه استخدام البروتوكول المحلي
            return NextResponse.json({
                success: true,
                isRemote: true,
                resolvedPath: resolvedPath,
                message: "يرجى استخدام البروتوكول المحلي للفتح"
            });
        }

        console.log("📂 Server Opening File Locally for Host:", resolvedPath);

        exec(`start "" "${resolvedPath}"`, (error) => {
            if (error) console.error("Exec Error:", error);
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
