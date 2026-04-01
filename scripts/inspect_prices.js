// const oracledb = require("oracledb");
// require("dotenv").config({ path: ".env.local" });

// async function checkTable() {
//     let connection;
//     try {
//         oracledb.initOracleClient({ libDir: "C:\\oracle\\instantclient_19_25" });
//         connection = await oracledb.getConnection({
//             user: process.env.ORACLE_USER,
//             password: process.env.ORACLE_PASSWORD,
//             connectString: process.env.ORACLE_CONNECT_STRING
//         });

//         const result = await connection.execute("SELECT * FROM PRICES_TAB WHERE ROWNUM <= 5");
//         console.log("Columns:", result.metaData.map(m => m.name));
//         console.log("Sample Data:", result.rows);

//     } catch (err) {
//         console.error(err);
//     } finally {
//         if (connection) {
//             await connection.close();
//         }
//     }
// }

// checkTable();
