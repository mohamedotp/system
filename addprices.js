const oracledb = require("oracledb");

oracledb.initOracleClient({
    libDir: "C:\\oracle\\instantclient_19_25"
});

async function addNewColumns() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: "salary",
            password: "salary",
            connectString: "192.168.13.11:1521/orcl"
        });

        console.log("✅ Connected to database successfully!");
        console.log("Starting to add new columns to PRICES_TAB...\n");

        // 1. أولاً: إضافة أعمدة الأسعار
        console.log("📊 Adding price columns...");
        const priceColumns = [
            "price_2b NUMBER",
            "price_btech NUMBER",
            "price_sales_cairo NUMBER",
            "price_amazon NUMBER",
            "price_st_downtown NUMBER",
            "price_carfoure NUMBER"
        ];

        for (const column of priceColumns) {
            try {
                await conn.execute(`ALTER TABLE PRICES_TAB ADD (${column})`);
                console.log(`  ✅ Added: ${column}`);
            } catch (err) {
                if (err.message.includes("ORA-01430")) {
                    console.log(`  ⏭️  Column already exists: ${column.split(' ')[0]}`);
                } else {
                    throw err;
                }
            }
        }

        // 2. إضافة أعمدة تواريخ التحديث
        console.log("\n📅 Adding last updated columns...");
        const dateColumns = [
            "last_updated_2b DATE",
            "last_updated_btech DATE",
            "last_updated_sales_cairo DATE",
            "last_updated_amazon DATE",
            "last_updated_st_downtown DATE",
            "last_updated_carfoure DATE"
        ];

        for (const column of dateColumns) {
            try {
                await conn.execute(`ALTER TABLE PRICES_TAB ADD (${column})`);
                console.log(`  ✅ Added: ${column}`);
            } catch (err) {
                if (err.message.includes("ORA-01430")) {
                    console.log(`  ⏭️  Column already exists: ${column.split(' ')[0]}`);
                } else {
                    throw err;
                }
            }
        }

        // 3. إضافة عمود الفئة (category)
        console.log("\n🏷️ Adding category column...");
        try {
            await conn.execute(`ALTER TABLE PRICES_TAB ADD (category VARCHAR2(50))`);
            console.log(`  ✅ Added: category VARCHAR2(50)`);
            
            // تحديث الفئة الافتراضية للمنتجات الموجودة
            await conn.execute(
                `UPDATE PRICES_TAB SET category = 'TV' WHERE category IS NULL`,
                [],
                { autoCommit: true }
            );
            console.log(`  ✅ Set default category 'TV' for existing records`);
        } catch (err) {
            if (err.message.includes("ORA-01430")) {
                console.log(`  ⏭️  Category column already exists`);
            } else {
                throw err;
            }
        }

        // 4. التحقق من الأعمدة الجديدة
        console.log("\n🔍 Verifying new columns...");
        const result = await conn.execute(
            `SELECT column_name, data_type 
             FROM user_tab_columns 
             WHERE table_name = 'PRICES_TAB'
             ORDER BY column_id`
        );
        
        console.log("\n📋 Current columns in PRICES_TAB:");
        console.log("=================================");
        result.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row[0]} (${row[1]})`);
        });

       
        console.log("\n✨ All operations completed successfully!");

    } catch (err) {
        console.error("❌ ERROR:", err);
    } finally {
        if (conn) {
            await conn.close();
            console.log("\n🔌 Database connection closed.");
        }
    }
}

// تشغيل الدالة
addNewColumns();