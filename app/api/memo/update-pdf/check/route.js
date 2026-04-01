import { NextResponse } from "next/server";
import fs from "fs";
import { getSession } from "@/lib/auth";
import { getConnection2 } from "@/lib/oracle";

export async function GET(req) {
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const docNo = searchParams.get("docNo");

    if (!docNo) return NextResponse.json({ success: false, error: "Missing docNo" }, { status: 400 });

    let connection;
    try {
        connection = await getConnection2();
        const res = await connection.execute(
            `SELECT FILE_NAME FROM DOC_DATA_NEW WHERE DOC_NO = :docNo`,
            { docNo }
        );

        if (res.rows.length === 0) return NextResponse.json({ success: false, error: "Not found" });

        const basePath = res.rows[0][0];
        if (!basePath) return NextResponse.json({ success: false });

        let wordMtime = 0;
        let pdfMtime = 0;

        // Check Word
        const wordExtensions = [".docm", ".docx"];
        for (const ext of wordExtensions) {
            const p = basePath + ext;
            if (fs.existsSync(p)) {
                wordMtime = fs.statSync(p).mtimeMs;
                break;
            }
        }

        // Check PDF
        const pdfPath = basePath + ".pdf";
        if (fs.existsSync(pdfPath)) {
            pdfMtime = fs.statSync(pdfPath).mtimeMs;
        }

        return NextResponse.json({ success: true, wordMtime, pdfMtime });

    } catch (err) {
        return NextResponse.json({ success: false, error: err.message });
    } finally {
        if (connection) await connection.close();
    }
}
