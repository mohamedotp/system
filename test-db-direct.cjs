const oracledb = require('oracledb');
require('dotenv').config({ path: '.env.local' });

async function run() {
    let conn;
    try {
        console.log("Checking Salary DB...");
        conn = await oracledb.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASSWORD,
            connectString: process.env.ORACLE_CONNECT_STRING
        });
        let res = await conn.execute("SELECT table_name FROM user_tables WHERE table_name LIKE '%MODIF%'");
        console.log("Salary Tables:", res.rows);
        res = await conn.execute("SELECT sequence_name FROM user_sequences WHERE sequence_name LIKE '%MODIF%'");
        console.log("Salary Sequences:", res.rows);
        await conn.close();

        console.log("\nChecking Doc DB...");
        conn = await oracledb.getConnection({
            user: process.env.ORACLE_USER2,
            password: process.env.ORACLE_PASSWORD2,
            connectString: process.env.ORACLE_CONNECT_STRING2
        });
        res = await conn.execute("SELECT table_name FROM user_tables WHERE table_name LIKE '%MODIF%'");
        console.log("Doc Tables:", res.rows);
        res = await conn.execute("SELECT sequence_name FROM user_sequences WHERE sequence_name LIKE '%MODIF%'");
        console.log("Doc Sequences:", res.rows);
        await conn.close();
    } catch (err) {
        console.error(err);
    }
}

run();
