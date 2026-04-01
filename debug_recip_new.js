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

        const tableName = 'RECIP_GEHA_NEW';
        console.log(`Explicitly checking columns for: ${tableName}`);
        const cols = await conn.execute(`SELECT column_name, data_type FROM user_tab_columns WHERE table_name = :tableName`, { tableName });
        console.log("Columns count:", cols.rows.length);
        console.log("Columns:", cols.rows);

    } catch (err) {
        console.error("ERROR:", err);
    } finally {
        if (conn) await conn.close();
    }
}

check();
