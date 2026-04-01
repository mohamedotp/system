// const oracledb = require("oracledb");

// oracledb.initOracleClient({
//     libDir: "C:\\oracle\\instantclient_19_25"
// });

// async function check() {
//     let conn;
//     try {
//         conn = await oracledb.getConnection({
//             user: "doc",
//             password: "doc",
//             connectString: "192.168.13.11:1521/orcl"
//         });

//         console.log("Checking all tables starting with RECIP...");
//         const tables = await conn.execute("SELECT table_name FROM user_tables WHERE table_name LIKE 'RECIP%'");
//         console.log("Tables found:", tables.rows);

//         if (tables.rows.length > 0) {
//             const tableName = tables.rows.find(r => r[0].includes('GEHA'))?.[0] || tables.rows[0][0];
//             console.log(`Getting columns for: ${tableName}`);
//             const cols = await conn.execute(`SELECT column_name, data_type FROM user_tab_columns WHERE table_name = '${tableName}'`);
//             console.log("Columns:", cols.rows);
//         }

//     } catch (err) {
//         console.error("ERROR:", err);
//     } finally {
//         if (conn) await conn.close();
//     }
// }

// check();
