const oracledb = require("oracledb");

oracledb.initOracleClient({
    libDir: "C:\\oracle\\instantclient_19_25"
});

async function checkViewStatus() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: "doc",
            password: "doc",
            connectString: "192.168.13.11:1521/orcl"
        });

        console.log("Checking status of view RECIP...");
        const res = await conn.execute(`
            SELECT status FROM all_objects WHERE object_name = 'RECIP' AND object_type = 'VIEW' AND owner = 'DOC'
        `);
        console.log("View Status:", res.rows[0] ? res.rows[0][0] : "Not found");

        if (res.rows[0] && res.rows[0][0] === 'INVALID') {
            console.log("View is INVALID. Checking errors...");
            const errors = await conn.execute(`
                SELECT line, position, text FROM all_errors WHERE name = 'RECIP' AND type = 'VIEW' AND owner = 'DOC'
            `);
            errors.rows.forEach(row => console.log(`Error at line ${row[0]}, pos ${row[1]}: ${row[2]}`));
        } else {
            // Try to execute a simple count to see the exact error
            try {
                await conn.execute(`SELECT count(*) FROM RECIP`);
                console.log("View query successful.");
            } catch (e) {
                console.error("View query FAILED:", e.message);
            }
        }

    } catch (err) {
        console.error("ERROR:", err.message);
    } finally {
        if (conn) await conn.close();
    }
}

checkViewStatus();
