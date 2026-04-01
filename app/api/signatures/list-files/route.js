import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
    const directoryPath = "\\\\192.168.13.11\\it_dep\\sign";

    try {
        if (!fs.existsSync(directoryPath)) {
            return NextResponse.json({ success: false, error: "المجلد غير موجود أو لا يمكن الوصول إليه" });
        }

        const files = fs.readdirSync(directoryPath);

        // تصفية الملفات لتشمل الصور فقط
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.png', '.jpg', '.jpeg'].includes(ext);
        });

        // إضافة المسار الكامل لكل ملف
        const fileList = imageFiles.map(file => ({
            name: file,
            fullPath: path.join(directoryPath, file)
        }));

        return NextResponse.json({ success: true, files: fileList });

    } catch (error) {
        console.error("Error reading directory:", error);
        return NextResponse.json({ success: false, error: error.message });
    }
}
