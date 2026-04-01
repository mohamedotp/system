import oracledb from "oracledb";
import XLSX from "xlsx";
import path from "path";
import os from "os";

// =============================================
//  إعداد Oracle Thick Mode
// =============================================
try {
    oracledb.initOracleClient({ libDir: "C:\\oracle\\instantclient_19_25" });
    console.log("✅ Oracle Thick Mode initialized");
} catch (err) {
    if (!err.message.includes("already initialized")) {
        console.error("❌ Oracle init error:", err.message);
        process.exit(1);
    }
}

const DB_CONFIG = {
    user: "doc",
    password: "doc",
    connectString: "192.168.13.11:1521/orcl"
};

async function exportUsersToExcel() {
    let connection;
    try {
        console.log("🔌 Connecting to database...");
        connection = await oracledb.getConnection(DB_CONFIG);
        console.log("✅ Connected!\n");

        // =============================================
        //  استعلام: كل الموظفين الذين لديهم حركة في النظام
        // =============================================
        const query = `
            SELECT 
                e.EMP_NUM   AS "رقم الملف",
                e.EMP_NAME  AS "الاسم",
                e.SEC_N     AS "الإدارة / القسم",
                (SELECT COUNT(*) FROM DOC_DATA_NEW d WHERE d.PLACE_C = e.EMP_NUM) AS "إجمالي المكاتبات المنشأة"
            FROM EMP_DOC e
            WHERE EXISTS (
                SELECT 1 FROM RECIP_GEHA_NEW r
                WHERE r.GEHA_C = e.EMP_NUM
                   OR r.PLACE_C = e.EMP_NUM
            )
            ORDER BY "إجمالي المكاتبات المنشأة" DESC, e.EMP_NUM
        `;

        console.log("📊 Fetching users data...");
        const result = await connection.execute(query, {}, { maxRows: 100000 });

        const columns = result.metaData.map(col => col.name);
        const rows = result.rows.map(row => {
            const obj = {};
            row.forEach((val, idx) => { obj[columns[idx]] = val; });
            return obj;
        });

        console.log(`✅ Found ${rows.length} users\n`);

        // =============================================
        //  إنشاء ملف Excel
        // =============================================
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows, {
            header: ["رقم الملف", "الاسم", "الإدارة / القسم", "إجمالي المكاتبات المنشأة"]
        });

        // ضبط عرض الأعمدة
        ws["!cols"] = [
            { wch: 14 },   // رقم الملف
            { wch: 30 },   // الاسم
            { wch: 30 },   // القسم
            { wch: 20 },   // عدد المكاتبات
        ];

        // تأكيد اتجاه الإكسل من اليمين لليسار
        if (!ws["!sheetView"]) ws["!sheetView"] = [{}];
        ws["!sheetView"] = [{ rightToLeft: true }];

        XLSX.utils.book_append_sheet(wb, ws, "مستخدمو النظام");

        // حفظ الملف على سطح المكتب
        const desktopPath = path.join(os.homedir(), "Desktop");
        const fileName = `مستخدمو_نظام_المكاتبات_${new Date().toISOString().slice(0,10)}.xlsx`;
        const fullPath = path.join(desktopPath, fileName);

        XLSX.writeFile(wb, fullPath);
        console.log(`\n🎉 تم إنشاء الملف بنجاح!`);
        console.log(`📁 المسار: ${fullPath}`);
        console.log(`📊 إجمالي المستخدمين: ${rows.length} موظف`);

    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.close();
            console.log("\n🔌 Connection closed.");
        }
    }
}

exportUsersToExcel();
