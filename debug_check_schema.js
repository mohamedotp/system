const oracledb = require('oracledb');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
    let connection;
    try {
        try {
            oracledb.initOracleClient({ libDir: "C:\\oracle\\instantclient_19_25" });
        } catch (err) { }

        connection = await oracledb.getConnection({
            user: process.env.ORACLE_USER2,
            password: process.env.ORACLE_PASSWORD2,
            connectString: process.env.ORACLE_CONNECT_STRING
        });

        console.log("Checking columns in DOC_DATA_NEW...");
        // Oracle system view to check columns
        const result = await connection.execute(
            `SELECT COLUMN_NAME, DATA_TYPE FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'DOC_DATA_NEW' AND COLUMN_NAME = 'FILE_ATTACH'`
        );

        if (result.rows.length > 0) {
            console.log("✅ FILE_ATTACH exists in DOC_DATA_NEW:", result.rows[0]);
        } else {
            console.log("❌ FILE_ATTACH does NOT exist in DOC_DATA_NEW!");
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        if (connection) await connection.close();
    }
}

checkSchema();
