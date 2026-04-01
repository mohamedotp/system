// const oracledb = require('oracledb');
// const XLSX = require('xlsx');
// const path = require('path');
// require('dotenv').config({ path: '.env.local' });

// async function resetAndImportExcel() {
//     let connection;
//     try {
//         oracledb.initOracleClient({ libDir: "C:\\oracle\\instantclient_19_25" });
//         connection = await oracledb.getConnection({
//             user: process.env.ORACLE_USER,
//             password: process.env.ORACLE_PASSWORD,
//             connectString: process.env.ORACLE_CONNECT_STRING
//         });

//         console.log("✅ Connected to Oracle.");

//         // 1. مسح كافة البيانات من الجدول
//         console.log("🗑️ Clearing all existing data from PRICES_TAB...");
//         await connection.execute("DELETE FROM PRICES_TAB", [], { autoCommit: true });
//         console.log("✅ Table cleared successfully.");

//         // 2. قراءة ملف الإكسل
//         const filePath = path.join(__dirname, 'TV_prices_2026_v1-1 (2) 3.csv اسعار المنافس.xlsx');
//         const workbook = XLSX.readFile(filePath);
//         const sheetName = workbook.SheetNames[0];
//         const worksheet = workbook.Sheets[sheetName];
//         const data = XLSX.utils.sheet_to_json(worksheet);

//         console.log(`📊 Found ${data.length} rows in Excel to import.`);

//         let nextId = 1;
//         const today = new Date();

//         // 3. إدخال البيانات من جديد
//         for (const row of data) {
//             const specs = {
//                 brand: row['brand'] || '',
//                 screenSize: parseFloat(row['screen_size_inch']) || 0,
//                 resolution: row['resolution'] || '',
//                 panelType: row['panel_type'] || '',
//                 refreshRate: parseInt(row['refresh_rate_hz']) || 0,
//                 osPlatform: row['os_platform'] || '',
//                 category: row['category'] || 'TV' // كما طلبت، لو مش موجود خليه TV
//             };

//             const prices = {
//                 price_egp: row['price_egp'] ? String(row['price_egp']) : null,
//                 price_carfoure: row['Carrfour'] ? String(row['Carrfour']) : null,
//                 price_2b: row['2B'] ? String(row['2B']) : null,
//                 price_btech: row['B Tech'] ? String(row['B Tech']) : null,
//                 price_amazon: row['Amazon'] ? String(row['Amazon']) : null,
//                 price_sales_cairo: row['Cairo Sales'] ? String(row['Cairo Sales']) : null,
//                 price_ranin: row['Ranin'] ? String(row['Ranin']) : null,
//                 price_raya: row['Raya'] ? String(row['Raya']) : null,
//                 price_rezkallah: row['Rezkallah'] ? String(row['Rezkallah']) : null,
//                 price_st_downtown: row['Downtown'] ? String(row['Downtown']) : null
//             };

//             const insertSql = `
//                 INSERT INTO PRICES_TAB 
//                 (BRAND, SCREEN_SIZE, RESILUTION, PANEL_TYPE, REFRESH_RATE_HZ, OS_PLATFORM, CATEGORY, 
//                  PRICE_EGB, PRICE_CARFOURE, PRICE_2B, PRICE_BTECH, PRICE_AMAZON, PRICE_SALES_CAIRO, 
//                  PRICE_RANIN, PRICE_RAYA, PRICE_REZKALLAH, PRICE_ST_DOWNTOWN, PRICE_DATE, ID,
//                  LAST_UPDATED_2B, LAST_UPDATED_BTECH, LAST_UPDATED_SALES_CAIRO, LAST_UPDATED_AMAZON, 
//                  LAST_UPDATED_ST_DOWNTOWN, LAST_UPDATED_CARFOURE, LAST_UPDATED_RANIN, LAST_UPDATED_RAYA, LAST_UPDATED_REZKALLAH) 
//                 VALUES 
//                 (:brand, :screenSize, :resolution, :panelType, :refreshRate, :osPlatform, :category,
//                  :price_egp, :price_carfoure, :price_2b, :price_btech, :price_amazon, :price_sales_cairo,
//                  :price_ranin, :price_raya, :price_rezkallah, :price_st_downtown, SYSDATE, :id,
//                  :last_updated, :last_updated, :last_updated, :last_updated, :last_updated, :last_updated, :last_updated, :last_updated, :last_updated)
//             `;

//             await connection.execute(insertSql, {
//                 ...specs,
//                 ...prices,
//                 id: nextId++,
//                 last_updated: today
//             }, { autoCommit: true });
//         }

//         console.log(`✨ Successfully imported ${nextId - 1} records. Table is now fresh!`);

//     } catch (err) {
//         console.error("🔥 Error during reset and import:", err);
//     } finally {
//         if (connection) await connection.close();
//     }
// }

// resetAndImportExcel();
