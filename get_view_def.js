import oracledb from "oracledb";

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

        const result = await conn.execute(`
            SELECT text 
            FROM all_views 
            WHERE view_name = 'RECIP' 
            AND owner = 'DOC'
        `);
        console.log("RECIP View Definition:", result.rows[0] ? result.rows[0][0] : "Not found");

    } catch (err) {
        console.error("ERROR:", err);
    } finally {
        if (conn) await conn.close();
    }
}

check();
