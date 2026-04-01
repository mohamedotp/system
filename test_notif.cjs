const oracledb = require('oracledb');
require('dotenv').config({ path: '.env.local' });

async function check() {
    let conn;
    try {
        const oracleClientPath = "C:\\oracle\\instantclient_19_25";
        try {
            oracledb.initOracleClient({ libDir: oracleClientPath });
        } catch (e) { }

        conn = await oracledb.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONNECT_STRING
        });

        console.log("--- SYSTEM_PUSH_SUBS ---");
        const res1 = await conn.execute("SELECT COUNT(*) FROM SYSTEM_PUSH_SUBS");
        console.log("Count:", res1.rows[0][0]);

        console.log("--- Latest Notifications ---");
        const res2 = await conn.execute("SELECT ID, SENDER_ID, RECEIVER_ID, MESSAGE, READ_FLAG FROM (SELECT * FROM SYSTEM_NOTIFICATIONS ORDER BY CREATED_AT DESC) WHERE ROWNUM <= 5");
        console.log(res2.rows);

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (conn) await conn.close();
    }
}

check();
