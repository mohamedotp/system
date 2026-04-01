"use client";

import { useState, useEffect, useMemo } from "react";
import { Filter, X, Monitor, Tv, Zap, Layers, Maximize, CreditCard, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Product, FilterState } from "@/types/product";

interface ProductFiltersProps {
    products: Product[];
    onFilterChange: (filters: FilterState) => void;
    isLoading?: boolean;
}

export default function ProductFilters({
    products,
    onFilterChange,
    isLoading = false
}: ProductFiltersProps) {
    const [filters, setFilters] = useState<FilterState>({
        screenSize: [],
        resolution: [],
        panelType: [],
        refreshRate: [],
        minPrice: 0,
        maxPrice: 50000,
        brand: [],
        category: [],
    });

    // استخدام useMemo للقيم المميزة حسب الفئة المختارة
    const uniqueCategories = useMemo(() =>
        [...new Set(products.map(p => p.category))].sort(), [products]
    );

    // فلترة الماركات حسب الفئة المختارة
    const uniqueBrands = useMemo(() => {
        let filteredProducts = products;

        // لو في فئات مختارة، نفلتر المنتجات حسبها
        if (filters.category.length > 0) {
            filteredProducts = products.filter(p =>
                filters.category.includes(p.category)
            );
        }

        return [...new Set(filteredProducts.map(p => p.brand))].sort();
    }, [products, filters.category]);

    // باقي القيم المميزة (تتغير حسب الفئة والماركة)
    const uniqueSizes = useMemo(() => {
        let filteredProducts = products;

        if (filters.category.length > 0) {
            filteredProducts = filteredProducts.filter(p =>
                filters.category.includes(p.category)
            );
        }
        if (filters.brand.length > 0) {
            filteredProducts = filteredProducts.filter(p =>
                filters.brand.includes(p.brand)
            );
        }

        return [...new Set(filteredProducts.map(p => p.screen_size_inch))].sort((a, b) => a - b);
    }, [products, filters.category, filters.brand]);

    const uniqueResolutions = useMemo(() => {
        let filteredProducts = products;

        if (filters.category.length > 0) {
            filteredProducts = filteredProducts.filter(p =>
                filters.category.includes(p.category)
            );
        }
        if (filters.brand.length > 0) {
            filteredProducts = filteredProducts.filter(p =>
                filters.brand.includes(p.brand)
            );
        }

        return [...new Set(filteredProducts.map(p => p.resolution))].sort();
    }, [products, filters.category, filters.brand]);

    const uniquePanelTypes = useMemo(() => {
        let filteredProducts = products;

        if (filters.category.length > 0) {
            filteredProducts = filteredProducts.filter(p =>
                filters.category.includes(p.category)
            );
        }
        if (filters.brand.length > 0) {
            filteredProducts = filteredProducts.filter(p =>
                filters.brand.includes(p.brand)
            );
        }

        return [...new Set(filteredProducts.map(p => p.panel_type))].sort();
    }, [products, filters.category, filters.brand]);

    const uniqueRefreshRates = useMemo(() => {
        let filteredProducts = products;

        if (filters.category.length > 0) {
            filteredProducts = filteredProducts.filter(p =>
                filters.category.includes(p.category)
            );
        }
        if (filters.brand.length > 0) {
            filteredProducts = filteredProducts.filter(p =>
                filters.brand.includes(p.brand)
            );
        }

        return [...new Set(filteredProducts.map(p => p.refresh_rate_hz))].sort((a, b) => a - b);
    }, [products, filters.category, filters.brand]);

    // Helper to parse price
    const parsePrice = (price: any): number => {
        if (!price) return 0;
        if (typeof price === "string") {
            if (price.toLowerCase() === "oos") return 0;
            const p = parseFloat(price);
            return isNaN(p) ? 0 : p;
        }
        return price;
    };

    // النطاق السعري حسب الفلتر
    const priceRange = useMemo(() => {
        let filteredProducts = products;

        if (filters.category.length > 0) {
            filteredProducts = filteredProducts.filter(p =>
                filters.category.includes(p.category)
            );
        }
        if (filters.brand.length > 0) {
            filteredProducts = filteredProducts.filter(p =>
                filters.brand.includes(p.brand)
            );
        }

        const validPrices = filteredProducts.map(p => parsePrice(p.price_egp)).filter(p => p > 0);

        const min = validPrices.length > 0
            ? Math.min(...validPrices)
            : 0;
        const max = validPrices.length > 0
            ? Math.max(...validPrices)
            : 50000;

        return { min, max };
    }, [products, filters.category, filters.brand]);

    useEffect(() => {
        // تحديث النطاق السعري عند تغير الفلاتر
        setFilters(prev => ({
            ...prev,
            minPrice: priceRange.min,
            maxPrice: priceRange.max
        }));

        onFilterChange({
            ...filters,
            minPrice: priceRange.min,
            maxPrice: priceRange.max
        });
    }, [priceRange.min, priceRange.max]);

    const handleFilterChange = (key: keyof FilterState, value: any) => {
        const newFilters = { ...filters, [key]: value };

        // لو غيرنا الفئة، نمسح الماركات المختارة (اختياري)
        if (key === 'category') {
            newFilters.brand = [];
        }

        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const handleMultiSelect = (
        key: 'screenSize' | 'resolution' | 'panelType' | 'refreshRate' | 'brand' | 'category',
        value: string | number
    ) => {
        const current = filters[key] as any[];
        const newArray = current.includes(value as never)
            ? current.filter(v => v !== value)
            : [...current, value as never];

        const newFilters = { ...filters, [key]: newArray };

        // لو غيرنا الفئة، نمسح الماركات المختارة (اختياري)
        if (key === 'category') {
            newFilters.brand = [];
        }

        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const clearFilter = (key: keyof FilterState) => {
        const defaultValue = Array.isArray(filters[key]) ? [] :
            typeof filters[key] === 'number' ?
                (key === 'minPrice' ? priceRange.min : priceRange.max) :
                [];
        const newFilters = { ...filters, [key]: defaultValue };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const clearAllFilters = () => {
        const defaultFilters: FilterState = {
            screenSize: [],
            resolution: [],
            panelType: [],
            refreshRate: [],
            minPrice: priceRange.min,
            maxPrice: priceRange.max,
            brand: [],
            category: [],
        };
        setFilters(defaultFilters);
        onFilterChange(defaultFilters);
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.category.length > 0) count++;
        if (filters.brand.length > 0) count++;
        if (filters.screenSize.length > 0) count++;
        if (filters.resolution.length > 0) count++;
        if (filters.panelType.length > 0) count++;
        if (filters.refreshRate.length > 0) count++;
        if (filters.minPrice > priceRange.min || filters.maxPrice < priceRange.max) count++;
        return count;
    };

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="p-8 border-b border-slate-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
                            <Filter className="h-5 w-5 text-white" />
                        </div>
                        <CardTitle className="text-xl font-bold text-slate-900">Refine Search</CardTitle>
                    </div>
                </div>
                {getActiveFilterCount() > 0 && (
                    <div className="flex items-center justify-between mt-6 bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50">
                        <span className="text-xs font-bold text-blue-700 px-2 uppercase tracking-tight"> {getActiveFilterCount()} Active Filters</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFilters}
                            className="h-7 text-xs font-bold text-blue-600 hover:bg-blue-100 transition-all rounded-lg"
                        >
                            Reset All
                        </Button>
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-8 space-y-10">
                {/* Category Filter - أول حاجة عشان تأثر على الباقي */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <Layers size={16} />
                            </div>
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Category</label>
                        </div>
                        {filters.category.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => clearFilter('category')} className="h-7 w-7 p-0 rounded-full hover:bg-slate-100">
                                <X className="h-3.5 w-3.5 text-slate-400" />
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {uniqueCategories.map(category => (
                            <Badge
                                key={category}
                                variant={filters.category.includes(category) ? "default" : "outline"}
                                className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${filters.category.includes(category)
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-200 border-none"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                                    }`}
                                onClick={() => handleMultiSelect('category', category)}
                            >
                                {category === 'TV' ? '📺 TV' :
                                    category === 'Monitor' ? '🖥️ Monitor' :
                                        category === 'Projector' ? '📽️ Projector' : category}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Brand Filter - بتظهر حسب الفئة المختارة */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <Tv size={16} />
                            </div>
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                                Manufacturer
                                {filters.category.length > 0 && (
                                    <span className="ml-1 text-[10px] text-blue-600 font-normal lowercase">
                                        ({filters.category.join(', ')})
                                    </span>
                                )}
                            </label>
                        </div>
                        {filters.brand.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => clearFilter('brand')} className="h-7 w-7 p-0 rounded-full hover:bg-slate-100">
                                <X className="h-3.5 w-3.5 text-slate-400" />
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {uniqueBrands.length > 0 ? uniqueBrands.map(brand => (
                            <Badge
                                key={brand}
                                variant={filters.brand.includes(brand) ? "default" : "outline"}
                                className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${filters.brand.includes(brand)
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-200 border-none"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                                    }`}
                                onClick={() => handleMultiSelect('brand', brand)}
                            >
                                {brand}
                            </Badge>
                        )) : (
                            <div className="text-xs text-slate-400 py-2">
                                No brands available for selected category
                            </div>
                        )}
                    </div>
                </div>

                {/* Screen Size Filter */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <Maximize size={16} />
                            </div>
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Dimension</label>
                        </div>
                        {filters.screenSize.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => clearFilter('screenSize')} className="h-7 w-7 p-0 rounded-full hover:bg-slate-100">
                                <X className="h-3.5 w-3.5 text-slate-400" />
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {uniqueSizes.map(size => (
                            <Badge
                                key={size}
                                variant={filters.screenSize.includes(size) ? "default" : "outline"}
                                className={`cursor-pointer px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${filters.screenSize.includes(size)
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 border-none"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                                    }`}
                                onClick={() => handleMultiSelect('screenSize', size)}
                            >
                                {size}"
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Rest of filters remain the same but use the filtered unique values */}
                {/* Resolution Filter */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <Monitor size={16} />
                            </div>
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Visual Fidelity</label>
                        </div>
                        {filters.resolution.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => clearFilter('resolution')} className="h-7 w-7 p-0 rounded-full hover:bg-slate-100">
                                <X className="h-3.5 w-3.5 text-slate-400" />
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {uniqueResolutions.map(res => (
                            <Badge
                                key={res}
                                variant={filters.resolution.includes(res) ? "default" : "outline"}
                                className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${filters.resolution.includes(res)
                                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-200 border-none"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600"
                                    }`}
                                onClick={() => handleMultiSelect('resolution', res)}
                            >
                                {res}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Panel Type Filter */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <Layers size={16} />
                            </div>
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Panel Type</label>
                        </div>
                        {filters.panelType.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => clearFilter('panelType')} className="h-7 w-7 p-0 rounded-full hover:bg-slate-100">
                                <X className="h-3.5 w-3.5 text-slate-400" />
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {uniquePanelTypes.map(panel => (
                            <Badge
                                key={panel}
                                variant={filters.panelType.includes(panel) ? "default" : "outline"}
                                className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${filters.panelType.includes(panel)
                                    ? "bg-amber-600 text-white shadow-md shadow-amber-200 border-none"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600"
                                    }`}
                                onClick={() => handleMultiSelect('panelType', panel)}
                            >
                                {panel}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Refresh Rate Filter */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <RotateCw size={16} />
                            </div>
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Rate (Hz)</label>
                        </div>
                        {filters.refreshRate.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => clearFilter('refreshRate')} className="h-7 w-7 p-0 rounded-full hover:bg-slate-100">
                                <X className="h-3.5 w-3.5 text-slate-400" />
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {uniqueRefreshRates.map(rate => (
                            <Badge
                                key={rate}
                                variant={filters.refreshRate.includes(rate) ? "default" : "outline"}
                                className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${filters.refreshRate.includes(rate)
                                    ? "bg-slate-900 text-white shadow-md shadow-slate-200 border-none"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:text-black"
                                    }`}
                                onClick={() => handleMultiSelect('refreshRate', rate)}
                            >
                                {rate}Hz
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Price Range Filter */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <CreditCard size={16} />
                            </div>
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Budget Range</label>
                        </div>
                        {(filters.minPrice > priceRange.min || filters.maxPrice < priceRange.max) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    handleFilterChange('minPrice', priceRange.min);
                                    handleFilterChange('maxPrice', priceRange.max);
                                }}
                                className="h-7 w-7 p-0 rounded-full hover:bg-slate-100"
                            >
                                <X className="h-3.5 w-3.5 text-slate-400" />
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase ml-1">Minimum</span>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={filters.minPrice}
                                    onChange={(e) => handleFilterChange('minPrice', parseInt(e.target.value) || 0)}
                                    disabled={isLoading}
                                    className="bg-slate-50 border-none rounded-xl focus-visible:ring-blue-500 font-bold text-slate-900 pr-10"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">EGP</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase ml-1">Maximum</span>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={filters.maxPrice}
                                    onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value) || priceRange.max)}
                                    disabled={isLoading}
                                    className="bg-slate-50 border-none rounded-xl focus-visible:ring-blue-500 font-bold text-slate-900 pr-10"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">EGP</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}