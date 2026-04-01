const oracledb = require("oracledb");

oracledb.initOracleClient({
    libDir: "C:\\oracle\\instantclient_19_25"
});

async function checkColumns() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: "doc",
            password: "doc",
            connectString: "192.168.13.11:1521/orcl"
        });

        const tables = ["DOC_DATA_NEW", "RECIP_GEHA_NEW"];

        for (const tableName of tables) {
            console.log(`\nColumns for ${tableName}:`);
            const res = await conn.execute(`
                SELECT column_name, data_type, data_length 
                FROM all_tab_columns 
                WHERE table_name = :tn 
                AND owner = 'DOC'
                ORDER BY column_id
            `, { tn: tableName });
            res.rows.forEach(row => {
                console.log(`${row[0]} - ${row[1]}(${row[2]})`);
            });
        }

    } catch (err) {
        console.error("ERROR:", err.message);
    } finally {
        if (conn) await conn.close();
    }
}

checkColumns();
