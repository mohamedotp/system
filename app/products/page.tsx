"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Filter, Loader2, RefreshCw, Monitor, Zap, Tv, ArrowUpDown,
    ChevronUp, ChevronDown, Layers, Star, Scale, ShoppingBag,
    TrendingUp, Award, Info, AlertCircle,
    X
} from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import ProductFilters from "@/components/ProductFilters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Product, FilterState } from "@/types/product";
import { toast } from "sonner";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// دالة لتحويل البيانات
const transformData = (apiData: any[]): Product[] => {
    return apiData.map((item, index) => ({
        brand: item[0] || "",
        screen_size_inch: item[1] || 0,
        resolution: item[2] || "",
        panel_type: item[3] || "",
        refresh_rate_hz: item[4] || 0,
        os_platform: item[5] || "",
        price_date: item[6] || new Date().toISOString(),
        id: item[7] || index + 1,
        last_updated_2b: item[8] || null,
        last_updated_btech: item[9] || null,
        last_updated_sales_cairo: item[10] || null,
        last_updated_amazon: item[11] || null,
        last_updated_st_downtown: item[12] || null,
        last_updated_carfoure: item[13] || null,
        category: item[14] || "TV",
        price_egp: item[15] || 0,
        price_2b: item[16] || null,
        price_btech: item[17] || null,
        price_sales_cairo: item[18] || null,
        price_amazon: item[19] || null,
        price_st_downtown: item[20] || null,
        price_carfoure: item[21] || null,
        price_ranin: item[22] || null,
        last_updated_ranin: item[23] || null,
        price_raya: item[24] || null,
        last_updated_raya: item[25] || null,
        price_rezkallah: item[26] || null,
        last_updated_rezkallah: item[27] || null,
    }));
};

const formatPrice = (price: number | string | null | undefined) => {
    if (price === "oos" || (typeof price === "string" && price.toLowerCase() === "oos")) {
        return "نفذت";
    }
    const num = typeof price === "string" ? parseFloat(price) : price;
    if (num === null || num === undefined || isNaN(num) || num === 0) return "N/A";

    return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        maximumFractionDigits: 0
    }).format(num);
};

const parsePrice = (price: number | string | null | undefined): number => {
    if (!price) return 0;
    if (typeof price === "string") {
        if (price.toLowerCase() === "oos") return 0;
        const p = parseFloat(price);
        return isNaN(p) ? 0 : p;
    }
    return price;
};

export default function ProductsPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [sortField, setSortField] = useState<keyof Product>('price_egp');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [wishlist, setWishlist] = useState<number[]>([]);
    const [compareList, setCompareList] = useState<number[]>([]);
    const [showCompareBar, setShowCompareBar] = useState(false);
    const [showComparePopup, setShowComparePopup] = useState(false);
    const itemsPerPage = 40;

    // Load wishlist from localStorage
    useEffect(() => {
        const savedWishlist = localStorage.getItem('wishlist');
        if (savedWishlist) setWishlist(JSON.parse(savedWishlist));

        const savedCompare = localStorage.getItem('compareList');
        if (savedCompare) setCompareList(JSON.parse(savedCompare));
    }, []);

    // Save wishlist to localStorage
    useEffect(() => {
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }, [wishlist]);

    // Save compare list to localStorage
    useEffect(() => {
        localStorage.setItem('compareList', JSON.stringify(compareList));
        setShowCompareBar(compareList.length >= 2);
    }, [compareList]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/product');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                const transformedData = transformData(result.data);
                setProducts(transformedData);
                setLastUpdated(new Date());
            } else {
                throw new Error(result.error || 'Failed to fetch data');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const applyFilters = useCallback((productsList: Product[], filterState: FilterState) => {
        return productsList.filter(product => {
            if (filterState.category.length > 0 && !filterState.category.includes(product.category)) {
                return false;
            }

            if (filterState.brand.length > 0 && !filterState.brand.includes(product.brand)) {
                return false;
            }

            if (filterState.screenSize.length > 0 && !filterState.screenSize.includes(product.screen_size_inch)) {
                return false;
            }

            if (filterState.resolution.length > 0 && !filterState.resolution.includes(product.resolution)) {
                return false;
            }

            if (filterState.panelType.length > 0 && !filterState.panelType.includes(product.panel_type)) {
                return false;
            }

            if (filterState.refreshRate.length > 0 && !filterState.refreshRate.includes(product.refresh_rate_hz)) {
                return false;
            }

            if (parsePrice(product.price_egp) < filterState.minPrice || parsePrice(product.price_egp) > filterState.maxPrice) {
                return false;
            }

            return true;
        });
    }, []);

    useEffect(() => {
        const filtered = applyFilters(products, filters);
        setFilteredProducts(filtered);
    }, [products, filters, applyFilters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch("/api/auth/me");
                const data = await res.json();
                if (data.success && ["1714", "1732"].includes(String(data.user.empNum))) {
                    setIsAuthorized(true);
                } else {
                    router.push("/");
                }
            } catch (error) {
                router.push("/");
            } finally {
                setIsAuthChecking(false);
            }
        };
        checkAuth();
    }, [router]);

    const handleSort = (field: keyof Product) => {
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedProducts = useMemo(() => {
        return [...filteredProducts].sort((a, b) => {
            let aValue = a[sortField];
            let bValue = b[sortField];

            // Handle numeric parsing for price fields
            if (sortField.startsWith('price')) {
                const aNum = parsePrice(aValue as string | number);
                const bNum = parsePrice(bValue as string | number);
                return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
            }

            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredProducts, sortField, sortDirection]);

    const stats = useMemo(() => {
        if (products.length === 0) return null;

        const totalProducts = products.length;
        const filteredCount = filteredProducts.length;

        const productsWithPrice = filteredProducts.filter(p => parsePrice(p.price_egp) > 0);
        const avgPrice = productsWithPrice.reduce((sum, p) => sum + parsePrice(p.price_egp), 0) / (productsWithPrice.length || 1);
        const brands = [...new Set(filteredProducts.map(p => p.brand))];

        const validPrices = filteredProducts.map(p => parsePrice(p.price_egp)).filter(p => p > 0);

        return {
            totalProducts,
            filteredCount,
            avgPrice: Math.round(avgPrice),
            brands: brands.length,
            minPrice: validPrices.length > 0 ? Math.min(...validPrices) : 0,
            maxPrice: validPrices.length > 0 ? Math.max(...validPrices) : 0,
        };
    }, [products, filteredProducts]);

    // Best Value Picks
    // Best Value Picks
    const bestValuePicks = useMemo(() => {
        if (filteredProducts.length === 0) return null;

        const cheapest = [...filteredProducts]
            .filter(p => parsePrice(p.price_egp) > 0)
            .sort((a, b) => parsePrice(a.price_egp) - parsePrice(b.price_egp))[0];

        const bestSpecs = [...filteredProducts].sort((a, b) =>
            b.refresh_rate_hz - a.refresh_rate_hz || parsePrice(b.price_egp) - parsePrice(a.price_egp)
        )[0];

        const bestDeal = [...filteredProducts]
            .map(p => {
                const storePrices = [
                    { store: '2B', price: parsePrice(p.price_2b) },
                    { store: 'B.Tech', price: parsePrice(p.price_btech) },
                    { store: 'Sales Cairo', price: parsePrice(p.price_sales_cairo) },
                    { store: 'Amazon', price: parsePrice(p.price_amazon) },
                    { store: 'ST Downtown', price: parsePrice(p.price_st_downtown) },
                    { store: 'Carrefour', price: parsePrice(p.price_carfoure) },
                    { store: 'Ranin', price: parsePrice(p.price_ranin) },
                    { store: 'Raya', price: parsePrice(p.price_raya) },
                    { store: 'Rezkallah', price: parsePrice(p.price_rezkallah) }
                ].filter(item => item.price > 0);

                let minStorePrice = parsePrice(p.price_egp);
                let bestStore = 'Base';

                if (storePrices.length > 0) {
                    const best = storePrices.reduce((min, curr) =>
                        curr.price < min.price ? curr : min, { store: 'Base', price: minStorePrice }
                    );
                    minStorePrice = best.price;
                    bestStore = best.store;
                }

                const saving = parsePrice(p.price_egp) - minStorePrice;

                return {
                    ...p,
                    saving,
                    minStorePrice,
                    bestStore
                };
            })
            .filter(p => p.saving > 0)
            .sort((a, b) => b.saving - a.saving)[0];

        return { cheapest, bestSpecs, bestDeal };
    }, [filteredProducts]);

    // Price indicator function
    const getPriceIndicator = (product: Product, price: number | string | null | undefined, storeName: string) => {
        const pVal = parsePrice(price);
        if (pVal === 0) return { icon: "🚫", color: "text-slate-400", text: "نفذت الكمية", tooltip: "غير متوفر حالياً" };

        const allPrices = [
            parsePrice(product.price_egp),
            parsePrice(product.price_2b),
            parsePrice(product.price_btech),
            parsePrice(product.price_sales_cairo),
            parsePrice(product.price_amazon),
            parsePrice(product.price_st_downtown),
            parsePrice(product.price_carfoure),
            parsePrice(product.price_ranin),
            parsePrice(product.price_raya),
            parsePrice(product.price_rezkallah)
        ].filter(p => p > 0);

        const avgPrice = allPrices.reduce((a, b) => a + b, 0) / (allPrices.length || 1);

        if (pVal < avgPrice * 0.95) return { icon: "🔥", color: "text-red-500", text: "أقل من المتوسط", tooltip: "أفضل سعر!" };
        if (pVal > avgPrice * 1.05) return { icon: "⚠️", color: "text-amber-500", text: "أعلى من المتوسط", tooltip: "سعر مرتفع" };
        return { icon: "✅", color: "text-green-500", text: "سعر متوسط", tooltip: "سعر معقول" };
    };

    // Availability function
    const getAvailability = (product: Product) => {
        const stores = [
            parsePrice(product.price_2b) > 0 && '2B',
            parsePrice(product.price_btech) > 0 && 'B.Tech',
            parsePrice(product.price_sales_cairo) > 0 && 'Sales Cairo',
            parsePrice(product.price_amazon) > 0 && 'Amazon',
            parsePrice(product.price_st_downtown) > 0 && 'ST Downtown',
            parsePrice(product.price_carfoure) > 0 && 'Carrefour',
            parsePrice(product.price_ranin) > 0 && 'Ranin',
            parsePrice(product.price_raya) > 0 && 'Raya',
            parsePrice(product.price_rezkallah) > 0 && 'Rezkallah'
        ].filter(Boolean);

        return stores.length;
    };

    // Resolution quality function
    const getResolutionQuality = (resolution: string) => {
        if (resolution.includes('8K')) return { width: '100%', color: 'bg-purple-500', label: '4320p' };
        if (resolution.includes('4K')) return { width: '75%', color: 'bg-indigo-500', label: '2160p' };
        if (resolution.includes('FHD') || resolution.includes('1080')) return { width: '50%', color: 'bg-blue-500', label: '1080p' };
        if (resolution.includes('HD')) return { width: '25%', color: 'bg-green-500', label: '720p' };
        return { width: '10%', color: 'bg-slate-500', label: 'SD' };
    };

    // Wishlist functions
    const toggleWishlist = (id: number, brand: string) => {
        const newWishlist = wishlist.includes(id)
            ? wishlist.filter(w => w !== id)
            : [...wishlist, id];

        setWishlist(newWishlist);

        if (wishlist.includes(id)) {
            toast.success(`Removed ${brand} from wishlist`);
        } else {
            toast.success(`Added ${brand} to wishlist`);
        }
    };

    // Compare functions
    const toggleCompare = (product: Product) => {
        if (compareList.includes(product.id)) {
            setCompareList(compareList.filter(id => id !== product.id));
            toast.success(`Removed ${product.brand} from comparison`);
        } else {
            if (compareList.length < 3) {
                setCompareList([...compareList, product.id]);
                toast.success(`Added ${product.brand} to comparison`);
            } else {
                toast.warning("يمكن مقارنة 3 منتجات فقط");
            }
        }
    };
    const clearCompare = () => {
        setCompareList([]);
        toast.info("Comparison list cleared");
    };

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    if (isAuthChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!isAuthorized) return null;



    // Pagination calculations
    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-slate-900 selection:bg-blue-100 p-4 md:p-8">
                <div className="max-w-[1600px] mx-auto animate-slow-fade">
                    {/* Header Section */}
                    <div className="mb-10">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                            <div className="space-y-1">
                                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    Model Search System
                                </h1>
                                {/* {lastUpdated && (
                                    // <p className="text-slate-400 text-sm font-medium">
                                    //     آخر تحديث: {formatDate(lastUpdated.toISOString())}
                                    // </p>
                                )} */}
                            </div>

                            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl soft-shadow border border-white/50">
                                <Link
                                    href="/products/manage"
                                    className="inline-flex items-center justify-center rounded-xl bg-transparent hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all active:scale-95 text-slate-600 font-semibold h-10 px-4 py-2"
                                >
                                    <Layers className="h-5 w-5 mr-2" />
                                    Manage Data
                                </Link>

                                <Button
                                    onClick={fetchData}
                                    disabled={isLoading}
                                    variant="ghost"
                                    className="rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all active:scale-95"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                    ) : (
                                        <RefreshCw className="h-5 w-5 text-blue-600" />
                                    )}
                                    <span className="ml-2 font-semibold">Sync Data</span>
                                </Button>
                            </div>
                        </div>

                        {/* Stats Dashboard */}

                        {!isLoading && bestValuePicks && filteredProducts.length > 0 && (
                            <div className="space-y-4 mb-6">
                                {/* Active Results - فوق الكروت */}
                                <div className="flex items-center gap-3">
                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-2 rounded-xl shadow-lg shadow-indigo-200">
                                        <Filter className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Active Results</span>
                                        <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                            {filteredProducts.length}
                                        </div>
                                    </div>
                                </div>

                                {/* Best Value Picks */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Best Budget */}
                                    <Card className="border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50/30 hover:shadow-lg transition-all">
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className="bg-green-600 text-white">💰 اقل سعر</Badge>
                                            </div>
                                            <div className="font-bold text-lg">{bestValuePicks.cheapest.brand} {bestValuePicks.cheapest.screen_size_inch}"</div>
                                            <div className="text-2xl font-black text-green-700">{formatPrice(bestValuePicks.cheapest.price_egp)}</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {bestValuePicks.cheapest.resolution} • {bestValuePicks.cheapest.panel_type}
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Highest Specs */}
                                    <Card className="border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50/30 hover:shadow-lg transition-all">
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className="bg-purple-600 text-white">⚡ اعلى مواصفات</Badge>
                                            </div>
                                            <div className="font-bold text-lg">{bestValuePicks.bestSpecs.brand} {bestValuePicks.bestSpecs.screen_size_inch}"</div>
                                            <div className="text-2xl font-black text-purple-700">{bestValuePicks.bestSpecs.refresh_rate_hz}Hz</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {bestValuePicks.bestSpecs.resolution} • {bestValuePicks.bestSpecs.panel_type}
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Best Deal */}
                                    {bestValuePicks.bestDeal ? (
                                        <Card className="border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/30 hover:shadow-lg transition-all">
                                            <div className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className="bg-amber-600 text-white">🎯 افضل سعر</Badge>
                                                </div>
                                                <div className="font-bold text-lg">{bestValuePicks.bestDeal.brand} {bestValuePicks.bestDeal.screen_size_inch}"</div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-2xl font-black text-amber-700">
                                                        {formatPrice(bestValuePicks.bestDeal.minStorePrice)} من  {bestValuePicks.bestDeal.bestStore}
                                                    </span>
                                                    <span className="text-xs line-through text-slate-400">
                                                        بدلا من {formatPrice(bestValuePicks.bestDeal.price_egp)}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-green-600 font-bold mt-1">
                                                    وفر {formatPrice(bestValuePicks.bestDeal.saving)}
                                                </div>
                                            </div>
                                        </Card>
                                    ) : (
                                        <Card className="border border-slate-200 bg-slate-50">
                                            <div className="p-4 text-center text-slate-400">
                                                <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                <div className="text-sm">No deals available</div>
                                            </div>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Error Banner */}
                    {error && (
                        <Card className="mb-8 border-none bg-red-50 text-red-900 shadow-md animate-bounce-short">
                            <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-red-100 rounded-full">
                                        <AlertCircle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg leading-none mb-1">System Interruption</p>
                                        <p className="opacity-80 text-sm">{error}</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={fetchData}
                                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg transition-transform active:scale-95"
                                >
                                    Reconnect Database
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Main Experience Area */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">
                        {/* Filters Pane */}
                        <aside className="lg:col-span-1 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="soft-shadow rounded-3xl overflow-hidden bg-white border border-slate-100">
                                <ProductFilters
                                    products={products}
                                    onFilterChange={setFilters}
                                    isLoading={isLoading}
                                />
                            </div>

                            {/* Wishlist Summary */}
                            {/* Wishlist Summary */}
                            {wishlist.length > 0 && (
                                <Card className="mt-4 p-4 bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Star className="h-4 w-4 text-yellow-600 fill-current" />
                                        <span className="font-bold text-sm">Wishlist ({wishlist.length})</span>
                                    </div>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {products
                                            .filter(p => wishlist.includes(p.id))
                                            .map(p => (
                                                <div key={p.id} className="text-xs bg-white p-2 rounded-lg flex justify-between items-center">
                                                    <span className="font-medium">{p.brand} {p.screen_size_inch}"</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-5 w-5 text-red-500 hover:bg-red-50"
                                                        onClick={() => toggleWishlist(p.id, p.brand)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                    </div>
                                </Card>
                            )}
                        </aside>

                        {/* Content Hub */}
                        <div className="lg:col-span-3 space-y-8">
                            <Card className="border-none soft-shadow bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden">
                                <CardHeader className="p-8 border-b border-slate-50 bg-gradient-to-r from-blue-50/50 via-indigo-50/50 to-purple-50/50">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-200">
                                                <Monitor className="h-7 w-7 text-white" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                                    Electronic Catalogue
                                                </CardTitle>
                                                <p className="text-slate-400 text-sm font-medium">
                                                    Showing {filteredProducts.length} premium entities
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2 rounded-xl border border-amber-200/50">
                                            <Zap className="h-4 w-4 text-amber-600" />
                                            <span className="text-sm font-bold text-slate-600 capitalize">
                                                Sort: {sortField.replace(/_/g, ' ')}
                                            </span>
                                            <div className="h-4 w-px bg-amber-200 mx-2" />
                                            {sortDirection === 'asc' ? (
                                                <ChevronUp className="h-5 w-5 text-blue-600" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-blue-600" />
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-0">
                                    {/* Top Pagination */}
                                    {!isLoading && filteredProducts.length > 0 && totalPages > 1 && (
                                        <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-blue-50/30 via-indigo-50/30 to-purple-50/30">
                                            <div className="text-xs font-bold text-slate-400">
                                                Page <span className="text-blue-600">{currentPage}</span> of <span className="text-indigo-600">{totalPages}</span>
                                            </div>
                                            <Pagination className="justify-end">
                                                <PaginationContent>
                                                    <PaginationItem>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                            disabled={currentPage === 1}
                                                            className="h-8 w-8 p-0 rounded-lg hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100"
                                                        >
                                                            <ChevronDown className="h-4 w-4 rotate-90" />
                                                        </Button>
                                                    </PaginationItem>
                                                    <PaginationItem>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                            disabled={currentPage === totalPages}
                                                            className="h-8 w-8 p-0 rounded-lg hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100"
                                                        >
                                                            <ChevronDown className="h-4 w-4 -rotate-90" />
                                                        </Button>
                                                    </PaginationItem>
                                                </PaginationContent>
                                            </Pagination>
                                        </div>
                                    )}

                                    {isLoading ? (
                                        <div className="p-8 space-y-6">
                                            {[...Array(6)].map((_, i) => (
                                                <div key={i} className="flex items-center gap-6 p-4 rounded-2xl bg-slate-50/50">
                                                    <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
                                                    <div className="space-y-2 flex-1">
                                                        <Skeleton className="h-5 w-1/3" />
                                                        <Skeleton className="h-4 w-1/4" />
                                                    </div>
                                                    <Skeleton className="h-10 w-24 rounded-lg" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : paginatedProducts.length === 0 ? (
                                        <div className="py-32 text-center">
                                            <div className="bg-slate-50 inline-flex p-8 rounded-full mb-6">
                                                <Tv className="h-16 w-16 text-slate-300" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-slate-800">Clear Skies</h3>
                                            <p className="text-slate-500 mt-2 max-w-xs mx-auto">
                                                No products match your current configuration. Try reset filters.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900">
                                                    <TableRow className="hover:bg-transparent border-slate-700">
                                                        <TableHead className="w-[30px] py-5 px-2 border-r border-slate-600"></TableHead>
                                                        {[
                                                            { id: "brand", label: "Brand", align: "w-[100px]" },
                                                            { id: "screen_size_inch", label: "Size", align: "w-[60px]" },
                                                            { id: "resolution", label: "Display", align: "w-[100px]" },
                                                            { id: "panel_type", label: "Panel", align: "w-[70px]" },
                                                            { id: "refresh_rate_hz", label: "Hz", align: "w-[50px]" },
                                                            { id: "availability", label: "Stores", align: "w-[60px]" },
                                                            { id: "prices", label: "Prices", align: "min-w-[320px]" },
                                                        ].map((head) => (
                                                            <TableHead key={head.id} className={`${head.align} py-5 px-2 border-r border-slate-600 last:border-r-0`}>
                                                                {head.id !== "prices" && head.id !== "availability" ? (
                                                                    <button
                                                                        onClick={() => handleSort(head.id as keyof Product)}
                                                                        className="flex items-center gap-1 text-slate-100 hover:text-white transition-colors font-bold uppercase tracking-widest text-[9px]"
                                                                    >
                                                                        {head.label}
                                                                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-slate-100 font-bold uppercase tracking-widest text-[9px]">
                                                                        {head.label}
                                                                    </span>
                                                                )}
                                                            </TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {paginatedProducts.map((product, idx) => {
                                                        const availability = getAvailability(product);
                                                        const resolutionQuality = getResolutionQuality(product.resolution);

                                                        return (
                                                            <TableRow
                                                                key={product.id}
                                                                className={`group hover:bg-gradient-to-r hover:from-blue-50/50 hover:via-indigo-50/50 hover:to-purple-50/50 border-slate-200 transition-all duration-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                                                            >
                                                                {/* Actions Column */}
                                                                <TableCell className="py-3 px-2 border-r border-slate-200">
                                                                    <div className="flex flex-col gap-1">
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    size="icon"
                                                                                    variant="ghost"
                                                                                    className={`h-6 w-6 rounded-lg ${wishlist.includes(product.id)
                                                                                        ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                                                                        : 'bg-slate-100 text-slate-400 hover:bg-yellow-50 hover:text-yellow-600'
                                                                                        }`}
                                                                                    onClick={() => toggleWishlist(product.id, product.brand)}
                                                                                >
                                                                                    <Star className={`h-3 w-3 ${wishlist.includes(product.id) ? 'fill-current' : ''}`} />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>{wishlist.includes(product.id) ? 'Remove from' : 'Add to'} wishlist</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>

                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    size="icon"
                                                                                    variant="ghost"
                                                                                    className={`h-6 w-6 rounded-lg ${compareList.includes(product.id)
                                                                                        ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                                                                        : 'bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600'
                                                                                        }`}
                                                                                    onClick={() => toggleCompare(product)}
                                                                                >
                                                                                    <Scale className="h-3 w-3" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>{compareList.includes(product.id) ? 'Remove from' : 'Add to'} compare</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </div>
                                                                </TableCell>

                                                                <TableCell className="py-3 px-2 border-r border-slate-200">
                                                                    <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors text-xs">
                                                                        {product.brand}
                                                                    </div>
                                                                </TableCell>

                                                                <TableCell className="px-2 text-center border-r border-slate-200">
                                                                    <Badge variant="outline" className="rounded-lg border-slate-200 bg-white text-slate-700 font-bold px-1.5 py-0.5 text-[10px]">
                                                                        {product.screen_size_inch}"
                                                                    </Badge>
                                                                </TableCell>

                                                                <TableCell className="px-2 border-r border-slate-200">
                                                                    <div className="space-y-1">
                                                                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 rounded-lg text-[9px] px-1.5 py-0.5 w-full justify-between">
                                                                            <span>{product.resolution}</span>
                                                                            <span className="text-[6px] opacity-60">
                                                                                {resolutionQuality.label}
                                                                            </span>
                                                                        </Badge>
                                                                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full ${resolutionQuality.color} rounded-full`}
                                                                                style={{ width: resolutionQuality.width }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </TableCell>

                                                                <TableCell className="px-2 border-r border-slate-200">
                                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 rounded-lg text-[9px] px-1.5 py-0.5">
                                                                        {product.panel_type}
                                                                    </Badge>
                                                                </TableCell>

                                                                <TableCell className="px-2 border-r border-slate-200">
                                                                    <div className="flex items-center gap-1 text-slate-700">
                                                                        <div className="p-0.5 bg-amber-100 rounded-md">
                                                                            <Zap className="h-2 w-2 text-amber-600" />
                                                                        </div>
                                                                        <span className="font-bold text-[10px]">{product.refresh_rate_hz}Hz</span>
                                                                    </div>
                                                                </TableCell>

                                                                <TableCell className="px-2 border-r border-slate-200">
                                                                    <Badge className={`text-[8px] ${availability >= 4 ? 'bg-green-100 text-green-700' :
                                                                        availability >= 2 ? 'bg-yellow-100 text-yellow-700' :
                                                                            'bg-red-100 text-red-700'
                                                                        }`}>
                                                                        {availability}/9 متاجر
                                                                    </Badge>
                                                                </TableCell>

                                                                <TableCell className="px-2">
                                                                    <div className="grid grid-cols-2 gap-1 min-w-[300px]">
                                                                        {/* Base Price */}
                                                                        <div className="bg-blue-50 rounded-lg p-1 border border-blue-100">
                                                                            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Base</div>
                                                                            <div className="font-black text-blue-700 text-[15px] leading-tight">
                                                                                {formatPrice(product.price_egp)}
                                                                            </div>
                                                                        </div>

                                                                        {/* 2B Price */}
                                                                        {product.price_2b && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <div className="bg-purple-50 rounded-lg p-1 border border-purple-100 cursor-help">
                                                                                        <div className="flex justify-between items-start">
                                                                                            <div className="text-[10px] font-bold text-purple-600 uppercase">2B</div>
                                                                                            <span className={`text-[10px] ${getPriceIndicator(product, product.price_2b, '2B').color}`}>
                                                                                                {getPriceIndicator(product, product.price_2b, '2B').icon}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="font-black text-purple-700 text-[15px] leading-tight">
                                                                                            {formatPrice(product.price_2b)}
                                                                                        </div>
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p>{getPriceIndicator(product, product.price_2b, '2B').tooltip}</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        )}

                                                                        {/* B.Tech Price */}
                                                                        {product.price_btech && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <div className="bg-indigo-50 rounded-lg p-1 border border-indigo-100 cursor-help">
                                                                                        <div className="flex justify-between items-start">
                                                                                            <div className="text-[10px] font-bold text-indigo-600 uppercase">B.Tech</div>
                                                                                            <span className={`text-[10px] ${getPriceIndicator(product, product.price_btech, 'B.Tech').color}`}>
                                                                                                {getPriceIndicator(product, product.price_btech, 'B.Tech').icon}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="font-black text-indigo-700 text-[15px] leading-tight">
                                                                                            {formatPrice(product.price_btech)}
                                                                                        </div>
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p>{getPriceIndicator(product, product.price_btech, 'B.Tech').tooltip}</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        )}

                                                                        {/* Sales Cairo Price */}
                                                                        {product.price_sales_cairo && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <div className="bg-green-50 rounded-lg p-1 border border-green-100 cursor-help">
                                                                                        <div className="flex justify-between items-start">
                                                                                            <div className="text-[10px] font-bold text-green-600 uppercase">Sales</div>
                                                                                            <span className={`text-[10px] ${getPriceIndicator(product, product.price_sales_cairo, 'Sales').color}`}>
                                                                                                {getPriceIndicator(product, product.price_sales_cairo, 'Sales').icon}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="font-black text-green-700 text-[15px] leading-tight">
                                                                                            {formatPrice(product.price_sales_cairo)}
                                                                                        </div>
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p>{getPriceIndicator(product, product.price_sales_cairo, 'Sales').tooltip}</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        )}

                                                                        {/* Amazon Price */}
                                                                        {product.price_amazon && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <div className="bg-yellow-50 rounded-lg p-1 border border-yellow-100 cursor-help">
                                                                                        <div className="flex justify-between items-start">
                                                                                            <div className="text-[10px] font-bold text-yellow-600 uppercase">Amazon</div>
                                                                                            <span className={`text-[10px] ${getPriceIndicator(product, product.price_amazon, 'Amazon').color}`}>
                                                                                                {getPriceIndicator(product, product.price_amazon, 'Amazon').icon}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="font-black text-yellow-700 text-[15px] leading-tight">
                                                                                            {formatPrice(product.price_amazon)}
                                                                                        </div>
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p>{getPriceIndicator(product, product.price_amazon, 'Amazon').tooltip}</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        )}

                                                                        {/* ST Downtown Price */}
                                                                        {product.price_st_downtown && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <div className="bg-red-50 rounded-lg p-1 border border-red-100 cursor-help">
                                                                                        <div className="flex justify-between items-start">
                                                                                            <div className="text-[10px] font-bold text-red-600 uppercase">ST</div>
                                                                                            <span className={`text-[10px] ${getPriceIndicator(product, product.price_st_downtown, 'ST').color}`}>
                                                                                                {getPriceIndicator(product, product.price_st_downtown, 'ST').icon}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="font-black text-red-700 text-[15px] leading-tight">
                                                                                            {formatPrice(product.price_st_downtown)}
                                                                                        </div>
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p>{getPriceIndicator(product, product.price_st_downtown, 'ST').tooltip}</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        )}

                                                                        {/* Carrefour Price */}
                                                                        {product.price_carfoure && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <div className="bg-orange-50 rounded-lg p-1 border border-orange-100 cursor-help">
                                                                                        <div className="flex justify-between items-start">
                                                                                            <div className="text-[10px] font-bold text-orange-600 uppercase">Carrefour</div>
                                                                                            <span className={`text-[10px] ${getPriceIndicator(product, product.price_carfoure, 'Carrefour').color}`}>
                                                                                                {getPriceIndicator(product, product.price_carfoure, 'Carrefour').icon}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="font-black text-orange-700 text-[15px] leading-tight">
                                                                                            {formatPrice(product.price_carfoure)}
                                                                                        </div>
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p>{getPriceIndicator(product, product.price_carfoure, 'Carrefour').tooltip}</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        )}

                                                                        {/* Ranin Price */}
                                                                        {product.price_ranin && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <div className="bg-emerald-50 rounded-lg p-1 border border-emerald-100 cursor-help">
                                                                                        <div className="flex justify-between items-start">
                                                                                            <div className="text-[10px] font-bold text-emerald-600 uppercase">Ranin</div>
                                                                                            <span className={`text-[10px] ${getPriceIndicator(product, product.price_ranin, 'Ranin').color}`}>
                                                                                                {getPriceIndicator(product, product.price_ranin, 'Ranin').icon}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="font-black text-emerald-700 text-[15px] leading-tight">
                                                                                            {formatPrice(product.price_ranin)}
                                                                                        </div>
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p>{getPriceIndicator(product, product.price_ranin, 'Ranin').tooltip}</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        )}

                                                                        {/* Raya Price */}
                                                                        {product.price_raya && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <div className="bg-sky-50 rounded-lg p-1 border border-sky-100 cursor-help">
                                                                                        <div className="flex justify-between items-start">
                                                                                            <div className="text-[10px] font-bold text-sky-600 uppercase">Raya</div>
                                                                                            <span className={`text-[10px] ${getPriceIndicator(product, product.price_raya, 'Raya').color}`}>
                                                                                                {getPriceIndicator(product, product.price_raya, 'Raya').icon}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="font-black text-sky-700 text-[15px] leading-tight">
                                                                                            {formatPrice(product.price_raya)}
                                                                                        </div>
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p>{getPriceIndicator(product, product.price_raya, 'Raya').tooltip}</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        )}

                                                                        {/* Rezkallah Price */}
                                                                        {product.price_rezkallah && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <div className="bg-indigo-50 rounded-lg p-1 border border-indigo-100 cursor-help">
                                                                                        <div className="flex justify-between items-start">
                                                                                            <div className="text-[10px] font-bold text-indigo-600 uppercase">Rezkallah</div>
                                                                                            <span className={`text-[10px] ${getPriceIndicator(product, product.price_rezkallah, 'Rezkallah').color}`}>
                                                                                                {getPriceIndicator(product, product.price_rezkallah, 'Rezkallah').icon}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="font-black text-indigo-700 text-[15px] leading-tight">
                                                                                            {formatPrice(product.price_rezkallah)}
                                                                                        </div>
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p>{getPriceIndicator(product, product.price_rezkallah, 'Rezkallah').tooltip}</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>

                                {/* Bottom Pagination */}
                                {!isLoading && filteredProducts.length > 0 && totalPages > 1 && (
                                    <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                                        <div className="text-sm font-bold text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-100 soft-shadow">
                                            Showing <span className="text-slate-900">{startIndex + 1}-{Math.min(endIndex, sortedProducts.length)}</span> of <span className="text-slate-900">{sortedProducts.length}</span> results
                                        </div>
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                        className={`hover:bg-white rounded-xl transition-all ${currentPage === 1 ? 'pointer-events-none opacity-20' : 'cursor-pointer soft-shadow-hover'}`}
                                                    />
                                                </PaginationItem>

                                                {[...Array(totalPages)].map((_, index) => {
                                                    const pageNumber = index + 1;
                                                    if (
                                                        pageNumber === 1 ||
                                                        pageNumber === totalPages ||
                                                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                                                    ) {
                                                        return (
                                                            <PaginationItem key={pageNumber}>
                                                                <PaginationLink
                                                                    onClick={() => setCurrentPage(pageNumber)}
                                                                    isActive={currentPage === pageNumber}
                                                                    className={`rounded-xl transition-all cursor-pointer ${currentPage === pageNumber ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 border-none' : 'hover:bg-white bg-transparent'}`}
                                                                >
                                                                    {pageNumber}
                                                                </PaginationLink>
                                                            </PaginationItem>
                                                        );
                                                    } else if (
                                                        pageNumber === currentPage - 2 ||
                                                        pageNumber === currentPage + 2
                                                    ) {
                                                        return (
                                                            <PaginationItem key={pageNumber}>
                                                                <PaginationEllipsis />
                                                            </PaginationItem>
                                                        );
                                                    }
                                                    return null;
                                                })}

                                                <PaginationItem>
                                                    <PaginationNext
                                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                        className={`hover:bg-white rounded-xl transition-all ${currentPage === totalPages ? 'pointer-events-none opacity-20' : 'cursor-pointer soft-shadow-hover'}`}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>

                    {/* Compare Bar */}
                    {/* Compare Bar */}
                    {showCompareBar && (
                        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
                            <Card className="bg-blue-600 text-white border-none shadow-2xl">
                                <div className="px-6 py-3 flex items-center gap-4">
                                    <Scale className="h-5 w-5" />
                                    <span className="font-bold">{compareList.length} منتجات للمقارنة</span>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="bg-white text-blue-600 hover:bg-blue-50 rounded-lg"
                                        onClick={() => setShowComparePopup(true)}
                                    >
                                        مقارنة
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-white/80 hover:text-white hover:bg-blue-700"
                                        onClick={clearCompare}
                                    >
                                        Clear
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )}


                </div>


            </div>
            {/* Compare Popup */}
            {/* Compare Popup */}
            <Dialog open={showComparePopup} onOpenChange={setShowComparePopup}>
                <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="sticky top-0 bg-white z-10 pb-4 border-b">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Scale className="h-6 w-6 text-blue-600" />
                            مقارنة المنتجات
                        </DialogTitle>
                        <DialogDescription>
                            قارن بين {compareList.length} منتجات واختر الأفضل لك
                        </DialogDescription>
                    </DialogHeader>

                    {compareList.length === 0 ? (
                        <div className="py-12 text-center">
                            <ShoppingBag className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">لا توجد منتجات للمقارنة</p>
                        </div>
                    ) : (
                        <div className="py-6">
                            {/* جدول المقارنة */}
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    {/* Header - أسماء المنتجات */}
                                    <thead>
                                        <tr className="bg-slate-100 font-black">
                                            <th className="p-4 text-right text-slate-900 border-b-2 border-slate-200 sticky right-0 bg-slate-100 z-20 min-w-[180px]">المواصفات التقنية</th>
                                            {products
                                                .filter(p => compareList.includes(p.id))
                                                .map(product => (
                                                    <th key={`header-${product.id}`} className="p-6 text-center border-r border-slate-200 border-b-2 relative group bg-white">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md mb-1">
                                                                <Monitor className="h-5 w-5" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-xl text-slate-900 tracking-tight">{product.brand}</span>
                                                                <div className="flex justify-center">
                                                                    <Badge variant="secondary" className="px-3 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">{product.category}</Badge>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="absolute -top-2 -right-2 h-6 w-6 text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => {
                                                                    toggleCompare(product);
                                                                    if (compareList.length === 1) {
                                                                        setShowComparePopup(false);
                                                                    }
                                                                }}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </th>
                                                ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* المقاس */}
                                        <tr className="hover:bg-slate-50/50">
                                            <td className="p-4 font-bold text-slate-500 bg-slate-50/80 sticky right-0 z-10 border-l border-slate-200">المقاس</td>
                                            {products
                                                .filter(p => compareList.includes(p.id))
                                                .map(product => (
                                                    <td key={`size-${product.id}`} className="p-4 text-center border-r">
                                                        <span className="font-bold text-lg">{product.screen_size_inch}"</span>
                                                    </td>
                                                ))}
                                        </tr>

                                        {/* الدقة */}
                                        <tr className="hover:bg-slate-50/50">
                                            <td className="p-4 font-bold text-slate-500 bg-slate-50/80 sticky right-0 z-10 border-l border-slate-200">الدقة</td>
                                            {products
                                                .filter(p => compareList.includes(p.id))
                                                .map(product => (
                                                    <td key={`res-${product.id}`} className="p-4 text-center border-r">
                                                        <Badge variant="outline" className="bg-indigo-50">
                                                            {product.resolution}
                                                        </Badge>
                                                    </td>
                                                ))}
                                        </tr>

                                        {/* نوع البانيل */}
                                        <tr className="hover:bg-slate-50/50">
                                            <td className="p-4 font-bold text-slate-500 bg-slate-50/80 sticky right-0 z-10 border-l border-slate-200">نوع البانيل</td>
                                            {products
                                                .filter(p => compareList.includes(p.id))
                                                .map(product => (
                                                    <td key={`panel-${product.id}`} className="p-4 text-center border-r">
                                                        <span className="font-semibold">{product.panel_type}</span>
                                                    </td>
                                                ))}
                                        </tr>

                                        {/* هرتز */}
                                        <tr className="hover:bg-slate-50/50">
                                            <td className="p-4 font-bold text-slate-500 bg-slate-50/80 sticky right-0 z-10 border-l border-slate-200">هرتز</td>
                                            {products
                                                .filter(p => compareList.includes(p.id))
                                                .map(product => (
                                                    <td key={`hz-${product.id}`} className="p-4 text-center border-r">
                                                        <span className="font-bold text-purple-600">{product.refresh_rate_hz}Hz</span>
                                                    </td>
                                                ))}
                                        </tr>

                                        {/* نظام التشغيل */}
                                        <tr className="hover:bg-slate-50/50">
                                            <td className="p-4 font-bold text-slate-500 bg-slate-50/80 sticky right-0 z-10 border-l border-slate-200">نظام التشغيل</td>
                                            {products
                                                .filter(p => compareList.includes(p.id))
                                                .map(product => (
                                                    <td key={`os-${product.id}`} className="p-4 text-center border-r">
                                                        <span className="font-semibold">{product.os_platform || "N/A"}</span>
                                                    </td>
                                                ))}
                                        </tr>

                                        {/* الأسعار */}
                                        <tr className="border-b">
                                            <td className="p-4 font-black text-slate-800 bg-slate-100/50 align-top">الأسعار في المتاجر</td>
                                            {products
                                                .filter(p => compareList.includes(p.id))
                                                .map(product => {
                                                    // تجميع الأسعار من كل المصادر المتاحة
                                                    const allPrices = [
                                                        { store: 'الأساسي', price: parsePrice(product.price_egp), color: 'blue' },
                                                        { store: '2B', price: parsePrice(product.price_2b), color: 'purple' },
                                                        { store: 'B.Tech', price: parsePrice(product.price_btech), color: 'indigo' },
                                                        { store: 'Sales Cairo', price: parsePrice(product.price_sales_cairo), color: 'emerald' },
                                                        { store: 'Amazon', price: parsePrice(product.price_amazon), color: 'yellow' },
                                                        { store: 'ST Downtown', price: parsePrice(product.price_st_downtown), color: 'red' },
                                                        { store: 'Carrefour', price: parsePrice(product.price_carfoure), color: 'orange' },
                                                        { store: 'Ranin', price: parsePrice(product.price_ranin), color: 'emerald' },
                                                        { store: 'Raya', price: parsePrice(product.price_raya), color: 'blue' },
                                                        { store: 'Rezkallah', price: parsePrice(product.price_rezkallah), color: 'indigo' },
                                                    ].filter(p => p.price > 0);

                                                    // إيجاد أفضل سعر
                                                    const bestPrice = allPrices.length > 0
                                                        ? allPrices.reduce((min, p) => p.price < min.price ? p : min, allPrices[0])
                                                        : null;

                                                    return (
                                                        <td key={`prices-${product.id}`} className="p-4 text-center border-r align-top min-w-[200px]">
                                                            <div className="space-y-3">
                                                                {/* كل الأسعار في قائمة عمودية لتفادي التداخل */}
                                                                <div className="flex flex-col gap-2">
                                                                    {allPrices.map(price => (
                                                                        <div
                                                                            key={price.store}
                                                                            className={`
                                                                                flex items-center justify-between p-2 rounded-xl border transition-all
                                                                                ${price.color === 'blue' ? 'bg-blue-50 border-blue-100' : ''}
                                                                                ${price.color === 'purple' ? 'bg-purple-50 border-purple-100' : ''}
                                                                                ${price.color === 'indigo' ? 'bg-indigo-50 border-indigo-100' : ''}
                                                                                ${price.color === 'emerald' ? 'bg-emerald-50 border-emerald-100' : ''}
                                                                                ${price.color === 'yellow' ? 'bg-yellow-50 border-yellow-100' : ''}
                                                                                ${price.color === 'red' ? 'bg-red-50 border-red-100' : ''}
                                                                                ${price.color === 'orange' ? 'bg-orange-50 border-orange-100' : ''}
                                                                            `}
                                                                        >
                                                                            <span className={`text-[10px] font-black uppercase ${price.color === 'blue' ? 'text-blue-600' :
                                                                                price.color === 'purple' ? 'text-purple-600' :
                                                                                    price.color === 'indigo' ? 'text-indigo-600' :
                                                                                        price.color === 'emerald' ? 'text-emerald-600' :
                                                                                            price.color === 'yellow' ? 'text-yellow-700' :
                                                                                                price.color === 'red' ? 'text-red-700' :
                                                                                                    'text-orange-700'
                                                                                }`}>
                                                                                {price.store}
                                                                            </span>
                                                                            <span className={`font-black text-xs ${price.color === 'blue' ? 'text-blue-700' :
                                                                                price.color === 'purple' ? 'text-purple-700' :
                                                                                    price.color === 'indigo' ? 'text-indigo-700' :
                                                                                        price.color === 'emerald' ? 'text-emerald-700' :
                                                                                            price.color === 'yellow' ? 'text-yellow-800' :
                                                                                                price.color === 'red' ? 'text-red-800' :
                                                                                                    'text-orange-800'
                                                                                }`}>
                                                                                {formatPrice(price.price)}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* أفضل سعر تم اختياره */}
                                                                {bestPrice && (
                                                                    <div className="mt-4 p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 shadow-sm">
                                                                        <div className="text-[10px] text-green-700 font-black mb-2 flex items-center justify-center gap-1.5 uppercase tracking-wider">
                                                                            <Award className="h-4 w-4 text-green-600" />
                                                                            أفضل عرض متوفر
                                                                        </div>
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <div className="text-[10px] font-bold text-green-600/70">متوفر في {bestPrice.store}</div>
                                                                            <div className="text-lg font-black text-green-700 leading-none">
                                                                                {formatPrice(bestPrice.price)}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t mt-4 gap-2">
                        <Button variant="outline" onClick={() => setShowComparePopup(false)}>
                            إغلاق
                        </Button>
                        <Button variant="destructive" onClick={clearCompare}>
                            تفريغ المقارنة
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>

    );
}