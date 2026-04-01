import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";

export async function GET(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
        return NextResponse.json({ error: "المسار غير موجود" }, { status: 400 });
    }

    try {
        // التحقق من وجود الملف
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: "الملف غير موجود على السيرفر حالياً" }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
                "Content-Type": "application/vnd.ms-word.document.macroEnabled.12", // صيغة .docm
            },
        });
    } catch (err) {
        console.error("Download API Error:", err);
        return NextResponse.json({ error: "فشل في الوصول للملف" }, { status: 500 });
    }
}
