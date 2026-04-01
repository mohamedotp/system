// const oracledb = require("oracledb");

// // Thick Mode على Oracle Client
// oracledb.initOracleClient({
//   libDir: "C:\\oracle\\instantclient_19_25"
// });

// (async function test() {
//   let conn;
//   try {
//     conn = await oracledb.getConnection({
//       user: "salary",
//       password: "salary",
//       connectString: "192.168.13.11:1521/orcl"
//     });

//     const result = await conn.execute("SELECT table_name FROM user_tables ORDER BY table_name");
//     console.log("CONNECTED ✅", result.rows);

//   } catch (err) {
//     console.error("FAILED ❌", err);
//   } finally {
//     if (conn) await conn.close();
//   }
// })();
