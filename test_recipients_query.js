// const oracledb = require('oracledb');
// require('dotenv').config({ path: '.env.local' });

// async function test() {
//     let conn;
//     try {
//         oracledb.initOracleClient({ libDir: "C:\\oracle\\instantclient_19_25" });
//         conn = await oracledb.getConnection({
//             user: process.env.ORACLE_USER,
//             password: process.env.ORACLE_PASSWORD,
//             connectString: process.env.ORACLE_CONNECT_STRING
//         });

//         const empNum = "181"; // User in the log
//         const sql = `
//             SELECT r.DOC_NO, 
//                    (SELECT LISTAGG(e_other.EMP_NAME, ' | ') WITHIN GROUP (ORDER BY e_other.EMP_NAME)
//                     FROM RECIP_GEHA_NEW r_other
//                     JOIN EMP_DOC e_other ON r_other.GEHA_C = e_other.EMP_NUM
//                     WHERE r_other.DOC_NO = r.DOC_NO AND r_other.PLACE_C = r.PLACE_C) as ALL_RECIPIENTS
//             FROM RECIP_GEHA_NEW r
//             WHERE r.GEHA_C = :empNum
//             FETCH FIRST 5 ROWS ONLY
//         `;

//         const res = await conn.execute(sql, { empNum });
//         console.log("Results:", JSON.stringify(res.rows, null, 2));

//     } catch (err) {
//         console.error(err);
//     } finally {
//         if (conn) await conn.close();
//     }
// }
// test();
