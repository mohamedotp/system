const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

async function run() {
  let conn;
  try {
    conn = await oracledb.getConnection({
      user: process.env.DB_USER || 'doc',
      password: process.env.DB_PASSWORD || 'doc',
      connectString: process.env.DB_CONNECT_STRING || '192.168.13.11:1521/ORCL'
    });
    
    // First let's verify what the DOC.DOC_UNIQUE constraint covers
    const res = await conn.execute(`
      SELECT table_name, column_name
      FROM all_cons_columns
      WHERE constraint_name = 'DOC_UNIQUE'
    `);
    console.log('DOC_UNIQUE columns:', res.rows);
    
  } catch (err) {
    console.error(err);
  } finally {
    if (conn) {
      try { await conn.close(); } catch (e) { console.error(e); }
    }
  }
}
run();
