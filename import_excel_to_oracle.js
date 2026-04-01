// import oracledb from 'oracledb';
// import XLSX from 'xlsx';
// import path from 'path';
// require('dotenv').config({ path: '.env.local' });

// async function importExcel() {
//     let connection;
//     try {
//         oracledb.initOracleClient({ libDir: "C:\\oracle\\instantclient_19_25" });
//         connection = await oracledb.getConnection({
//             user: process.env.ORACLE_USER,
//             password: process.env.ORACLE_PASSWORD,
//             connectString: process.env.ORACLE_CONNECT_STRING
//         });

//         console.log("✅ Connected to Oracle.");

//         const filePath = path.join(__dirname, 'TV_prices_2026_v1-1 (2) 3.csv اسعار المنافس.xlsx');
//         const workbook = XLSX.readFile(filePath);
//         const sheetName = workbook.SheetNames[0];
//         const worksheet = workbook.Sheets[sheetName];

//         // Convert to JSON objects with actual headers
//         const data = XLSX.utils.sheet_to_json(worksheet);

//         console.log(`📊 Found ${data.length} rows in Excel.`);

//         // Get current Max ID
//         const maxIdRes = await connection.execute("SELECT MAX(ID) FROM PRICES_TAB");
//         let nextId = (maxIdRes.rows[0][0] || 0) + 1;

//         const today = new Date();
//         const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD

//         for (const row of data) {
//             // Mapping
//             const specs = {
//                 brand: row['brand'] || '',
//                 screenSize: parseFloat(row['screen_size_inch']) || 0,
//                 resolution: row['resolution'] || '',
//                 panelType: row['panel_type'] || '',
//                 refreshRate: parseInt(row['refresh_rate_hz']) || 0,
//                 osPlatform: row['os_platform'] || '',
//                 category: row['category'] || 'TV' // Default to TV as requested
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

//             // Check if product exists
//             const checkSql = `
//                 SELECT ID FROM PRICES_TAB 
//                 WHERE BRAND = :brand 
//                 AND SCREEN_SIZE = :screenSize 
//                 AND RESILUTION = :resolution 
//                 AND PANEL_TYPE = :panelType 
//                 AND REFRESH_RATE_HZ = :refreshRate
//                 AND OS_PLATFORM = :osPlatform
//                 AND CATEGORY = :category
//             `;

//             const checkRes = await connection.execute(checkSql, specs);

//             if (checkRes.rows.length > 0) {
//                 // UPDATE
//                 const id = checkRes.rows[0][0];
//                 const updateSql = `
//                     UPDATE PRICES_TAB SET 
//                         PRICE_EGB = :price_egp,
//                         PRICE_CARFOURE = :price_carfoure,
//                         PRICE_2B = :price_2b,
//                         PRICE_BTECH = :price_btech,
//                         PRICE_AMAZON = :price_amazon,
//                         PRICE_SALES_CAIRO = :price_sales_cairo,
//                         PRICE_RANIN = :price_ranin,
//                         PRICE_RAYA = :price_raya,
//                         PRICE_REZKALLAH = :price_rezkallah,
//                         PRICE_ST_DOWNTOWN = :price_st_downtown,
//                         PRICE_DATE = SYSDATE,
//                         LAST_UPDATED_2B = :last_updated,
//                         LAST_UPDATED_BTECH = :last_updated,
//                         LAST_UPDATED_SALES_CAIRO = :last_updated,
//                         LAST_UPDATED_AMAZON = :last_updated,
//                         LAST_UPDATED_ST_DOWNTOWN = :last_updated,
//                         LAST_UPDATED_CARFOURE = :last_updated,
//                         LAST_UPDATED_RANIN = :last_updated,
//                         LAST_UPDATED_RAYA = :last_updated,
//                         LAST_UPDATED_REZKALLAH = :last_updated
//                     WHERE ID = :id
//                 `;
//                 await connection.execute(updateSql, { ...prices, id, last_updated: today }, { autoCommit: true });
//                 console.log(`✅ Updated product ID ${id}: ${specs.brand} ${specs.screenSize}"`);
//             } else {
//                 // INSERT
//                 const insertSql = `
//                     INSERT INTO PRICES_TAB 
//                     (BRAND, SCREEN_SIZE, RESILUTION, PANEL_TYPE, REFRESH_RATE_HZ, OS_PLATFORM, CATEGORY, 
//                      PRICE_EGB, PRICE_CARFOURE, PRICE_2B, PRICE_BTECH, PRICE_AMAZON, PRICE_SALES_CAIRO, 
//                      PRICE_RANIN, PRICE_RAYA, PRICE_REZKALLAH, PRICE_ST_DOWNTOWN, PRICE_DATE, ID,
//                      LAST_UPDATED_2B, LAST_UPDATED_BTECH, LAST_UPDATED_SALES_CAIRO, LAST_UPDATED_AMAZON, 
//                      LAST_UPDATED_ST_DOWNTOWN, LAST_UPDATED_CARFOURE, LAST_UPDATED_RANIN, LAST_UPDATED_RAYA, LAST_UPDATED_REZKALLAH) 
//                     VALUES 
//                     (:brand, :screenSize, :resolution, :panelType, :refreshRate, :osPlatform, :category,
//                      :price_egp, :price_carfoure, :price_2b, :price_btech, :price_amazon, :price_sales_cairo,
//                      :price_ranin, :price_raya, :price_rezkallah, :price_st_downtown, SYSDATE, :id,
//                      :last_updated, :last_updated, :last_updated, :last_updated, :last_updated, :last_updated, :last_updated, :last_updated, :last_updated)
//                 `;
//                 await connection.execute(insertSql, { ...specs, ...prices, id: nextId++, last_updated: today }, { autoCommit: true });
//                 console.log(`➕ Inserted product ID ${nextId - 1}: ${specs.brand} ${specs.screenSize}"`);
//             }
//         }

//         console.log("✨ Import completed!");

//     } catch (err) {
//         console.error("🔥 Error during import:", err);
//     } finally {
//         if (connection) await connection.close();
//     }
// }

// importExcel();
