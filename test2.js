// const oracledb = require("oracledb");

// // Thick Mode على Oracle 11g Client
// oracledb.initOracleClient({
//   libDir: "F:\\app\\Dina\\product\\11.2.0\\client_2\\bin"
// });

// (async function listTables() {
//   let conn;
//   try {
//     conn = await oracledb.getConnection({
//       user: "salary",
//       password: "salary",
//       connectString: "192.168.13.11:1521/orcl"
//     });

//     // جلب أسماء كل الجداول في schema الحالي
//     const result = await conn.execute(`SELECT table_name FROM user_tables`);

//     console.log("Tables in your schema:");
//     result.rows.forEach(row => console.log(row[0]));

//   } catch (err) {
//     console.error("FAILED ❌", err);
//   } finally {
//     if (conn) await conn.close();
//   }
// })();
