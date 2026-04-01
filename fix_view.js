import oracledb from "oracledb";

oracledb.initOracleClient({
    libDir: "C:\\oracle\\instantclient_19_25"
});

async function fixView() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: "doc",
            password: "doc",
            connectString: "192.168.13.11:1521/orcl"
        });

        console.log("Recreating View RECIP with explicit table aliases to fix ORA-00918...");

        const sql = `
            CREATE OR REPLACE VIEW RECIP AS
            SELECT 
                r.doc_no, 
                r.doc_date,
                d.subject, 
                d.doc_type, 
                r.place_c, 
                r.geha_c,
                d.file_name, 
                d.file_attach, 
                r.ansered, 
                d.emp_no, 
                d.from_date, 
                d.to_date,
                r.replay_path, 
                r.rad_date, 
                r.situation, 
                d.main_doc,
                d.main_doc_no, 
                d.main_doc_date, 
                d.doc_status,
                d.holiday_status,
                d.trans_type
            FROM recip_geha_new r, doc_data_new d
            WHERE r.doc_no = d.doc_no
            AND r.doc_date = d.doc_date
            AND r.place_c = d.place_c
        `;

        await conn.execute(sql);
        console.log("View RECIP recreated successfully.");

    } catch (err) {
        console.error("ERROR fixing view:", err.message);
    } finally {
        if (conn) await conn.close();
    }
}

fixView();
