import oracledb from "oracledb";

oracledb.initOracleClient({
    libDir: "C:\\oracle\\instantclient_19_25"
});

async function alterTable() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: "doc",
            password: "doc",
            connectString: "192.168.13.11:1521/orcl"
        });

        console.log("Attempting to increase FILE_ATTACH column size...");
        await conn.execute(`ALTER TABLE DOC_DATA_NEW MODIFY FILE_ATTACH VARCHAR2(1000)`);
        console.log("Successfully increased DOC_DATA_NEW.FILE_ATTACH to 1000");

    } catch (err) {
        console.error("ERROR altering table:", err.message);
    } finally {
        if (conn) await conn.close();
    }
}

alterTable();
