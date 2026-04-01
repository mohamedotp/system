// const oracledb = require("oracledb");
// require("dotenv").config({ path: ".env.local" });

// async function checkSchema() {
//     let connection;
//     try {
//         oracledb.initOracleClient({ libDir: "C:\\oracle\\instantclient_19_25" });
//         connection = await oracledb.getConnection({
//             user: process.env.ORACLE_USER,
//             password: process.env.ORACLE_PASSWORD,
//             connectString: process.env.ORACLE_CONNECT_STRING
//         });

//         const result = await connection.execute(`
//             SELECT column_name, data_type, data_length
//             FROM all_tab_columns
//             WHERE table_name = 'PRICES_TAB'
//             ORDER BY column_id
//         `);
//         console.log("Schema:", result.rows);

//     } catch (err) {
//         console.error(err);
//     } finally {
//         if (connection) {
//             await connection.close();
//         }
//     }
// }

// checkSchema();
