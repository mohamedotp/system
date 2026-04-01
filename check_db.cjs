const oracledb = require("oracledb");
require('dotenv').config({ path: 'e:/system/.env.local' });

async function run() {
    let connection;
    try {
        oracledb.initOracleClient({
            libDir: "C:\\oracle\\instantclient_19_25"
        });
        connection = await oracledb.getConnection({
            user: process.env.ORACLE_USER2,
            password: process.env.ORACLE_PASSWORD2,
            connectString: process.env.ORACLE_CONNECT_STRING
        });

        console.log("Checking ATTACHMENTS table...");
        try {
            const res = await connection.execute("DESCRIBE ATTACHMENTS"); // Wait, DESCRIBE is a sqlplus command.
        } catch (e) { }

        // Better way to check columns in Oracle
        const cols = await connection.execute(`
      SELECT column_name, data_type 
      FROM user_tab_columns 
      WHERE table_name = 'ATTACHMENTS'
    `);
        console.log("ATTACHMENTS Columns:", JSON.stringify(cols.rows, null, 2));

        const cols2 = await connection.execute(`
      SELECT column_name, data_type 
      FROM user_tab_columns 
      WHERE table_name = 'DOC_DATA_NEW'
    `);
        console.log("DOC_DATA_NEW Columns:", JSON.stringify(cols2.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

run();
