// const { getConnection2 } = require('./lib/oracle');
// const fs = require('fs');

// async function run() {
//     let conn;
//     try {
//         conn = await getConnection2();
//         const r1 = await conn.execute('SELECT * FROM RECIP WHERE ROWNUM = 1');
//         const r2 = await conn.execute('SELECT * FROM RECIP_GEHA_NEW WHERE ROWNUM = 1');
//         const r3 = await conn.execute('SELECT * FROM DOC_DATA_NEW WHERE ROWNUM = 1');
//         const out = {
//             RECIP: r1.metaData.map(m => m.name),
//             RECIP_GEHA_NEW: r2.metaData.map(m => m.name),
//             DOC_DATA_NEW: r3.metaData.map(m => m.name)
//         };
//         fs.writeFileSync('db_cols.json', JSON.stringify(out, null, 2));
//         console.log('Done');
//     } catch (e) {
//         fs.writeFileSync('db_cols.json', JSON.stringify({ error: e.message, stack: e.stack }));
//     } finally {
//         if (conn) await conn.close();
//     }
// }
// run();
