const oracledb = require("oracledb");

oracledb.initOracleClient({
    libDir: "C:\\oracle\\instantclient_19_25"
});

async function check() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: "doc",
            password: "doc",
            connectString: "192.168.13.11:1521/orcl"
        });

        console.log("Checking RECIP and RECIP_GEHA_NEW...");

        const objects = await conn.execute(`
            SELECT object_name, object_type 
            FROM all_objects 
            WHERE object_name IN ('RECIP', 'RECIP_GEHA_NEW')
            AND owner = 'DOC'
        `);
        console.log("Objects:", objects.rows);

        const recipColumns = await conn.execute("SELECT column_name, data_type FROM user_tab_columns WHERE table_name = 'RECIP'");
        console.log("RECIP Columns:", recipColumns.rows);

        const recipGehaNewColumns = await conn.execute("SELECT column_name, data_type FROM user_tab_columns WHERE table_name = 'RECIP_GEHA_NEW'");
        console.log("RECIP_GEHA_NEW Columns:", recipGehaNewColumns.rows);

    } catch (err) {
        console.error("ERROR:", err);
    } finally {
        if (conn) await conn.close();
    }
}

check();
