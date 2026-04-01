"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ShoppingCart, Store, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types/product";

interface StorePricesProps {
    product: Product;
}

const stores = [
    { key: 'price_2b', name: '2B', icon: '🛒', color: 'from-blue-500 to-blue-600' },
    { key: 'price_btech', name: 'B.Tech', icon: '💻', color: 'from-purple-500 to-purple-600' },
    { key: 'price_sales_cairo', name: 'Sales Cairo', icon: '🏬', color: 'from-green-500 to-green-600' },
    { key: 'price_amazon', name: 'Amazon', icon: '📦', color: 'from-yellow-500 to-yellow-600' },
    { key: 'price_st_downtown', name: 'ST Downtown', icon: '🏢', color: 'from-red-500 to-red-600' },
    { key: 'price_carfoure', name: 'Carfour', icon: '🛍️', color: 'from-orange-500 to-orange-600' },
];

export default function StorePrices({ product }: StorePricesProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ar-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'غير متوفر';
        return new Date(dateString).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getLowestPrice = () => {
        const prices = stores
            .map(store => ({
                name: store.name,
                price: product[store.key as keyof Product] as number,
                icon: store.icon
            }))
            .filter(p => p.price && p.price > 0);

        if (prices.length === 0) return null;
        return prices.reduce((min, p) => p.price < min.price ? p : min);
    };

    const lowestPrice = getLowestPrice();

    return (
        <div className="mt-3 border-t border-slate-100 pt-3">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group"
            >
                <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                    <span className="text-sm font-semibold text-slate-700">أسعار المتاجر</span>
                    {lowestPrice && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">
                            أقل سعر: {formatPrice(lowestPrice.price)}
                        </Badge>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
            </Button>

            {isExpanded && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {stores.map((store) => {
                        const price = product[store.key as keyof Product] as number;
                        const lastUpdated = product[`last_updated_${store.key.replace('price_', '')}` as keyof Product] as string;

                        if (!price) return null;

                        return (
                            <div
                                key={store.key}
                                className={`bg-gradient-to-br ${store.color} bg-opacity-5 p-3 rounded-xl border border-slate-100 hover:shadow-md transition-all`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{store.icon}</span>
                                    <span className="text-xs font-bold text-slate-600">{store.name}</span>
                                </div>
                                <div className="font-black text-sm text-slate-900">
                                    {formatPrice(price)}
                                </div>
                                {lastUpdated && (
                                    <div className="flex items-center gap-1 mt-2 text-[8px] text-slate-400">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatDate(lastUpdated)}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}