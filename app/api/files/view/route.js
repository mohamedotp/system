import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from 'stream';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
        return new NextResponse("Missing 'path' parameter", { status: 400 });
    }

    try {
        // Decode the path if it was encoded
        let decentPath = decodeURIComponent(filePath);

        // التحقق من أن الملف موجود
        if (!fs.existsSync(decentPath)) {
            // محاولة إضافة .pdf كحل احتياطي
            if (!decentPath.toLowerCase().endsWith(".pdf")) {
                const pdfPath = decentPath + ".pdf";
                if (fs.existsSync(pdfPath)) {
                    decentPath = pdfPath;
                } else {
                    console.error(`File not found: ${decentPath} (and fallback ${pdfPath} failed)`);
                    return new NextResponse("File not found", { status: 404 });
                }
            } else {
                console.error(`File not found: ${decentPath}`);
                return new NextResponse("File not found", { status: 404 });
            }
        }

        // قراءة الملف كـ stream لتجنب تحميل ملفات كبيرة في الذاكرة
        const stats = fs.statSync(decentPath);
        const stream = fs.createReadStream(decentPath);

        // تحويل Node.js Readable stream إلى Web ReadableStream
        const webStream = new ReadableStream({
            start(controller) {
                stream.on('data', chunk => controller.enqueue(chunk));
                stream.on('end', () => controller.close());
                stream.on('error', err => controller.error(err));
            }
        });

        // تحديد نوع المحتوى بناءً على الامتداد
        const ext = path.extname(decentPath).toLowerCase();
        let contentType = 'application/octet-stream';

        if (ext === '.pdf') contentType = 'application/pdf';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';

        return new NextResponse(webStream, {
            headers: {
                "Content-Type": contentType,
                "Content-Length": stats.size,
                // "Content-Disposition": `inline; filename="${path.basename(decentPath)}"` // للعرض داخل المتصفح
            },
        });

    } catch (error) {
        console.error("Error reading file:", error);
        return new NextResponse("Error reading file", { status: 500 });
    }
}
