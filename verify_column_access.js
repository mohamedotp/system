// const oracledb = require('oracledb');
// require('dotenv').config({ path: '.env.local' });

// async function verifyColumn() {
//     let connection;
//     try {
//         try {
//             oracledb.initOracleClient({ libDir: "C:\\oracle\\instantclient_19_25" });
//         } catch (err) { }

//         connection = await oracledb.getConnection({
//             user: process.env.ORACLE_USER2,
//             password: process.env.ORACLE_PASSWORD2,
//             connectString: process.env.ORACLE_CONNECT_STRING
//         });

//         console.log("Checking FILE_ATTACH existence in DOC_DATA_NEW...");
//         const result = await connection.execute(
//             `SELECT FILE_ATTACH FROM DOC_DATA_NEW WHERE ROWNUM = 1`
//         );
//         console.log("Select success! Column is accessible.");

//         // Let's try to update a row to ensure it's writable
//         // We'll update the row we just fetched if there is one
//         // Better yet, just describe it or assume if Select worked, Update should work unless constraints...

//     } catch (err) {
//         console.error("Verification Error:", err.message);
//     } finally {
//         if (connection) await connection.close();
//     }
// }

// verifyColumn();
