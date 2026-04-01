"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
    Plus,
    Pencil,
    Trash2,
    ChevronLeft,
    Search,
    Loader2,
    Save,
    X,
    AlertCircle,
    Monitor,
    LayoutGrid,
    Smartphone,
    Store,
    Tag,
    FolderPlus,
    Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Product } from "@/types/product";
import { Badge } from "@/components/ui/badge";

// تحويل البيانات
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

// المتاجر للعرض
const stores = [
    { key: 'price_2b', name: '2B', icon: '🛒', color: 'blue' },
    { key: 'price_btech', name: 'B.Tech', icon: '💻', color: 'purple' },
    { key: 'price_sales_cairo', name: 'Sales Cairo', icon: '🏬', color: 'green' },
    { key: 'price_amazon', name: 'Amazon', icon: '📦', color: 'yellow' },
    { key: 'price_st_downtown', name: 'ST Downtown', icon: '🏢', color: 'red' },
    { key: 'price_carfoure', name: 'Carrfour', icon: '🛍️', color: 'orange' },
    { key: 'price_ranin', name: 'Ranin', icon: '🏺', color: 'emerald' },
    { key: 'price_raya', name: 'Raya', icon: '📱', color: 'blue' },
    { key: 'price_rezkallah', name: 'Rezkallah', icon: '🏠', color: 'indigo' },
];

const emptyProductForm = {
    brand: "",
    screenSize: "",
    resolution: "",
    panelType: "",
    refreshRate: "",
    osPlatform: "",
    price: "",
    category: "TV",
    price_2b: "",
    price_btech: "",
    price_sales_cairo: "",
    price_amazon: "",
    price_st_downtown: "",
    price_carfoure: "",
    price_ranin: "",
    price_raya: "",
    price_rezkallah: "",
};

// الكاتيجوريز الأساسية
const DEFAULT_CATEGORIES = [
    { value: "TV", label: "TV" },
    { value: "Monitor", label: "Monitor" },
    { value: "Projector", label: "Projector" },
    { value: "Accessory", label: "Accessory" },
    { value: "phone", label: "Phone" },

];

export default function ManageProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedPrices, setExpandedPrices] = useState<number | null>(null);

    // Category management — مستمرة في localStorage
    const [customCategories, setCustomCategories] = useState<{ value: string; label: string }[]>(() => {
        try {
            const saved = localStorage.getItem('product_custom_categories');
            if (!saved) return [];
            // تنظيف تلقائي: إزالة أي emoji من الـ labels المحفوظة قديماً
            const stripEmoji = (str: string) => str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
            const parsed: { value: string; label: string }[] = JSON.parse(saved);
            return parsed.map(c => ({ value: c.value, label: stripEmoji(c.label) || c.value }));
        } catch {
            return [];
        }
    });
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryInput, setNewCategoryInput] = useState("");
    const newCategoryRef = useRef<HTMLInputElement>(null);

    // حفظ الكاتيجوريز في localStorage كلما اتغيرت
    useEffect(() => {
        try {
            localStorage.setItem('product_custom_categories', JSON.stringify(customCategories));
        } catch { }
    }, [customCategories]);

    const allCategories = useMemo(() => [
        ...DEFAULT_CATEGORIES,
        ...customCategories,
    ], [customCategories]);

    const handleAddCategory = () => {
        const trimmed = newCategoryInput.trim();
        if (!trimmed) return;
        const alreadyExists = allCategories.some(
            c => c.value.toLowerCase() === trimmed.toLowerCase()
        );
        if (alreadyExists) {
            setNewCategoryInput("");
            setShowAddCategory(false);
            return;
        }
        const newCat = { value: trimmed, label: trimmed };
        setCustomCategories(prev => [...prev, newCat]);
        // حدد الكاتيجوري الجديدة تلقائياً
        setFormData(prev => ({ ...prev, category: trimmed }));
        setNewCategoryInput("");
        setShowAddCategory(false);
    };

    const [formData, setFormData] = useState(emptyProductForm);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/product');
            const result = await response.json();
            if (result.success) {
                const loaded = transformData(result.data);
                setProducts(loaded);

                // استخراج الكاتيجوريز الموجودة في المنتجات والتي ليست في القائمة الافتراضية
                const defaultVals = DEFAULT_CATEGORIES.map(c => c.value.toLowerCase());
                const discovered: { value: string; label: string }[] = [];
                loaded.forEach(p => {
                    if (p.category && !defaultVals.includes(p.category.toLowerCase())) {
                        discovered.push({ value: p.category, label: p.category });
                    }
                });
                if (discovered.length > 0) {
                    setCustomCategories(prev => {
                        const existingVals = prev.map(c => c.value.toLowerCase());
                        const newOnes = discovered.filter(d => !existingVals.includes(d.value.toLowerCase()));
                        return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
                    });
                }
            } else {
                toast.error("Failed to load products: " + result.error);
            }
        } catch (err) {
            toast.error("Network error while fetching products");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.resolution.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(p.id).includes(searchTerm)
        );
    }, [products, searchTerm]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData(emptyProductForm);
        setEditingProduct(null);
    };

    const handleAdd = async () => {
        if (!formData.brand || !formData.price || !formData.screenSize) {
            toast.warning("Please fill essential fields (Brand, Size, Price)");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brand: formData.brand,
                    screenSize: parseFloat(formData.screenSize),
                    resolution: formData.resolution,
                    panelType: formData.panelType,
                    refreshRate: parseInt(formData.refreshRate) || 0,
                    osPlatform: formData.osPlatform,
                    price: formData.price,
                    date: new Date().toISOString(),
                    category: formData.category,
                    price_2b: formData.price_2b,
                    price_btech: formData.price_btech,
                    price_sales_cairo: formData.price_sales_cairo,
                    price_amazon: formData.price_amazon,
                    price_st_downtown: formData.price_st_downtown,
                    price_carfoure: formData.price_carfoure,
                    price_ranin: formData.price_ranin,
                    price_raya: formData.price_raya,
                    price_rezkallah: formData.price_rezkallah,
                }),
            });
            const result = await response.json();
            if (result.success) {
                toast.success("Product added successfully!");
                setIsAddOpen(false);
                resetForm();
                fetchData();
            } else {
                toast.error(result.error || "Failed to add product");
            }
        } catch (err) {
            toast.error("Network error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!editingProduct) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/product/${editingProduct.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brand: formData.brand,
                    screenSize: parseFloat(formData.screenSize),
                    resolution: formData.resolution,
                    panelType: formData.panelType,
                    refreshRate: parseInt(formData.refreshRate) || 0,
                    osPlatform: formData.osPlatform,
                    price: formData.price,
                    date: editingProduct.price_date,
                    category: formData.category,
                    price_2b: formData.price_2b,
                    price_btech: formData.price_btech,
                    price_sales_cairo: formData.price_sales_cairo,
                    price_amazon: formData.price_amazon,
                    price_st_downtown: formData.price_st_downtown,
                    price_carfoure: formData.price_carfoure,
                    price_ranin: formData.price_ranin,
                    price_raya: formData.price_raya,
                    price_rezkallah: formData.price_rezkallah,
                }),
            });
            const result = await response.json();
            if (result.success) {
                toast.success("Product updated successfully!");
                setIsEditOpen(false);
                resetForm();
                fetchData();
            } else {
                toast.error(result.error || "Failed to update product");
            }
        } catch (err) {
            toast.error("Network error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        setIsDeleting(id);
        try {
            const response = await fetch(`/api/product/${id}`, {
                method: 'DELETE',
            });
            const result = await response.json();
            if (result.success) {
                toast.success("Product deleted!");
                fetchData();
            } else {
                toast.error(result.error || "Failed to delete");
            }
        } catch (err) {
            toast.error("Network error");
        } finally {
            setIsDeleting(null);
        }
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            brand: product.brand,
            screenSize: String(product.screen_size_inch),
            resolution: product.resolution,
            panelType: product.panel_type,
            refreshRate: String(product.refresh_rate_hz),
            osPlatform: product.os_platform,
            price: String(product.price_egp),
            category: product.category || "TV",
            price_2b: product.price_2b ? String(product.price_2b) : "",
            price_btech: product.price_btech ? String(product.price_btech) : "",
            price_sales_cairo: product.price_sales_cairo ? String(product.price_sales_cairo) : "",
            price_amazon: product.price_amazon ? String(product.price_amazon) : "",
            price_st_downtown: product.price_st_downtown ? String(product.price_st_downtown) : "",
            price_carfoure: product.price_carfoure ? String(product.price_carfoure) : "",
            price_ranin: product.price_ranin ? String(product.price_ranin) : "",
            price_raya: product.price_raya ? String(product.price_raya) : "",
            price_rezkallah: product.price_rezkallah ? String(product.price_rezkallah) : "",
        });
        setIsEditOpen(true);
    };

    const formatPrice = (price: number | string) => {
        if (price === "oos" || (typeof price === "string" && price.toLowerCase() === "oos")) return "OOS";
        const num = typeof price === "string" ? parseFloat(price) : price;
        if (num === null || num === undefined || isNaN(num)) return "N/A";
        return new Intl.NumberFormat('ar-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 0,
        }).format(num);
    };

    const getLowestPrice = (product: Product) => {
        const prices = stores
            .map(store => ({
                name: store.name,
                price: product[store.key as keyof Product] as number,
            }))
            .filter(p => p.price && p.price > 0);

        if (prices.length === 0) return null;
        return prices.reduce((min, p) => p.price < min.price ? p : min);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8 animate-slow-fade">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <Link
                            href="/products"
                            className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 mb-2 group transition-all"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                            Back to Explorer
                        </Link>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                                <LayoutGrid className="h-6 w-6 text-white" />
                            </div>
                            Inventory <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Control Panel</span>
                        </h1>
                    </div>

                    <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-100 rounded-2xl h-14 px-8 font-black transition-all active:scale-95 gap-2">
                                <Plus className="h-5 w-5 font-bold" />
                                Add Entity
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-3xl p-0 bg-white">
                            <DialogHeader className="bg-slate-900 p-8 text-white relative sticky top-0 z-10">
                                <Monitor className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5" />
                                <DialogTitle className="text-3xl font-black tracking-tight">Create Entry</DialogTitle>
                                <DialogDescription className="text-slate-400 font-medium">
                                    Register a new hardware entity in the central database.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="p-8 space-y-6">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Monitor className="h-5 w-5 text-blue-600" />
                                        Basic Information
                                    </h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">Brand</Label>
                                            <Input name="brand" value={formData.brand} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-blue-500 font-bold" placeholder="e.g. Samsung" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between ml-1 mb-1">
                                                <Label className="text-xs font-black uppercase text-slate-400">Category</Label>
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowAddCategory(v => !v); setTimeout(() => newCategoryRef.current?.focus(), 50); }}
                                                    className="flex items-center gap-1 text-[10px] font-black text-blue-500 hover:text-blue-700 transition-colors"
                                                >
                                                    <FolderPlus className="w-3.5 h-3.5" />
                                                    New
                                                </button>
                                            </div>
                                            {showAddCategory && (
                                                <div className="flex gap-2 mb-2 animate-in slide-in-from-top-1 duration-200">
                                                    <input
                                                        ref={newCategoryRef}
                                                        type="text"
                                                        value={newCategoryInput}
                                                        onChange={e => setNewCategoryInput(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setShowAddCategory(false); }}
                                                        placeholder="e.g. Laptop"
                                                        className="flex-1 h-10 rounded-xl bg-blue-50 border border-blue-200 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleAddCategory}
                                                        className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAddCategory(false)}
                                                        className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                            <select
                                                name="category"
                                                value={formData.category}
                                                onChange={handleFormChange}
                                                className="w-full h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-blue-500 font-bold px-4"
                                            >
                                                {allCategories.map(cat => (
                                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">Size (inch)</Label>
                                            <Input name="screenSize" type="number" value={formData.screenSize} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-blue-500 font-bold" placeholder="55" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">Resolution</Label>
                                            <Input name="resolution" value={formData.resolution} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-blue-500 font-bold" placeholder="4K UHD" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">Panel Type</Label>
                                            <Input name="panelType" value={formData.panelType} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-blue-500 font-bold" placeholder="OLED" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">Refresh Rate (Hz)</Label>
                                            <Input name="refreshRate" type="number" value={formData.refreshRate} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-blue-500 font-bold" placeholder="120" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">OS Platform</Label>
                                            <Input name="osPlatform" value={formData.osPlatform} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-blue-500 font-bold" placeholder="Tizen / WebOS" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">Base Price (EGP)</Label>
                                            <Input name="price" type="number" value={formData.price} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-blue-500 font-bold" placeholder="25000" />
                                        </div>
                                    </div>
                                </div>

                                {/* Store Prices */}
                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Store className="h-5 w-5 text-green-600" />
                                        Store Prices (Optional)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">2B Price</Label>
                                            <Input name="price_2b" value={formData.price_2b} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" placeholder="EGP or 'oos'" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">B.Tech Price</Label>
                                            <Input name="price_btech" value={formData.price_btech} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" placeholder="EGP or 'oos'" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">Sales Cairo Price</Label>
                                            <Input name="price_sales_cairo" value={formData.price_sales_cairo} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" placeholder="EGP or 'oos'" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">Amazon Price</Label>
                                            <Input name="price_amazon" value={formData.price_amazon} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" placeholder="EGP or 'oos'" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">ST Downtown Price</Label>
                                            <Input name="price_st_downtown" value={formData.price_st_downtown} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" placeholder="EGP or 'oos'" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">Carfour Price</Label>
                                            <Input name="price_carfoure" value={formData.price_carfoure} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" placeholder="EGP or 'oos'" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">Ranin Price</Label>
                                            <Input name="price_ranin" value={formData.price_ranin} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" placeholder="EGP or 'oos'" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">Raya Price</Label>
                                            <Input name="price_raya" value={formData.price_raya} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" placeholder="EGP or 'oos'" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">Rezkallah Price</Label>
                                            <Input name="price_rezkallah" value={formData.price_rezkallah} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" placeholder="EGP or 'oos'" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="p-8 bg-slate-50 mt-2 sticky bottom-0">
                                <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl h-12 px-6 font-bold text-slate-500 hover:bg-white hover:text-slate-800 border border-transparent hover:border-slate-200">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleAdd}
                                    disabled={isSubmitting}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 font-black gap-2 shadow-lg shadow-blue-100"
                                >
                                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Commit Record
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Main Table Card */}
                <Card className="border-none soft-shadow bg-white rounded-3xl overflow-hidden overflow-x-auto">
                    <CardHeader className="p-8 border-b border-slate-50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                Live Ledger
                                <span className="bg-slate-100 text-slate-500 text-xs px-2.5 py-1 rounded-full font-black uppercase">
                                    {filteredProducts.length} Entries
                                </span>
                            </CardTitle>

                            <div className="relative max-w-sm w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search by ID, Brand, Category, or Specs..."
                                    className="pl-12 rounded-2xl bg-slate-50 border-none h-12 focus-visible:ring-blue-500 font-bold text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="p-8 space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                                ))}
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="p-24 text-center">
                                <AlertCircle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold">No matching records found in the system.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow className="hover:bg-transparent border-slate-100">
                                            <TableHead className="w-[80px] py-6 px-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">ID</TableHead>
                                            <TableHead className="w-[100px] text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Category</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Hardware</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-4 text-right">Base Price</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Store Prices</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-4 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProducts.map((p) => {
                                            const lowestPrice = getLowestPrice(p);
                                            return (
                                                <TableRow key={p.id} className="group hover:bg-blue-50/30 transition-colors border-slate-50">
                                                    <TableCell className="py-4 px-4">
                                                        <span className="text-slate-400 font-mono text-xs">#{p.id}</span>
                                                    </TableCell>
                                                    <TableCell className="px-4">
                                                        <Badge className={`
                                                            ${p.category === 'TV' ? 'bg-blue-100 text-blue-700' :
                                                                p.category === 'Monitor' ? 'bg-purple-100 text-purple-700' :
                                                                    'bg-green-100 text-green-700'}
                                                        `}>
                                                            {p.category}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="px-4">
                                                        <div className="space-y-0.5">
                                                            <div className="font-black text-slate-900">{p.brand}</div>
                                                            <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                                                {p.screen_size_inch}" • {p.resolution} • {p.refresh_rate_hz}Hz
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-4 text-right">
                                                        <div className="font-black text-blue-600">
                                                            {formatPrice(p.price_egp)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-4">
                                                        <div className="space-y-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setExpandedPrices(expandedPrices === p.id ? null : p.id)}
                                                                className="h-7 px-2 text-xs font-bold text-slate-500 hover:text-blue-600"
                                                            >
                                                                <Store className="h-3 w-3 mr-1" />
                                                                {expandedPrices === p.id ? 'Hide' : 'Show'} Prices
                                                                {lowestPrice && !expandedPrices && (
                                                                    <Badge className="ml-2 bg-green-100 text-green-700 text-[8px]">
                                                                        Best: {formatPrice(lowestPrice.price)}
                                                                    </Badge>
                                                                )}
                                                            </Button>
                                                            {expandedPrices === p.id && (
                                                                <div className="grid grid-cols-2 gap-1 mt-1">
                                                                    {stores.map(store => {
                                                                        const price = p[store.key as keyof Product] as number | string;
                                                                        if (price === null || price === undefined || price === 0) return null;
                                                                        return (
                                                                            <div key={store.key} className={`text-xs bg-${store.color}-50 p-1 rounded`}>
                                                                                <span className="font-bold">{store.icon} {store.name}:</span>
                                                                                <span className="font-black ml-1">{formatPrice(price)}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                                                                onClick={() => openEditModal(p)}
                                                            >
                                                                <Pencil size={14} />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 bg-slate-50 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                                                                disabled={isDeleting === p.id}
                                                                onClick={() => {
                                                                    if (confirm("Confirm deletion of this system record?")) {
                                                                        handleDelete(p.id);
                                                                    }
                                                                }}
                                                            >
                                                                {isDeleting === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                            </Button>
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
                </Card>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetForm(); }}>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-3xl p-0 bg-white">
                        <DialogHeader className="bg-indigo-950 p-8 text-white relative sticky top-0 z-10">
                            <Pencil className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5" />
                            <DialogTitle className="text-3xl font-black tracking-tight">Overwrite Data</DialogTitle>
                            <DialogDescription className="text-indigo-200 font-medium">
                                Modifying identification record for system entry #{editingProduct?.id}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="p-8 space-y-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Monitor className="h-5 w-5 text-indigo-600" />
                                    Basic Information
                                </h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">Brand</Label>
                                        <Input name="brand" value={formData.brand} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-indigo-500 font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between ml-1 mb-1">
                                            <Label className="text-xs font-black uppercase text-slate-400">Category</Label>
                                            <button
                                                type="button"
                                                onClick={() => { setShowAddCategory(v => !v); setTimeout(() => newCategoryRef.current?.focus(), 50); }}
                                                className="flex items-center gap-1 text-[10px] font-black text-indigo-500 hover:text-indigo-700 transition-colors"
                                            >
                                                <FolderPlus className="w-3.5 h-3.5" />
                                                New
                                            </button>
                                        </div>
                                        {showAddCategory && (
                                            <div className="flex gap-2 mb-2 animate-in slide-in-from-top-1 duration-200">
                                                <input
                                                    ref={newCategoryRef}
                                                    type="text"
                                                    value={newCategoryInput}
                                                    onChange={e => setNewCategoryInput(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setShowAddCategory(false); }}
                                                    placeholder="e.g. Laptop"
                                                    className="flex-1 h-10 rounded-xl bg-indigo-50 border border-indigo-200 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddCategory}
                                                    className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shadow"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddCategory(false)}
                                                    className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleFormChange}
                                            className="w-full h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-indigo-500 font-bold px-4"
                                        >
                                            {allCategories.map(cat => (
                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">Size (inch)</Label>
                                        <Input name="screenSize" type="number" value={formData.screenSize} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-indigo-500 font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">Resolution</Label>
                                        <Input name="resolution" value={formData.resolution} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-indigo-500 font-bold" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">Panel</Label>
                                        <Input name="panelType" value={formData.panelType} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-indigo-500 font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">Refresh Rate</Label>
                                        <Input name="refreshRate" type="number" value={formData.refreshRate} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-indigo-500 font-bold" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">OS Platform</Label>
                                        <Input name="osPlatform" value={formData.osPlatform} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-indigo-500 font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">Base Price (EGP)</Label>
                                        <Input name="price" type="number" value={formData.price} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-indigo-500 font-bold" />
                                    </div>
                                </div>
                            </div>

                            {/* Store Prices */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Store className="h-5 w-5 text-green-600" />
                                    Store Prices
                                </h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">2B Price</Label>
                                        <Input name="price_2b" value={formData.price_2b} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">B.Tech Price</Label>
                                        <Input name="price_btech" value={formData.price_btech} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">Sales Cairo Price</Label>
                                        <Input name="price_sales_cairo" value={formData.price_sales_cairo} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">Amazon Price</Label>
                                        <Input name="price_amazon" value={formData.price_amazon} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">ST Downtown Price</Label>
                                        <Input name="price_st_downtown" value={formData.price_st_downtown} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">Carfour Price</Label>
                                        <Input name="price_carfoure" value={formData.price_carfoure} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">Ranin Price</Label>
                                        <Input name="price_ranin" value={formData.price_ranin} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">Raya Price</Label>
                                        <Input name="price_raya" value={formData.price_raya} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-slate-400 ml-1">Rezkallah Price</Label>
                                        <Input name="price_rezkallah" value={formData.price_rezkallah} onChange={handleFormChange} className="rounded-xl bg-slate-50 border-none h-12 focus-visible:ring-green-500 font-bold" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="p-8 bg-slate-50 mt-2 sticky bottom-0">
                            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="rounded-xl h-12 px-6 font-bold text-slate-500 hover:bg-white border border-transparent hover:border-slate-200">
                                Discard
                            </Button>
                            <Button
                                onClick={handleEdit}
                                disabled={isSubmitting}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 font-black gap-2 shadow-lg shadow-indigo-100"
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                Sync Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}