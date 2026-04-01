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

        const docDataColumns = await conn.execute("SELECT column_name, data_type FROM user_tab_columns WHERE table_name = 'DOC_DATA_NEW'");
        console.log("DOC_DATA_NEW Columns:", docDataColumns.rows);

    } catch (err) {
        console.error("ERROR:", err);
    } finally {
        if (conn) await conn.close();
    }
}

check();
