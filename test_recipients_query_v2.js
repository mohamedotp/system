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

//         const empNum = "181";
//         const sql = `
//             SELECT r.DOC_NO, r.PLACE_C
//             FROM RECIP_GEHA_NEW r
//             WHERE r.GEHA_C = :empNum
//             AND ROWNUM <= 5
//         `;

//         const res = await conn.execute(sql, { empNum });
//         console.log("Memos for user 181:", res.rows);

//         if (res.rows.length > 0) {
//             const docNo = res.rows[0][0];
//             const sender = res.rows[0][1];
//             console.log(`Checking recipients for Doc: ${docNo}, Sender: ${sender}`);

//             const sqlRec = `
//                 SELECT e.EMP_NAME
//                 FROM RECIP_GEHA_NEW r
//                 JOIN EMP_DOC e ON r.GEHA_C = e.EMP_NUM
//                 WHERE r.DOC_NO = :docNo AND r.PLACE_C = :sender
//             `;
//             const resRec = await conn.execute(sqlRec, { docNo, sender });
//             console.log("Recipients found:", resRec.rows);
//         }

//     } catch (err) {
//         console.error(err);
//     } finally {
//         if (conn) await conn.close();
//     }
// }
// test();
