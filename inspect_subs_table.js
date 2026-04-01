import oracledb from 'oracledb';

oracledb.initOracleClient({
    libDir: "C:\\oracle\\instantclient_19_25"
});


async function checkTable() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: "salary",
            password: "salary",
            connectString: "192.168.13.11:1521/orcl"
        });

        console.log("Checking columns for SYSTEM_PUSH_SUBS:");
        const res = await conn.execute(`
            SELECT column_name, data_type, data_length 
            FROM all_tab_columns 
            WHERE table_name = 'SYSTEM_PUSH_SUBS'
            ORDER BY column_id
        `);
        res.rows.forEach(row => {
            console.log(`${row[0]} - ${row[1]}(${row[2]})`);
        });

    } catch (err) {
        console.error("ERROR:", err.message);
    } finally {
        if (conn) await conn.close();
    }
}

checkTable();
