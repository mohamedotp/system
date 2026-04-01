import { NextResponse } from "next/server";
import { getConnection } from "@/lib/oracle";


export async function GET() {
    console.log("GET /api/product started");
    let connection;
    try {
        console.log("Attempting to get connection...");
        connection = await getConnection();
        console.log("Connection obtained, executing query...");
        const result = await connection.execute("SELECT * FROM PRICES_TAB");
        console.log("Query executed successfully, rows count:", result.rows?.length);

        return NextResponse.json({
            success: true,
            data: result.rows,
            message: "Connection successful"
        });
    } catch (err) {
        console.error("Error in API route:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) {
            console.log("Closing connection...");
            await connection.close();
            console.log("Connection closed.");
        }
    }
}
export async function POST(request) {
    console.log("POST /api/product started");
    let connection;
    try {
        const body = await request.json();
        const {
            brand, screenSize, resolution, panelType, refreshRate, osPlatform, price, date,
            category, price_2b, price_btech, price_sales_cairo, price_amazon,
            price_st_downtown, price_carfoure, price_ranin, price_raya, price_rezkallah
        } = body;

        connection = await getConnection();

        // Find max ID
        const maxIdResult = await connection.execute("SELECT MAX(ID) FROM PRICES_TAB");
        const nextId = (maxIdResult.rows[0][0] || 0) + 1;

        // Format date to YYYY-MM-DD HH:mm:ss for Oracle TO_DATE
        const dateObj = date ? new Date(date) : new Date();
        const formattedDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');

        const sql = `
            INSERT INTO PRICES_TAB 
            (BRAND, SCREEN_SIZE, RESILUTION, PANEL_TYPE, REFRESH_RATE_HZ, OS_PLATFORM, PRICE_EGB, PRICE_DATE, ID, CATEGORY, 
             PRICE_2B, PRICE_BTECH, PRICE_SALES_CAIRO, PRICE_AMAZON, PRICE_ST_DOWNTOWN, PRICE_CARFOURE, PRICE_RANIN, PRICE_RAYA, PRICE_REZKALLAH) 
            VALUES (:brand, :screenSize, :resolution, :panelType, :refreshRate, :osPlatform, :price, TO_DATE(:priceDate, 'YYYY-MM-DD HH24:MI:SS'), :id, :category,
             :price_2b, :price_btech, :price_sales_cairo, :price_amazon, :price_st_downtown, :price_carfoure, :price_ranin, :price_raya, :price_rezkallah)
        `;

        const bindVars = {
            brand: brand || "",
            screenSize: parseFloat(screenSize) || 0,
            resolution: resolution || "",
            panelType: panelType || "",
            refreshRate: parseInt(refreshRate) || 0,
            osPlatform: osPlatform || "",
            price: price ? String(price) : null,
            priceDate: formattedDate,
            id: nextId,
            category: category || "TV",
            price_2b: price_2b ? String(price_2b) : null,
            price_btech: price_btech ? String(price_btech) : null,
            price_sales_cairo: price_sales_cairo ? String(price_sales_cairo) : null,
            price_amazon: price_amazon ? String(price_amazon) : null,
            price_st_downtown: price_st_downtown ? String(price_st_downtown) : null,
            price_carfoure: price_carfoure ? String(price_carfoure) : null,
            price_ranin: price_ranin ? String(price_ranin) : null,
            price_raya: price_raya ? String(price_raya) : null,
            price_rezkallah: price_rezkallah ? String(price_rezkallah) : null
        };

        const result = await connection.execute(sql, bindVars, { autoCommit: true });
        console.log("Insert result:", result);

        return NextResponse.json({
            success: true,
            message: "Product added successfully",
            id: nextId
        });
    } catch (err) {
        console.error("Error in POST /api/product:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}
