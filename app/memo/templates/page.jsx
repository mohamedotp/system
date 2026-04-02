"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    FileCode,
    Plus,
    Search,
    ArrowRight,
    Loader2,
    FileText,
    ExternalLink,
    Check,
    AlertCircle,
    Files,
    Layers,
    Type,
    FileEdit,
    X,
    Upload,
    Laptop
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function TemplatesPage() {
    const router = useRouter();
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [files, setFiles] = useState([]);
    const [dbKinds, setDbKinds] = useState([]);
    const [templateSearchTerm, setTemplateSearchTerm] = useState("");

    // Form state
    const [nameAr, setNameAr] = useState("");
    const [nameEn, setNameEn] = useState("");
    const [selectedSource, setSelectedSource] = useState(""); // Filename, 'BLANK', or 'UPLOAD'
    const [uploadedFile, setUploadedFile] = useState(null);
    const [user, setUser] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const fetchUser = async () => {
        try {
            const res = await fetch("/api/auth/me");
            const json = await res.json();
            if (json.success) setUser(json.user);
        } catch (error) {
            console.error("Error fetching user:", error);
        }
    };

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/memo/templates");
            const json = await res.json();
            if (json.success) {
                setFiles(json.files);
                setDbKinds(json.dbKinds);
            } else {
                toast.error(json.error);
            }
        } catch (err) {
            toast.error("فشل الاتصال بالسيرفر");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
        fetchTemplates();
    }, []);

    const handleCreate = async (e) => {
        if (e) e.preventDefault();
        if (!nameAr || !nameEn) {
            toast.error("برجاء إدخال الاسم بالعربي والإنجليزي");
            return;
        }

        if (selectedSource === "UPLOAD" && !uploadedFile) {
            toast.error("برجاء اختيار ملف من جهازك أولاً");
            return;
        }

        setCreating(true);
        try {
            const formData = new FormData();
            formData.append("nameAr", nameAr);
            formData.append("nameEn", nameEn);
            formData.append("sourceFile", selectedSource);
            if (uploadedFile) {
                formData.append("file", uploadedFile);
            }

            const res = await fetch("/api/memo/templates", {
                method: "POST",
                body: formData
            });
            const json = await res.json();
            if (json.success) {
                toast.success("تم إنشاء نوع المكاتبة بنجاح");
                setNameAr("");
                setNameEn("");
                setSelectedSource("");
                setUploadedFile(null);
                setTemplateSearchTerm("");
                fetchTemplates();
                // فتح الملف الجديد للتعديل مباشرة
                window.location.href = `aoi-open:${json.path}`;
            } else {
                toast.error(json.error);
            }
        } catch (err) {
            toast.error("حدث خطأ أثناء الاتصال بالسيرفر");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id, fileName) => {
        if (!confirm(`هل أنت متأكد من حذف القالب "${getArabicName(fileName)}" نهائياً من قاعدة البيانات والسيرفر؟`)) return;

        setDeletingId(id);
        try {
            const res = await fetch("/api/memo/templates", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, fileName })
            });
            const json = await res.json();
            if (res.ok && json.success) {
                toast.success("تم الحذف بنجاح");
                fetchTemplates();
            } else {
                toast.error(json.error || "فشل الحذف من السيرفر");
            }
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("حدث خطأ تقني أثناء محاولة الحذف");
        } finally {
            setDeletingId(null);
        }
    };

    const getArabicName = (fileName) => {
        const pure = fileName.replace(/\.docm$/i, "");
        const match = dbKinds.find(k => (k.nameEn || "").toLowerCase() === pure.toLowerCase());
        return match ? match.nameAr : fileName;
    };

    const filteredFiles = files.filter(f => {
        const arabicName = getArabicName(f.fileName);
        return (arabicName || "").includes(templateSearchTerm) ||
            (f.fileName || "").toLowerCase().includes((templateSearchTerm || "").toLowerCase());
    });

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 rtl">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".docm,.doc,.docx"
                onChange={(e) => {
                    if (e.target.files?.[0]) {
                        setUploadedFile(e.target.files[0]);
                        setSelectedSource("UPLOAD");
                    }
                }}
            />

            {/* Header Area */}
            <div className="bg-slate-900 pt-12 pb-24 text-white">
                <div className="max-w-4xl mx-auto px-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
                    >
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        <span>العودة للخلف</span>
                    </button>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-indigo-500 rounded-2xl shadow-xl shadow-indigo-500/20">
                                <Files className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black">إعداد مكاتبة جديدة</h1>
                                <p className="text-slate-400 font-medium font-bold">إنشاء نوع مكاتبة جديد وتخصيص القالب الخاص به</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 -mt-12">
                <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-white/90 backdrop-blur-xl border border-white/20">
                    <CardContent className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                            {/* Left: Metadata Inputs */}
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1 text-indigo-600">
                                        <Plus className="w-5 h-5" />
                                        <h2 className="font-black">برجاء ادخال البيانات</h2>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-slate-700 block mr-1">الاسم بالعربي</label>
                                        <Input
                                            placeholder="مثال: مكاتبات صادر خارجي"
                                            value={nameAr}
                                            onChange={(e) => setNameAr(e.target.value)}
                                            className="h-14 rounded-2xl border-slate-200 font-bold bg-white shadow-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-slate-700 block mr-1">الاسم بالإنجليزي </label>
                                        <Input
                                            placeholder="مثال: EXTERNAL_MEMO"
                                            value={nameEn}
                                            onChange={(e) => setNameEn(e.target.value)}
                                            className="h-14 rounded-2xl border-slate-200 font-bold text-left bg-white shadow-sm"
                                            dir="ltr"
                                        />
                                        {/* <p className="text-[11px] text-slate-400 font-bold mr-1 italic">* سيستخدم كاسم لملف الوورد على السيرفر</p> */}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleCreate}
                                    className="w-full h-16 rounded-[24px] bg-slate-900 hover:bg-indigo-600 text-white font-black text-lg shadow-xl shadow-indigo-100 mt-6 active:scale-95 transition-all group"
                                    disabled={creating || !nameAr || !nameEn}
                                >
                                    {creating ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : (
                                        <>
                                            <FileEdit className="w-6 h-6 ml-2 group-hover:-rotate-12 transition-transform" />
                                            حفظ وإنشاء القالب
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Right: Source Template Selector */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-1 text-slate-600">
                                    <Layers className="w-5 h-5" />
                                    <h2 className="font-black">مصدر القالب</h2>
                                </div>

                                {!selectedSource ? (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                placeholder="ابحث عن قالب للبدء منه..."
                                                value={templateSearchTerm}
                                                onChange={(e) => setTemplateSearchTerm(e.target.value)}
                                                className="h-12 pr-12 rounded-xl border-slate-200 bg-white font-bold text-right shadow-sm"
                                            />
                                        </div>

                                        <div className="bg-slate-50 rounded-[24px] border border-slate-100 shadow-inner max-h-[350px] overflow-y-auto custom-scrollbar p-2">

                                            {/* Option 1: Upload from Device */}
                                            {/* <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="p-3 mb-2 hover:bg-white hover:shadow-md hover:border-emerald-100 border border-transparent rounded-xl cursor-pointer transition-all flex items-center justify-between group bg-emerald-50/50"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">
                                                        <Laptop className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-emerald-700">رفع ملف من جهازي</p>
                                                        <p className="text-[10px] text-emerald-500/70 font-bold italic">اختر ملف Word من الكمبيوتر</p>
                                                    </div>
                                                </div>
                                                <Upload className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div> */}

                                            {/* Option 2: Blank Template */}
                                            <div
                                                onClick={() => setSelectedSource("BLANK")}
                                                className="p-3 mb-1 hover:bg-white hover:shadow-md hover:border-indigo-100 border border-transparent rounded-xl cursor-pointer transition-all flex items-center justify-between group bg-white/40"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center font-black">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-slate-700">قالب جديد فارغ</p>
                                                        <p className="text-[10px] text-slate-400 font-bold italic">إنشاء ملف وورد جديد من الصفر</p>
                                                    </div>
                                                </div>
                                                <Plus className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>

                                            {/* Divider */}
                                            <div className="relative py-4">
                                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                                                <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-400 px-2 bg-slate-50 tracking-widest">أو استنساخ من المسجل مسبقا</div>
                                            </div>

                                            {loading ? (
                                                <div className="py-20 text-center">
                                                    <Loader2 className="w-8 h-8 animate-spin text-slate-200 mx-auto" />
                                                </div>
                                            ) : (
                                                filteredFiles.map(file => {
                                                    const arabicName = getArabicName(file.fileName);
                                                    return (
                                                        <div
                                                            key={file.fileName}
                                                            className="p-3 mb-1 hover:bg-white hover:shadow-md hover:border-indigo-100 border border-transparent rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                                                        >
                                                            <div className="flex items-center gap-3 flex-1" onClick={() => setSelectedSource(file.fileName)}>
                                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                                                                    <FileText className="w-5 h-5" />
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-black text-slate-700">{arabicName}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {["938", "181", "1714"].includes(user?.empNum?.toString()) && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const match = dbKinds.find(k => (k.nameEn || "").toLowerCase() === file.fileName.replace(/\.docm$/i, "").toLowerCase());
                                                                            if (match) handleDelete(match.id, file.fileName);
                                                                            else toast.error("لم يتم العثور على سجل في قاعدة البيانات لهذا الملف");
                                                                        }}
                                                                        disabled={deletingId !== null}
                                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                        title="حذف نهائي"
                                                                    >
                                                                        {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                                                    </button>
                                                                )}
                                                                <Check className="w-4 h-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-in slide-in-from-left-4 duration-300">
                                        <div className={`border-2 rounded-[28px] p-6 flex items-center justify-between ${selectedSource === "UPLOAD" ? "bg-emerald-50 border-emerald-100" : "bg-indigo-50 border-indigo-100"}`}>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => { setSelectedSource(""); setTemplateSearchTerm(""); setUploadedFile(null); }}
                                                    className={`p-3 rounded-2xl transition-colors shadow-sm ${selectedSource === "UPLOAD" ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-700" : "bg-indigo-100 hover:bg-indigo-200 text-indigo-700"}`}
                                                    title="تغيير الاختيار"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-black mb-1 uppercase tracking-widest ${selectedSource === "UPLOAD" ? "text-emerald-600" : "text-indigo-600"}`}>المصدر المختار</span>
                                                    <span className={`text-lg font-black leading-tight ${selectedSource === "UPLOAD" ? "text-emerald-900" : "text-indigo-900"}`}>
                                                        {selectedSource === "UPLOAD" ? `ملف مرفوع: ${uploadedFile?.name}` :
                                                            selectedSource === "BLANK" ? "قالب فارغ جديد" :
                                                                getArabicName(selectedSource)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border ${selectedSource === "UPLOAD" ? "bg-white text-emerald-600 border-emerald-100" : "bg-white text-indigo-600 border-indigo-100"}`}>
                                                <Check className="w-6 h-6" />
                                            </div>
                                        </div>

                                        <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedSource === "UPLOAD" ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"}`}>
                                                <AlertCircle className="w-5 h-5" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-500 leading-relaxed">
                                                {selectedSource === "UPLOAD" ? "سيتم رفع هذا الملف واستخدامه كقالب رسمي لهذا النوع على السيرفر." :
                                                    "سيتم نسخ محتويات المصدر وتوليد ملف جديد بالاسم الإنجليزي الذي أدخلته."}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </CardContent>
                </Card>

                {/* Info Footer */}
                <div className="flex items-center justify-center gap-3 opacity-40 hover:opacity-100 transition-opacity mt-8">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    {/* <p className="text-[10px] font-black text-slate-500 uppercase tracking-[4px]">Templates Management System v2.0</p> */}
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                </div>
            </div>
        </div>
    );
}
