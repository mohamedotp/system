const oracledb = require('oracledb');
require('dotenv').config({ path: '.env.local' });

async function run() {
    let conn;
    try {
        // Thick mode initialization
        const oracleClientPath = "C:\\oracle\\instantclient_19_25";
        try {
            oracledb.initOracleClient({ libDir: oracleClientPath });
            console.log("🚀 Oracle Thick Mode initialized.");
        } catch (e) {
            if (!e.message.includes("already initialized")) throw e;
        }

        console.log("Connecting to Salary DB to create SYSTEM_PUSH_SUBS...");
        conn = await oracledb.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONNECT_STRING
        });

        try {
            await conn.execute(`
                CREATE TABLE SYSTEM_PUSH_SUBS (
                    EMP_NUM VARCHAR2(50),
                    SUBSCRIPTION_JSON CLOB,
                    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (EMP_NUM)
                )
            `);
            await conn.commit();
            console.log("Table SYSTEM_PUSH_SUBS created successfully.");
        } catch (e) {
            if (e.message.includes("ORA-00955")) {
                console.log("Table SYSTEM_PUSH_SUBS already exists.");
            } else {
                throw e;
            }
        }

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        if (conn) await conn.close();
    }
}

run();
