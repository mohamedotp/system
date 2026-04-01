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

        const objects = await conn.execute(`
            SELECT object_name, object_type 
            FROM all_objects 
            WHERE object_name IN ('RECIP', 'RECIP_GEHA_NEW')
            AND owner = 'DOC'
        `);
        console.log("Database Objects:", objects.rows);

    } catch (err) {
        console.error("ERROR:", err);
    } finally {
        if (conn) await conn.close();
    }
}

check();
