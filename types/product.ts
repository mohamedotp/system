export interface Product {
    id: number;
    brand: string;
    screen_size_inch: number;
    resolution: string;
    panel_type: string;
    refresh_rate_hz: number;
    os_platform: string;
    price_egp: number | string;
    price_date: string;
    // الحقل الجديد
    category: string;  // TV, Monitor, etc.

    // الأسعار من المتاجر
    price_2b?: number | string;
    price_btech?: number | string;
    price_sales_cairo?: number | string;
    price_amazon?: number | string;
    price_st_downtown?: number | string;
    price_carfoure?: number | string;
    price_ranin?: number | string;
    price_raya?: number | string;
    price_rezkallah?: number | string;

    last_updated_2b?: string;
    last_updated_btech?: string;
    last_updated_sales_cairo?: string;
    last_updated_amazon?: string;
    last_updated_st_downtown?: string;
    last_updated_carfoure?: string;
    last_updated_ranin?: string;
    last_updated_raya?: string;
    last_updated_rezkallah?: string;
}
export interface StorePrices {
    store: string;
    price: number;
    lastUpdated: string;
    icon?: string;
}


export interface FilterState {
    screenSize: number[];
    resolution: string[];
    panelType: string[];
    refreshRate: number[];
    minPrice: number;
    maxPrice: number;
    brand: string[];
    category: string[];  // أضفنا التصفية حسب الفئة
}