const oracledb = require('oracledb');
require('dotenv').config({ path: '.env.local' });

async function createTable() {
    let connection;

    try {
        connection = await oracledb.getConnection2({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: process.env.DB_CONNECT_STRING
        });

        console.log('Connected to Oracle Database');

        const sql = `
            DECLARE
                e_table_exists EXCEPTION;
                PRAGMA EXCEPTION_INIT(e_table_exists, -00955);
            BEGIN
                EXECUTE IMMEDIATE '
                    CREATE TABLE EMPLOYEE_SIGNATURES (
                        EMP_NUM NVARCHAR2(20) PRIMARY KEY,
                        SIGNATURE_PATH VARCHAR2(500),
                        CREATED_DATE DATE DEFAULT SYSDATE,
                        UPDATED_DATE DATE DEFAULT SYSDATE
                    )
                ';
                DBMS_OUTPUT.PUT_LINE('Table EMPLOYEE_SIGNATURES created successfully.');
            EXCEPTION
                WHEN e_table_exists THEN
                    DBMS_OUTPUT.PUT_LINE('Table EMPLOYEE_SIGNATURES already exists.');
            END;
        `;

        await connection.execute(sql);
        console.log('Table creation script executed.');

    } catch (err) {
        console.error('Error executing script:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
}

createTable();
