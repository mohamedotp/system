"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import {
    FileText,
    Send,
    ArrowRight,
    Loader2,
    Building2,
    Calendar as CalendarIcon,
    Type,
    StickyNote,
    UserPlus,
    Search,
    Check,
    Info,
    FolderTree,
    FileCode,
    ExternalLink,
    Sparkles,
    FileEdit,
    ChevronLeft,
    Paperclip,
    ListTodo,
    X,
    File,
    Files,
    Image as ImageIcon,
    Star
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function CreateMemoPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetchingEmps, setFetchingEmps] = useState(false);
    const [fetchingKinds, setFetchingKinds] = useState(false);
    const [user, setUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [docKinds, setDocKinds] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [kindSearchTerm, setKindSearchTerm] = useState("");

    // Form State
    const [docType, setDocType] = useState("");
    const [subject, setSubject] = useState("");
    const [selectedEmps, setSelectedEmps] = useState([]);
    // Date is automatic now
    const [savedPath, setSavedPath] = useState(null);
    const [isArchiving, setIsArchiving] = useState(false);
    const [docNo, setDocNo] = useState(null);
    const [situations, setSituations] = useState([]);
    const [selectedSituation, setSelectedSituation] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [vacationEmpNo, setVacationEmpNo] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [favorites, setFavorites] = useState([]);
    const [kindFavorites, setKindFavorites] = useState([]);

    useEffect(() => {
        const init = async () => {
            fetchUser();
            fetchEmployees();
            fetchSituations();
            fetchDocKinds(); // Fetch all kinds initially
        };
        init();
    }, []);

    // Effect for searching kinds with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDocKinds(kindSearchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [kindSearchTerm]);

    const fetchUser = async () => {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (json.success) {
            setUser(json.user);

            // تحميل المفضلات الخاصة بالمستخدم الحالي (نفس المفتاح المستخدم في صفحة الوارد)
            try {
                const savedFavorites = localStorage.getItem(`fav_employees_${json.user.empNum}`);
                if (savedFavorites) {
                    setFavorites(JSON.parse(savedFavorites));
                } else {
                    setFavorites([]);
                }

                const savedKindFavorites = localStorage.getItem(`fav_docKinds_${json.user.empNum}`);
                if (savedKindFavorites) {
                    setKindFavorites(JSON.parse(savedKindFavorites));
                } else {
                    setKindFavorites([]);
                }
            } catch (e) {
                console.error("Error loading favorites:", e);
            }
        }
    };

    const fetchDocKinds = async (query = "") => {
        setFetchingKinds(true);
        try {
            const res = await fetch(`/api/memo/kinds?q=${encodeURIComponent(query)}`);
            const json = await res.json();
            if (json.success) setDocKinds(json.data);
        } catch (error) {
            console.error("Error fetching kinds:", error);
        } finally {
            setFetchingKinds(false);
        }
    };

    const fetchEmployees = async () => {
        setFetchingEmps(true);
        try {
            const res = await fetch("/api/import/transfer/employees");
            const json = await res.json();
            if (json.success) {
                const unique = json.data.filter((v, i, a) => a.findIndex(t => t.EMP_NUM === v.EMP_NUM) === i);
                setEmployees(unique);
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
        } finally {
            setFetchingEmps(false);
        }
    };

    const fetchSituations = async () => {
        try {
            const res = await fetch("/api/import/transfer/situations");
            const json = await res.json();
            if (json.success) setSituations(json.data);
        } catch (error) {
            console.error("Error fetching situations:", error);
        }
    };

    const toggleFavorite = (emp) => {
        if (!user) return;

        let newFavs;
        if (favorites.some(f => f.EMP_NUM === emp.EMP_NUM)) {
            newFavs = favorites.filter(f => f.EMP_NUM !== emp.EMP_NUM);
        } else {
            newFavs = [...favorites, emp];
        }
        setFavorites(newFavs);
        try {
            localStorage.setItem(`fav_employees_${user.empNum}`, JSON.stringify(newFavs));
        } catch (e) {
            console.error("Error saving favorites:", e);
        }
    };

    const toggleKindFavorite = (kind) => {
        if (!user) return;

        let newFavs;
        if (kindFavorites.some(k => k.id === kind.id)) {
            newFavs = kindFavorites.filter(k => k.id !== kind.id);
        } else {
            newFavs = [...kindFavorites, kind];
        }
        setKindFavorites(newFavs);
        try {
            localStorage.setItem(`fav_docKinds_${user.empNum}`, JSON.stringify(newFavs));
        } catch (e) {
            console.error("Error saving kind favorites:", e);
        }
    };

    const handleOpenFile = async (path, docNo) => {
        if (!path) return;

        console.log("📂 Opening file:", path, "docNo:", docNo);

        // تنظيف ومسح المسار
        let rawPath = path.split('|').filter(p => !!p)[0];
        if (!rawPath) return;

        let finalPath = rawPath.trim().replace(/\//g, "\\");

        // إذا كان المسار يبدأ بـ IP أو اسم سيرفر بدون \\، نقوم بإضافتها
        if (finalPath.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/) || (finalPath.split('\\')[0].includes('-') && !finalPath.startsWith("\\"))) {
            finalPath = "\\\\" + finalPath;
        } else if (finalPath.startsWith("\\") && !finalPath.startsWith("\\\\")) {
            finalPath = "\\" + finalPath;
        }

        const fileNamePart = finalPath.split(/[\\\/]/).pop();
        const hasAnyExtension = fileNamePart.includes(".");
        const lowerPath = finalPath.toLowerCase();

        const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp"];
        const isImage = imageExtensions.some(ext => lowerPath.endsWith(ext));
        const isPdf = lowerPath.endsWith(".pdf");

        // إذا كان الملف PDF أو صورة أو ليس له امتداد، نفتح في العارض الذكي
        if (isPdf || isImage || !hasAnyExtension) {
            let viewerPath = finalPath;
            if (!hasAnyExtension && !isPdf) {
                viewerPath += ".pdf";
            }
            const viewerUrl = `/pdf-viewer?file=${encodeURIComponent(viewerPath)}&docNo=${docNo || ''}`;
            window.open(viewerUrl, '_blank');
            return;
        }

        try {
            const res = await fetch("/api/memo/open-local", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: finalPath })
            });
            const json = await res.json();

            if (json.success) {
                if (json.isRemote) {
                    // إذا كان المستخدم بعيداً، نستخدم البروتوكول المحلي
                    toast.info("يتم الآن التحويل لبرنامج الورد المحلي...");
                    console.log("🌏 Triggering Protocol for Remote Client:", `aoi-open:${finalPath}`);

                    const link = document.createElement('a');
                    link.href = `aoi-open:${finalPath}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    toast.success("يتم الآن فتح الملف...");
                }
            } else {
                toast.error("فشل فتح الملف: " + json.error);
            }
        } catch (e) {
            console.error("Open API error:", e);
            toast.error("حدث خطأ أثناء محاولة فتح الملف");
        }
    };

    const toggleEmployee = (emp) => {
        if (selectedEmps.some(e => e.EMP_NUM === emp.EMP_NUM)) {
            setSelectedEmps(selectedEmps.filter(e => e.EMP_NUM !== emp.EMP_NUM));
        } else {
            // إضافة الموظف مع إجراء افتراضي إذا وجد
            setSelectedEmps([...selectedEmps, {
                ...emp,
                customSituation: situations.length > 0 ? situations[0].SITUATION_C.toString() : "7"
            }]);
            setSearchTerm(""); // تفريغ حقل البحث بعد الاختيار
        }
    };

    const updateEmpSituation = (empNum, situationId) => {
        setSelectedEmps(selectedEmps.map(e =>
            e.EMP_NUM === empNum ? { ...e, customSituation: situationId } : e
        ));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (selectedEmps.length === 0 || !subject || !docType) {
            toast.error("برجاء استكمال البيانات (النوع، المستلمين، الموضوع)");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/memo/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    docType,
                    subject,
                    recipientEmpNums: selectedEmps.map(e => e.EMP_NUM),
                    vacationEmpNo,
                    fromDate,
                    toDate
                })
            });
            const json = await res.json();
            if (json.success) {
                toast.success("تم الحفظ وتجهيز المكاتبة");
                setSavedPath(json.generatedPath);
                setDocNo(json.docNo);
                handleOpenFile(json.generatedPath);
            } else {
                toast.error(json.error || "فشل إنشاء المذكرة");
            }
        } catch (err) {
            toast.error("حدث خطأ أثناء الاتصال بالسيرفر");
        } finally {
            setLoading(false);
        }
    };

    const filteredEmps = employees.filter(emp => {
        const matchesSearch = emp.EMP_NAME.includes(searchTerm) || emp.EMP_NUM.toString().includes(searchTerm);
        const isNotSelf = user ? String(emp.EMP_NUM) !== String(user.empNum) : true;
        return matchesSearch && isNotSelf;
    }).slice(0, 5);

    // Filtered kinds are now fetched directly from server into docKinds
    const filteredKinds = docKinds;

    const pathPreview = useMemo(() => {
        if (!user || !docType) return "برجاء اختيار النوع لعرض المسار...";
        const now = new Date();
        const y = now.getFullYear();
        const m = (now.getMonth() + 1).toString().padStart(2, '0');
        const d = now.getDate().toString().padStart(2, '0');
        const ds = `${d}-${m}-${y}`;
        const selectedKind = docKinds.find(k => k.id.toString() === docType.toString());
        const typeLabel = selectedKind ? (selectedKind.DOC_DESC || "MEMO") : "MEMO";

        return `\\\\192.168.13.12\\homes\\DOCUMENTS\\${y}\\${m}\\${d}\\${user.empNum}\\(...)_${typeLabel}_${ds}`;
    }, [user, docType, docKinds]);

    const headerGuidanceText = useMemo(() => {
        if (!docType) return "يرجى اختيار نوع المكاتبة لبدء العمل";
        if (!subject) return "برجاء إدخال موضوع المذكرة";
        if (selectedEmps.length === 0) return "برجاء اختيار المستلمين (يمكن اختيار أكثر من شخص)";
        const allHaveSituations = selectedEmps.every(e => e.customSituation);
        if (!allHaveSituations && !selectedSituation) return "برجاء اختيار المطلوب من المكاتبة لكل مستلم";
        return "قم ببدء فتح وتعديل المذكرة";
    }, [docType, subject, selectedEmps, selectedSituation]);

    const isVacation = useMemo(() => {
        const selectedKind = docKinds.find(k => k.id.toString() === docType.toString());
        if (!selectedKind) return false;

        const normalize = (text) => {
            if (!text) return "";
            return text.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
        };

        const label = normalize(selectedKind.label || "");
        const descA = normalize(selectedKind.DOC_DESC_A || "");
        const target = normalize("اجازة");

        return label.includes(target) || descA.includes(target);
    }, [docType, docKinds]);

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 rtl">
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

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-emerald-500 rounded-2xl shadow-xl shadow-emerald-500/20">
                                <StickyNote className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black">إنشاء مذكرة جديدة</h1>
                                <p className="text-slate-400 font-medium font-bold">{headerGuidanceText}</p>
                            </div>
                        </div>

                        <Button
                            onClick={() => router.push("/memo/templates")}
                            className="bg-amber-500 hover:bg-amber-600 text-black border-none rounded-2xl h-14 px-6 gap-2 font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                        >
                            <Sparkles className="w-5 h-5" />
                            اضافة قالب جديد
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Form Area */}
            <div className="max-w-4xl mx-auto px-6 -mt-12">
                <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-white/90 backdrop-blur-xl border border-white/20">
                    <CardContent className="p-8">
                        {savedPath ? (
                            <>
                                <div className="py-10 text-center space-y-8">
                                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                        <Sparkles className="w-12 h-12" />
                                    </div>
                                    <div className="space-y-3">
                                        <h2 className="text-3xl font-black text-slate-900">الملف متاح الآن للتعديل والفتح </h2>
                                    </div>

                                    <div className="max-w-xl mx-auto space-y-4 text-right pt-6" dir="rtl">
                                        <div className="space-y-4 p-6 bg-slate-50 rounded-[30px] border border-slate-100 shadow-sm">
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm font-black text-slate-700 mr-2">
                                                    <Paperclip className="w-4 h-4 text-blue-500" />
                                                    إرفاق ملفات إضافية (اختياري)
                                                </label>
                                                <Input
                                                    type="file"
                                                    multiple
                                                    onChange={(e) => {
                                                        const newFiles = Array.from(e.target.files);
                                                        setAttachments(prev => [...prev, ...newFiles.map(f => ({ file: f, desc: "" }))]);
                                                        e.target.value = ''; // Reset input to allow re-selecting same files
                                                    }}
                                                    className="h-14 pt-3 rounded-2xl border-slate-200 bg-white font-bold text-right cursor-pointer file:ml-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all shadow-sm"
                                                />
                                            </div>

                                            {attachments.length > 0 && (
                                                <div className="space-y-4 mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <div className="flex items-center justify-between px-2">
                                                        <p className="text-xs font-black text-slate-500">الملفات المختارة ({attachments.length})</p>
                                                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-100">
                                                            يرجى إضافة وصف لكل ملف
                                                        </Badge>
                                                    </div>
                                                    <div className="grid gap-3">
                                                        {attachments.map((item, idx) => {
                                                            const file = item.file;
                                                            const isImage = file.type.startsWith('image/');
                                                            const previewUrl = isImage ? URL.createObjectURL(file) : null;

                                                            return (
                                                                <div key={`${file.name}-${idx}`} className="flex flex-col p-4 bg-white border border-slate-200 rounded-[24px] group hover:border-blue-300 transition-all hover:shadow-xl shadow-sm">
                                                                    <div className="flex items-center gap-4 mb-3">
                                                                        <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center font-black overflow-hidden group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner shrink-0">
                                                                            {isImage ? (
                                                                                <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <File className="w-7 h-7" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-black text-slate-700 truncate" dir="ltr">{file.name}</p>
                                                                            <p className="text-[10px] text-slate-400 font-bold">
                                                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                                                            </p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const newFiles = attachments.filter((_, i) => i !== idx);
                                                                                if (previewUrl) URL.revokeObjectURL(previewUrl);
                                                                                setAttachments(newFiles);
                                                                            }}
                                                                            className="p-2.5 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-300 transition-all"
                                                                            title="حذف الملف"
                                                                        >
                                                                            <X className="w-5 h-5" />
                                                                        </button>
                                                                    </div>

                                                                    <div className="relative">
                                                                        <Input
                                                                            placeholder="اكتب وصفاً للمرفق   "
                                                                            value={item.desc}
                                                                            onChange={(e) => {
                                                                                const newAttachments = [...attachments];
                                                                                newAttachments[idx].desc = e.target.value;
                                                                                setAttachments(newAttachments);
                                                                            }}
                                                                            className="h-11 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white text-xs font-bold"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <p className="text-[10px] text-slate-400 font-bold mr-2">يمكنك اختيار أكثر من ملف ليتم إرسالها مع المذكرة</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col lg:flex-row items-center justify-center gap-4 pt-6">
                                        <Button
                                            onClick={() => handleOpenFile(savedPath)}
                                            className="h-16 px-10 rounded-3xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg shadow-xl shadow-amber-200 group flex items-center gap-3 w-full lg:w-auto"
                                        >
                                            <ExternalLink className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                                            1. فتح وتعديل المذكرة (Word)
                                        </Button>

                                        <Button
                                            onClick={async () => {

                                                const allHaveSituations = selectedEmps.every(e => e.customSituation);
                                                if (!allHaveSituations && !selectedSituation) {
                                                    toast.error("برجاء اختيار 'المطلوب' لكل مستلم قبل الإرسال");
                                                    return;
                                                }

                                                setIsArchiving(true);
                                                try {
                                                    let attachmentPath = null;

                                                    // 1. Upload Attachments if exists
                                                    if (attachments && attachments.length > 0) {
                                                        const formData = new FormData();
                                                        formData.append("docNo", docNo);
                                                        attachments.forEach(item => {
                                                            formData.append("files", item.file);
                                                            formData.append("descriptions", item.desc || item.file.name);
                                                        });

                                                        const uploadRes = await fetch("/api/memo/upload", {
                                                            method: "POST",
                                                            body: formData
                                                        });
                                                        const uploadJson = await uploadRes.json();
                                                        if (!uploadJson.success) throw new Error(uploadJson.error);
                                                        attachmentPath = uploadJson.attachments;
                                                    }

                                                    // 2. Archive and Send
                                                    const res = await fetch("/api/memo/archive", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({
                                                            docNo,
                                                            path: savedPath,
                                                            attachments: attachmentPath, // Send the full objects
                                                            recipients: selectedEmps.map(e => ({
                                                                empNum: e.EMP_NUM,
                                                                situationId: e.customSituation || selectedSituation
                                                            }))
                                                        })
                                                    });
                                                    const json = await res.json();
                                                    if (json.success) {
                                                        toast.success("تم إرسال المكاتبة والمرفقات بنجاح");
                                                        // فتح الـ PDF المحول فوراً في عارض الـ PDF
                                                        if (json.pdfPath) {
                                                            handleOpenFile(json.pdfPath, docNo);
                                                        }
                                                        setTimeout(() => {
                                                            router.push("/export");
                                                        }, 800);
                                                    } else {
                                                        toast.error(json.error || "فشل تحويل الملف");
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                    toast.error(err.message || "حدث خطأ أثناء الاتصال بالسيرفر");
                                                } finally {
                                                    setIsArchiving(false);
                                                }
                                            }}
                                            disabled={isArchiving}
                                            className="h-16 px-10 rounded-3xl bg-green-600 hover:bg-green-700 text-white font-black text-lg shadow-xl shadow-green-200 group flex items-center gap-3 animate-pulse hover:animate-none w-full lg:w-auto"
                                        >
                                            {isArchiving ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                                <>
                                                    <Send className="w-6 h-6" />
                                                    2. اعتماد وإرسال (PDF)
                                                </>
                                            )}
                                        </Button>

                                        <Button
                                            variant="outline"
                                            onClick={() => router.push("/import")}
                                            className="h-16 px-10 rounded-3xl border-slate-200 font-black text-slate-600 hover:bg-slate-50 w-full lg:w-auto"
                                        >
                                            الذهاب للسجل
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <form onSubmit={(e) => e.preventDefault()} className="space-y-8">

                                {/* Section 1: Doc Type Selection (Searchable) */}
                                <div className="space-y-4">
                                    <label className="flex items-center gap-2 text-sm font-black text-slate-700 mr-1">
                                        <Type className="w-4 h-4 text-blue-500" />
                                        بحث واختيار نوع المكاتبة
                                    </label>

                                    {!docType ? (
                                        <div className="space-y-4">
                                            {/* مفضلة أنواع المكاتبات */}
                                            {kindFavorites.length > 0 && (
                                                <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                        <h3 className="font-black text-slate-800 text-xs">الأنواع المفضلة</h3>
                                                        <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600">
                                                            {kindFavorites.length}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {kindFavorites.map(kind => (
                                                            <button
                                                                key={kind.id}
                                                                type="button"
                                                                onClick={() => setDocType(kind.id.toString())}
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-right text-xs transition-all border-emerald-500 bg-emerald-50 text-emerald-700"
                                                            >
                                                                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                                                                    {kind.id}
                                                                </div>
                                                                <span className="font-bold truncate max-w-[160px]">
                                                                    {kind.label || kind.DOC_DESC_A}
                                                                </span>
                                                                <div
                                                                    onClick={(e) => { e.stopPropagation(); toggleKindFavorite(kind); }}
                                                                    className="p-1 rounded hover:bg-amber-50 text-amber-500 cursor-pointer"
                                                                    title="إزالة من المفضلة"
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" || e.key === " ") {
                                                                            e.stopPropagation();
                                                                            toggleKindFavorite(kind);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Star className="w-3 h-3 fill-amber-500" />
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </section>
                                            )}

                                            <div className="relative">
                                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    placeholder="ابحث باسم المكاتبة..."
                                                    value={kindSearchTerm}
                                                    onChange={(e) => setKindSearchTerm(e.target.value)}
                                                    className="h-12 pr-12 rounded-xl border-slate-200 bg-white font-bold text-right shadow-sm"
                                                    autoFocus
                                                />
                                            </div>

                                            <div className="bg-slate-50 rounded-2xl border border-slate-100 shadow-inner max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                                                {filteredKinds.length > 0 ? (
                                                    filteredKinds.map(kind => {
                                                        const isFavorite = kindFavorites.some(k => k.id === kind.id);
                                                        return (
                                                            <div
                                                                key={kind.id}
                                                                onClick={() => setDocType(kind.id.toString())}
                                                                className="p-3 hover:bg-white hover:shadow-md hover:border-blue-100 border border-transparent rounded-xl cursor-pointer transition-all flex items-center justify-between group relative"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm">
                                                                        {kind.id}
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-sm font-black text-slate-700">{kind.label || kind.DOC_DESC_A}</p>
                                                                        {/* <p className="text-[10px] text-slate-400 font-bold">{kind.DOC_DESC || "TEMPLATE"}</p> */}
                                                                    </div>
                                                                </div>

                                                                {/* نجمة المفضلة للنوع */}
                                                                <div
                                                                    onClick={(e) => { e.stopPropagation(); toggleKindFavorite(kind); }}
                                                                    className={`absolute left-3 top-3 p-1.5 rounded-lg transition-colors cursor-pointer ${isFavorite
                                                                        ? "text-amber-500 bg-amber-50"
                                                                        : "text-slate-300 hover:text-amber-500 hover:bg-slate-50"
                                                                        }`}
                                                                    title={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" || e.key === " ") {
                                                                            e.stopPropagation();
                                                                            toggleKindFavorite(kind);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Star className={`w-3.5 h-3.5 ${isFavorite ? "fill-amber-500" : ""}`} />
                                                                </div>

                                                                <Check className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="py-8 text-center text-slate-400 font-bold text-sm">
                                                        لا توجد نتائج مطابقة للبحث
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="animate-in slide-in-from-right-4 duration-300">
                                            <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => { setDocType(""); setKindSearchTerm(""); }}
                                                        className="p-2 hover:bg-emerald-200/50 rounded-lg text-emerald-700 transition-colors"
                                                        title="تغيير النوع"
                                                    >
                                                        <Search className="w-5 h-5" />
                                                    </button>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-emerald-600 mb-1">النوع المختار</span>
                                                        <span className="text-lg font-black text-emerald-900">
                                                            {docKinds.find(k => k.id.toString() === docType.toString())?.label}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center text-emerald-700">
                                                    <Check className="w-6 h-6" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {docType && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">

                                        <div className="space-y-3">
                                            <label className="flex items-center gap-2 text-sm font-black text-slate-700 mr-1">
                                                <FileText className="w-4 h-4 text-blue-500" />
                                                موضوع المذكرة
                                            </label>
                                            <textarea
                                                placeholder="اكتب تفاصيل الموضوع هنا..."
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                className="w-full min-h-[100px] p-4 rounded-2xl border border-slate-200 bg-white font-bold text-right shadow-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-300"
                                            />
                                        </div>

                                        {isVacation && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-amber-50/50 rounded-[30px] border border-amber-100 shadow-sm animate-in zoom-in-95 duration-300">
                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-2 text-sm font-black text-slate-700 mr-2">
                                                        <Building2 className="w-4 h-4 text-amber-500" />
                                                        رقم الموظف
                                                    </label>
                                                    <Input
                                                        placeholder="رقم الموظف..."
                                                        value={vacationEmpNo}
                                                        onChange={(e) => setVacationEmpNo(e.target.value)}
                                                        className="h-12 rounded-xl border-slate-200 bg-white font-bold text-right shadow-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-2 text-sm font-black text-slate-700 mr-2">
                                                        <CalendarIcon className="w-4 h-4 text-amber-500" />
                                                        من تاريخ
                                                    </label>
                                                    <Input
                                                        type="date"
                                                        value={fromDate}
                                                        onChange={(e) => setFromDate(e.target.value)}
                                                        className="h-12 rounded-xl border-slate-200 bg-white font-bold text-right shadow-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-2 text-sm font-black text-slate-700 mr-2">
                                                        <CalendarIcon className="w-4 h-4 text-amber-500" />
                                                        إلى تاريخ
                                                    </label>
                                                    <Input
                                                        type="date"
                                                        value={toDate}
                                                        onChange={(e) => setToDate(e.target.value)}
                                                        className="h-12 rounded-xl border-slate-200 bg-white font-bold text-right shadow-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Recipients */}
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-2 text-sm font-black text-slate-700 mr-1">
                                                <UserPlus className="w-4 h-4 text-blue-500" />
                                                توجيه إلى
                                            </label>
                                            <div className="space-y-4">
                                                {/* Favorites section (نفس فكرة صفحة الوارد) */}
                                                {favorites.length > 0 && (
                                                    <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                            <h3 className="font-black text-slate-800 text-xs">المفضلين</h3>
                                                            <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600">
                                                                {favorites.length}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {favorites.map(fav => {
                                                                const isSelected = selectedEmps.some(e => e.EMP_NUM === fav.EMP_NUM);
                                                                return (
                                                                    <button
                                                                        key={fav.EMP_NUM}
                                                                        type="button"
                                                                        onClick={() => toggleEmployee(fav)}
                                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-right text-xs transition-all ${isSelected
                                                                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                                            : "border-slate-100 bg-slate-50 hover:border-emerald-200"
                                                                            }`}
                                                                    >
                                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${isSelected ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                                                                            {fav.EMP_NAME?.charAt(0)}
                                                                        </div>
                                                                        <span className="font-bold truncate max-w-[120px]">{fav.EMP_NAME}</span>
                                                                        {isSelected && <Check className="w-3 h-3 text-emerald-600" />}
                                                                        <div
                                                                            onClick={(e) => { e.stopPropagation(); toggleFavorite(fav); }}
                                                                            className="p-1 rounded hover:bg-amber-50 text-amber-500 cursor-pointer"
                                                                            title="إزالة من المفضلة"
                                                                            role="button"
                                                                            tabIndex={0}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === "Enter" || e.key === " ") {
                                                                                    e.stopPropagation();
                                                                                    toggleFavorite(fav);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Star className="w-3 h-3 fill-amber-500" />
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </section>
                                                )}

                                                <div className="relative">
                                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <Input
                                                        placeholder="ابحث بالاسم أو رقم الموظف..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="h-12 pr-12 rounded-xl border-slate-200 bg-white font-bold text-right shadow-sm"
                                                    />
                                                </div>

                                                {/* Search Results */}
                                                {searchTerm && filteredEmps.length > 0 && (
                                                    <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100 shadow-inner">
                                                        {filteredEmps.map(emp => {
                                                            const isSelected = selectedEmps.some(e => e.EMP_NUM === emp.EMP_NUM);
                                                            const isFavorite = favorites.some(f => f.EMP_NUM === emp.EMP_NUM);
                                                            return (
                                                                <div
                                                                    key={emp.EMP_NUM}
                                                                    onClick={() => toggleEmployee(emp)}
                                                                    className={`p-3 hover:bg-white hover:shadow-md rounded-xl cursor-pointer transition-all flex items-center justify-between group relative ${isSelected ? 'bg-emerald-50 border border-emerald-100' : ''}`}
                                                                >
                                                                    {/* زر المفضلة في صف البحث */}
                                                                    <div
                                                                        onClick={(e) => { e.stopPropagation(); toggleFavorite(emp); }}
                                                                        className={`absolute left-3 top-3 p-1.5 rounded-lg transition-colors cursor-pointer ${isFavorite
                                                                            ? "text-amber-500 bg-amber-50"
                                                                            : "text-slate-300 hover:text-amber-500 hover:bg-slate-50"
                                                                            }`}
                                                                        title={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === "Enter" || e.key === " ") {
                                                                                e.stopPropagation();
                                                                                toggleFavorite(emp);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Star className={`w-3.5 h-3.5 ${isFavorite ? "fill-amber-500" : ""}`} />
                                                                    </div>

                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${isSelected ? 'bg-emerald-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                                                                            {emp.EMP_NAME.charAt(0)}
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-sm font-black text-slate-700">{emp.EMP_NAME}</p>
                                                                            <p className="text-[10px] text-slate-400 font-bold">{emp.SEC_N}</p>
                                                                        </div>
                                                                    </div>
                                                                    {isSelected && <Check className="w-4 h-4 text-emerald-500" />}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Selected List with Individual Situations */}
                                                {selectedEmps.length > 0 && (
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {selectedEmps.map(emp => (
                                                            <div key={emp.EMP_NUM} className="space-y-3">
                                                                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-emerald-200">
                                                                            {emp.EMP_NAME.charAt(0)}
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-sm font-black text-slate-900">{emp.EMP_NAME}</p>
                                                                            <p className="text-[10px] text-slate-500 font-bold">{emp.SEC_N}</p>
                                                                        </div>
                                                                    </div>
                                                                    <button type="button" onClick={() => toggleEmployee(emp)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-400 transition-colors">
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>

                                                                {/* Individual Situation Selector */}
                                                                <div className="mr-6 pl-4 border-r-4 border-emerald-200 p-4 bg-white rounded-2xl space-y-3 shadow-sm animate-in slide-in-from-right-2 duration-300">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">المطلوب من المكاتبة (لهذا الموظف):</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {situations.map(sit => (
                                                                            <button
                                                                                key={sit.SITUATION_C}
                                                                                type="button"
                                                                                onClick={() => updateEmpSituation(emp.EMP_NUM, sit.SITUATION_C.toString())}
                                                                                className={`px-4 py-2 rounded-xl border-2 text-[10px] font-black transition-all ${emp.customSituation === sit.SITUATION_C.toString() ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100" : "bg-white border-slate-100 text-slate-500 hover:border-emerald-100"}`}
                                                                            >
                                                                                {sit.SITUATION_DESC}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>



                                        <Button
                                            onClick={handleSubmit}
                                            disabled={loading || !subject || selectedEmps.length === 0}
                                            className="h-14 w-full rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white font-black shadow-xl transition-all group active:scale-95"
                                        >
                                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                                <>
                                                    <FileEdit className="w-5 h-5 ml-2 group-hover:-rotate-12 transition-transform" />
                                                    ابدأ بفتح وتعديل المذكرة
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}

                                {!docType && (
                                    <div className="py-20 text-center space-y-4 bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-100">
                                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-300">
                                            <FileCode className="w-10 h-10" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-black text-slate-400 italic">بانتظار اختيار نوع المكاتبة...</p>
                                            <p className="text-xs text-slate-300 font-bold">يرجى اختيار النوع من القائمة أعلاه لبدء ملء البيانات</p>
                                        </div>
                                    </div>
                                )}
                            </form>
                        )
                        }
                    </CardContent >
                </Card >
            </div >
        </div >
    );
}
