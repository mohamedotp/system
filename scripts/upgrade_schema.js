// const oracledb = require("oracledb");
// require("dotenv").config({ path: ".env.local" });

// async function run() {
//     let conn;
//     try {
//         oracledb.initOracleClient({ libDir: "C:\\oracle\\instantclient_19_25" });
//         conn = await oracledb.getConnection({
//             user: process.env.ORACLE_USER,
//             password: process.env.ORACLE_PASSWORD,
//             connectString: process.env.ORACLE_CONNECT_STRING
//         });

//         console.log("Connected to Oracle.");

//         const priceCols = [
//             "PRICE_EGB", "PRICE_2B", "PRICE_BTECH", "PRICE_SALES_CAIRO",
//             "PRICE_AMAZON", "PRICE_ST_DOWNTOWN", "PRICE_CARFOURE"
//         ];

//         // 1. Convert existing columns to VARCHAR2
//         for (const col of priceCols) {
//             console.log(`Processing ${col}...`);
//             try {
//                 // Add temp column
//                 try {
//                     await conn.execute(`ALTER TABLE PRICES_TAB ADD ${col}_STR VARCHAR2(50)`);
//                 } catch (e) {
//                     if (!e.message.includes("ORA-01430")) throw e;
//                 }

//                 // Copy data
//                 await conn.execute(`UPDATE PRICES_TAB SET ${col}_STR = CASE WHEN ${col} IS NULL THEN NULL ELSE TO_CHAR(${col}) END`);

//                 // Drop old
//                 try {
//                     await conn.execute(`ALTER TABLE PRICES_TAB DROP COLUMN ${col}`);
//                 } catch (e) {
//                     console.warn(`Could not drop ${col}, maybe already dropped?`, e.message);
//                 }

//                 // Rename temp to old name
//                 await conn.execute(`ALTER TABLE PRICES_TAB RENAME COLUMN ${col}_STR TO ${col}`);

//                 console.log(`✅ Converted ${col} to VARCHAR2(50)`);
//             } catch (err) {
//                 console.error(`❌ Error processing ${col}:`, err.message);
//             }
//         }

//         // 2. Add new store columns
//         const newStores = ["RANIN", "RAYA", "REZKALLAH"];
//         for (const store of newStores) {
//             try {
//                 await conn.execute(`ALTER TABLE PRICES_TAB ADD (PRICE_${store} VARCHAR2(50), LAST_UPDATED_${store} DATE)`);
//                 console.log(`✅ Added columns for ${store}`);
//             } catch (err) {
//                 if (err.message.includes("ORA-01430")) {
//                     console.log(`⏭️ Columns for ${store} already exist.`);
//                 } else {
//                     console.error(`❌ Error adding ${store}:`, err.message);
//                 }
//             }
//         }

//         await conn.commit();
//         console.log("✨ Schema update complete!");

//     } catch (err) {
//         console.error("🔥 FATAL ERROR:", err);
//     } finally {
//         if (conn) await conn.close();
//     }
// }

// run();
