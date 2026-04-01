import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// مسار المجلد الشبكي الثابت
const SIGNATURES_DIR = "\\\\192.168.13.11\\it_dep\\sign";

// GET - التحقق من وجود تواقيع للموظف
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const empNum = searchParams.get("empNum");

    if (!empNum) {
        return NextResponse.json({ success: false, error: "رقم الموظف مطلوب" });
    }

    try {
        console.log("🔍 Checking signatures directory:", SIGNATURES_DIR);
        console.log("👤 Employee number:", empNum);

        if (!fs.existsSync(SIGNATURES_DIR)) {
            console.error("❌ Directory does not exist or is not accessible:", SIGNATURES_DIR);
            console.error("💡 Please check:");
            console.error("   1. Network path is correct");
            console.error("   2. Server has permissions to access the network folder");
            console.error("   3. Network folder is mounted/accessible from this machine");
            return NextResponse.json({ success: false, error: "المجلد الشبكي غير متاح" });
        }

        console.log("✅ Directory exists, reading files...");
        // قراءة كل الملفات في المجلد والبحث عن الملفات التي تبدأ برقم الموظف
        const files = fs.readdirSync(SIGNATURES_DIR);
        console.log(`📁 Found ${files.length} total files in directory`);

        const extensions = ['.png', '.jpg', '.jpeg'];

        const signatures = files
            .filter(file => {
                const fileName = file.toLowerCase();
                const fileExt = path.extname(fileName);
                // ملف يبدأ برقم الموظف (سواء 1714 أو 1714_1) وله امتداد صورة
                return (fileName.startsWith(empNum.toLowerCase()) && extensions.includes(fileExt));
            })
            .map(file => ({
                fileName: file,
                filePath: path.join(SIGNATURES_DIR, file)
            }));

        console.log(`🎯 Found ${signatures.length} signatures for employee ${empNum}`);

        if (signatures.length > 0) {
            console.log("📋 Signature files:", signatures.map(s => s.fileName));
            return NextResponse.json({
                success: true,
                signatures: signatures.map(sig => ({
                    EMP_NUM: empNum,
                    SIGNATURE_PATH: sig.filePath,
                    FILE_NAME: sig.fileName
                }))
            });
        } else {
            console.warn(`⚠️ No signature files found for employee ${empNum}`);
            return NextResponse.json({ success: false, error: "لا توجد تواقيع لهذا الموظف" });
        }

    } catch (error) {
        console.error("❌ Error checking signatures:", error);
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
