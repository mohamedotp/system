import { NextResponse } from "next/server";
import { getConnection2 } from "@/lib/oracle";
import { getSession } from "@/lib/auth";
import fs from "fs";

// قائمة الأشخاص المصرح لهم بإغلاق الملفات (يمكن إضافة أو حذف أرقام الموظفين)
const AUTHORIZED_LOCKERS = [938, 181, 1714]; // أضف أرقام الموظفين المصرح لهم هنا

export async function POST(req) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: "غير مصرح بالوصول" }, { status: 401 });
    }

    // التحقق من أن المستخدم ضمن قائمة المصرح لهم بإغلاق الملفات (دعم النص والأرقام)
    const currentEmp = String(session.empNum || "").trim();
    const isAuthorized = AUTHORIZED_LOCKERS.some(id => String(id).trim() === currentEmp);

    console.log(`Lock Attempt by EMP: "${currentEmp}", Authorized: ${isAuthorized}`);

    if (!isAuthorized) {
        return NextResponse.json({ success: false, error: `ليس لديك صلاحية إغلاق الملفات (كود الموظف: ${currentEmp})` }, { status: 403 });
    }

    let connection;
    try {
        let docNo;
        try {
            const body = await req.json();
            docNo = body.docNo;
        } catch (parseErr) {
            return NextResponse.json({ success: false, error: "فشل في قراءة بيانات الطلب (JSON Error)" }, { status: 400 });
        }

        if (!docNo) {
            return NextResponse.json({ success: false, error: "رقم المكاتبة مطلوب" }, { status: 400 });
        }

        connection = await getConnection2();

        // 1. جلب مسار الملفات (الأساسي والمرفقات)
        const result = await connection.execute(
            `SELECT FILE_NAME, FILE_ATTACH FROM DOC_DATA_NEW WHERE DOC_NO = :docNo`,
            { docNo }
        );

        if (!result.rows || result.rows.length === 0) {
            return NextResponse.json({ success: false, error: "المكاتبة غير موجودة في بيانات الملفات (DOC_DATA_NEW)" }, { status: 404 });
        }

        const row = result.rows[0];

        const preparePath = (p) => {
            if (!p) return null;
            let finalPath = p.trim().replace(/\//g, "\\");
            const lowerPath = finalPath.toLowerCase();
            const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp"];
            if (!lowerPath.endsWith(".pdf") && !lowerPath.endsWith(".docm") && !imageExtensions.some(ext => lowerPath.endsWith(ext))) {
                finalPath += ".pdf";
            }
            return finalPath;
        };

        const filesToLock = [];
        const rawMainFile = row.FILE_NAME || row[0];
        const rawAttachments = row.FILE_ATTACH || row[1];

        if (rawMainFile) {
            const p = preparePath(rawMainFile);
            if (p) filesToLock.push(p);
        }

        if (rawAttachments && typeof rawAttachments === 'string') {
            rawAttachments.split('|').forEach(p => {
                const prepared = preparePath(p);
                if (prepared) filesToLock.push(prepared);
            });
        }

        console.log(`Locking Request for Doc: ${docNo}. Files to process:`, filesToLock);

        // 2. محاولة جعل الملفات للقراءة فقط على نظام التشغيل
        const lockedFiles = [];
        const failedFiles = [];
        const notFoundFiles = [];

        const { execSync } = require("child_process");

        for (const filePath of filesToLock) {
            try {
                if (fs.existsSync(filePath)) {
                    // استخدام attrib +r لمنع التعديل في ويندوز بشكل جذري
                    // +r تجعل الملف للقراءة فقط
                    try {
                        execSync(`attrib +r "${filePath}"`);
                        console.log(`Successfully applied attrib +r to: ${filePath}`);
                    } catch (attribErr) {
                        console.error(`Attrib command failed for ${filePath}, falling back to chmod:`, attribErr);
                        fs.chmodSync(filePath, 0o444);
                    }
                    lockedFiles.push(filePath);
                } else {
                    console.warn(`File not found, skipping lock: ${filePath}`);
                    notFoundFiles.push(filePath);
                }
            } catch (err) {
                console.error(`Failed to lock file ${filePath}:`, err);
                failedFiles.push(filePath);
            }
        }

        // 3. تحديث حالة المكاتبة في قاعدة البيانات (FLAG = 2 تعني مغلقة)
        await connection.execute(
            `UPDATE DOC_DATA_NEW SET FLAG = 2 WHERE DOC_NO = :docNo`,
            { docNo },
            { autoCommit: true }
        );

        if (lockedFiles.length === 0 && filesToLock.length > 0) {
            return NextResponse.json({
                success: false,
                error: "لم يتم العثور على الملفات الفعلية على السيرفر لإغلاقها. تأكد من صحة المسارات.",
                details: { notFound: notFoundFiles }
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: "تم إغلاق المكاتبة ومنع التعديل بنجاح",
            lockedCount: lockedFiles.length,
            notFoundCount: notFoundFiles.length,
            errors: failedFiles.length > 0 ? failedFiles : null
        });

    } catch (err) {
        console.error("Lock API Error:", err);
        return NextResponse.json({
            success: false,
            error: "حدث خطأ في النظام أثناء إغلاق الملف: " + (err.message || "Unknown error")
        }, { status: 500 });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (e) {
                console.error("Error closing oracle connection:", e);
            }
        }
    }
}

export const dynamic = "force-dynamic";
