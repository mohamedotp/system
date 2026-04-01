import { NextResponse } from "next/server";
import { getConnection } from "@/lib/oracle";

export async function PUT(request, { params }) {
    const { id } = await params;
    console.log(`PUT /api/product/${id} started`);
    let connection;
    try {
        const body = await request.json();
        const {
            brand, screenSize, resolution, panelType, refreshRate, osPlatform, price, date,
            category, price_2b, price_btech, price_sales_cairo, price_amazon,
            price_st_downtown, price_carfoure, price_ranin, price_raya, price_rezkallah
        } = body;

        connection = await getConnection();

        // Format date to YYYY-MM-DD HH:mm:ss for Oracle TO_DATE
        const dateObj = date ? new Date(date) : new Date();
        const formattedDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const sql = `
            UPDATE PRICES_TAB 
            SET BRAND = :brand, 
                SCREEN_SIZE = :screenSize, 
                RESILUTION = :resolution, 
                PANEL_TYPE = :panelType, 
                REFRESH_RATE_HZ = :refreshRate, 
                OS_PLATFORM = :osPlatform, 
                PRICE_EGB = :price, 
                PRICE_DATE = TO_DATE(:priceDate, 'YYYY-MM-DD HH24:MI:SS'),
                CATEGORY = :category,
                PRICE_2B = :price_2b,
                PRICE_BTECH = :price_btech,
                PRICE_SALES_CAIRO = :price_sales_cairo,
                PRICE_AMAZON = :price_amazon,
                PRICE_ST_DOWNTOWN = :price_st_downtown,
                PRICE_CARFOURE = :price_carfoure,
                PRICE_RANIN = :price_ranin,
                PRICE_RAYA = :price_raya,
                PRICE_REZKALLAH = :price_rezkallah,
                LAST_UPDATED_2B = CASE WHEN :price_2b IS NOT NULL THEN TO_DATE(:now, 'YYYY-MM-DD HH24:MI:SS') ELSE LAST_UPDATED_2B END,
                LAST_UPDATED_BTECH = CASE WHEN :price_btech IS NOT NULL THEN TO_DATE(:now, 'YYYY-MM-DD HH24:MI:SS') ELSE LAST_UPDATED_BTECH END,
                LAST_UPDATED_SALES_CAIRO = CASE WHEN :price_sales_cairo IS NOT NULL THEN TO_DATE(:now, 'YYYY-MM-DD HH24:MI:SS') ELSE LAST_UPDATED_SALES_CAIRO END,
                LAST_UPDATED_AMAZON = CASE WHEN :price_amazon IS NOT NULL THEN TO_DATE(:now, 'YYYY-MM-DD HH24:MI:SS') ELSE LAST_UPDATED_AMAZON END,
                LAST_UPDATED_ST_DOWNTOWN = CASE WHEN :price_st_downtown IS NOT NULL THEN TO_DATE(:now, 'YYYY-MM-DD HH24:MI:SS') ELSE LAST_UPDATED_ST_DOWNTOWN END,
                LAST_UPDATED_CARFOURE = CASE WHEN :price_carfoure IS NOT NULL THEN TO_DATE(:now, 'YYYY-MM-DD HH24:MI:SS') ELSE LAST_UPDATED_CARFOURE END,
                LAST_UPDATED_RANIN = CASE WHEN :price_ranin IS NOT NULL THEN TO_DATE(:now, 'YYYY-MM-DD HH24:MI:SS') ELSE LAST_UPDATED_RANIN END,
                LAST_UPDATED_RAYA = CASE WHEN :price_raya IS NOT NULL THEN TO_DATE(:now, 'YYYY-MM-DD HH24:MI:SS') ELSE LAST_UPDATED_RAYA END,
                LAST_UPDATED_REZKALLAH = CASE WHEN :price_rezkallah IS NOT NULL THEN TO_DATE(:now, 'YYYY-MM-DD HH24:MI:SS') ELSE LAST_UPDATED_REZKALLAH END
            WHERE ID = :id
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
            category: category || "TV",
            price_2b: price_2b ? String(price_2b) : null,
            price_btech: price_btech ? String(price_btech) : null,
            price_sales_cairo: price_sales_cairo ? String(price_sales_cairo) : null,
            price_amazon: price_amazon ? String(price_amazon) : null,
            price_st_downtown: price_st_downtown ? String(price_st_downtown) : null,
            price_carfoure: price_carfoure ? String(price_carfoure) : null,
            price_ranin: price_ranin ? String(price_ranin) : null,
            price_raya: price_raya ? String(price_raya) : null,
            price_rezkallah: price_rezkallah ? String(price_rezkallah) : null,
            now: now,
            id: id
        };

        const result = await connection.execute(sql, bindVars, { autoCommit: true });
        console.log("Update result:", result);

        if (result.rowsAffected === 0) {
            return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: "Product updated successfully"
        });
    } catch (err) {
        console.error(`Error in PUT /api/product/${id}:`, err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

export async function DELETE(request, { params }) {
    const { id } = await params;
    console.log(`DELETE /api/product/${id} started`);
    let connection;
    try {
        connection = await getConnection();

        const sql = `DELETE FROM PRICES_TAB WHERE ID = :id`;
        const result = await connection.execute(sql, { id: id }, { autoCommit: true });
        console.log("Delete result:", result);

        if (result.rowsAffected === 0) {
            return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (err) {
        console.error(`Error in DELETE /api/product/${id}:`, err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}