import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
        return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    try {
        let normalizedPath = filePath.replace(/\//g, "\\");
        if (normalizedPath.startsWith("\\") && !normalizedPath.startsWith("\\\\")) {
            normalizedPath = "\\" + normalizedPath;
        }

        let finalPath = normalizedPath;
        const extensions = ['', '.pdf', '.jpg', '.png', '.jpeg', '.bmp', '.gif'];
        let found = false;

        for (const ext of extensions) {
            if (fs.existsSync(finalPath + ext)) {
                finalPath += ext;
                found = true;
                break;
            }
        }

        if (!found) {
            return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(finalPath);
        const fileName = path.basename(finalPath);
        const lowerExt = path.extname(finalPath).toLowerCase();

        let contentType = "application/octet-stream";
        if (lowerExt === ".pdf") contentType = "application/pdf";
        else if (lowerExt === ".jpg" || lowerExt === ".jpeg") contentType = "image/jpeg";
        else if (lowerExt === ".png") contentType = "image/png";
        else if (lowerExt === ".gif") contentType = "image/gif";
        else if (lowerExt === ".bmp") contentType = "image/bmp";

        return new Response(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
            },
        });

    } catch (error) {
        return NextResponse.json({ error: "خطأ في جلب الملف" }, { status: 500 });
    }
}
