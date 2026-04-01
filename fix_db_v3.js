import oracledb from "oracledb";

oracledb.initOracleClient({
    libDir: "C:\\oracle\\instantclient_19_25"
});

async function updateSchema() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: "doc",
            password: "doc",
            connectString: "192.168.13.11:1521/orcl"
        });

        console.log("Adding missing columns to RECIP_GEHA_NEW...");

        try {
            await conn.execute(`ALTER TABLE RECIP_GEHA_NEW ADD (TRANS_TYPE NUMBER, DOC_TYPE NUMBER)`);
            console.log("Successfully added TRANS_TYPE and DOC_TYPE to RECIP_GEHA_NEW");
        } catch (e) {
            console.log("Note: Columns might already exist or error occurred:", e.message);
        }

        // Just in case, ensure FILE_ATTACH is indeed 1000 in DOC_DATA_NEW
        try {
            await conn.execute(`ALTER TABLE DOC_DATA_NEW MODIFY FILE_ATTACH VARCHAR2(1000)`);
            console.log("Confirmed DOC_DATA_NEW.FILE_ATTACH is VARCHAR2(1000)");
        } catch (e) {
            console.log("Note: FILE_ATTACH modify error:", e.message);
        }

        await conn.commit();

    } catch (err) {
        console.error("CRITICAL ERROR:", err.message);
    } finally {
        if (conn) await conn.close();
    }
}

updateSchema();
