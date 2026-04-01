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

        if (!isLocal) {
            // هامه: إذا كان المستخدم يفتح من جهاز بعيد، نخبره بأن عليه استخدام البروتوكول المحلي
            return NextResponse.json({
                success: true,
                isRemote: true,
                message: "يرجى استخدام البروتوكول المحلي للفتح"
            });
        }

        // فك تشفير المسار
        let decodedPath = decodeURIComponent(filePath);

        let finalPath = decodedPath.trim().replace(/\//g, "\\");
        if (finalPath.startsWith("\\") && !finalPath.startsWith("\\\\")) {
            finalPath = "\\" + finalPath;
        }

        console.log("📂 Server Opening File Locally for Host:", finalPath);

        exec(`start "" "${finalPath}"`, (error) => {
            if (error) console.error("Exec Error:", error);
        });

        return NextResponse.json({ success: true, isRemote: false, message: "تم الفتح محلياً بنجاح" });

    } catch (err) {
        console.error("Open Local API Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
