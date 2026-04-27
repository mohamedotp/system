"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    FileText, Send, ArrowRight, Loader2, Building2,
    Calendar as CalendarIcon, Type, StickyNote, UserPlus,
    Search, Check, Info, FolderTree, FileCode, ExternalLink,
    Sparkles, FileEdit, ChevronLeft, ChevronRight, Paperclip,
    ListTodo, X, File, Files, Image as ImageIcon, Star,
    Upload, FileUp, Layout, ArrowLeft, Plus, FolderOpen, Trash2
} from "lucide-react";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

/* ─────────────── STEP INDICATOR ─────────────── */
function StepIndicator({ step, totalSteps }) {
    const steps = [
        { label: "مصدر الملف", icon: FileUp },
        { label: "الموضوع والمرفقات", icon: Paperclip },
        { label: "التوجيه والنوع", icon: UserPlus },
        { label: "مراجعة وإرسال", icon: Send },
    ];
    return (
        <div className="flex items-center gap-0 justify-center mb-8">
            {steps.map((s, i) => {
                const Icon = s.icon;
                const active = i + 1 === step;
                const done = i + 1 < step;
                return (
                    <div key={i} className="flex items-center">
                        <div className={`flex flex-col items-center gap-1 transition-all duration-300`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 shadow-md
                                ${done ? "bg-emerald-500 text-white" : active ? "bg-slate-900 text-white ring-4 ring-slate-900/20" : "bg-slate-100 text-slate-400"}`}>
                                {done ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                            </div>
                            <span className={`text-[10px] font-black hidden sm:block ${active ? "text-slate-900" : done ? "text-emerald-600" : "text-slate-400"}`}>
                                {s.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`w-8 sm:w-16 h-0.5 mx-1 transition-all duration-500 ${done ? "bg-emerald-400" : "bg-slate-200"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ─────────────── MAIN PAGE ─────────────── */
export default function CreateMemoPage() {
    const router = useRouter();
    const fileInputRef = useRef(null);

    // --- Auth & Data ---
    const [user, setUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [docKinds, setDocKinds] = useState([]);
    const [situations, setSituations] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [kindFavorites, setKindFavorites] = useState([]);

    // --- Loading states ---
    const [fetchingEmps, setFetchingEmps] = useState(false);
    const [fetchingKinds, setFetchingKinds] = useState(false);
    const [loading, setLoading] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const isArchivingRef = useRef(false); // منع الإرسال المزدوج
    const isUploadingRef = useRef(false); // منع رفع الملف مرتين
    const isCreatingRef = useRef(false); // منع الإنشاء المزدوج من القالب

    // --- Step flow ---
    const [step, setStep] = useState(1); // 1=source, 2=subject+attachments, 3=recipients+type, 4=review&send

    // --- Step 1: Source ---
    const [sourceMode, setSourceMode] = useState(null); // "upload" | "template" | "draft"
    const [uploadedFile, setUploadedFile] = useState(null); // File object from device
    const [drafts, setDrafts] = useState([]);
    const [fetchingDrafts, setFetchingDrafts] = useState(false);
    const [selectedDraft, setSelectedDraft] = useState(null);

    // --- Step 2: Subject & Attachments ---
    const [subject, setSubject] = useState("");
    const [attachments, setAttachments] = useState([]);

    // --- Step 3: Recipients & Doc Type ---
    const [docType, setDocType] = useState("");
    const [kindSearchTerm, setKindSearchTerm] = useState("");
    const [selectedEmps, setSelectedEmps] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [vacationEmpNo, setVacationEmpNo] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // --- Step 4: After creation ---
    const [savedPath, setSavedPath] = useState(null);
    const [docNo, setDocNo] = useState(null);

    /* ── Initial load ── */
    useEffect(() => {
        fetchUser();
        fetchEmployees();
        fetchSituations();
        fetchDocKinds();
    }, []);

    useEffect(() => {
        if (user) fetchDrafts();
    }, [user]);

    useEffect(() => {
        const timer = setTimeout(() => fetchDocKinds(kindSearchTerm), 300);
        return () => clearTimeout(timer);
    }, [kindSearchTerm]);

    /* ── API calls ── */
    const fetchUser = async () => {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (json.success) {
            setUser(json.user);
            try {
                const sf = localStorage.getItem(`fav_employees_${json.user.empNum}`);
                if (sf) setFavorites(JSON.parse(sf));
                const sk = localStorage.getItem(`fav_docKinds_${json.user.empNum}`);
                if (sk) setKindFavorites(JSON.parse(sk));
            } catch (e) { }
        }
    };

    const fetchDocKinds = async (query = "") => {
        setFetchingKinds(true);
        try {
            const res = await fetch(`/api/memo/kinds?q=${encodeURIComponent(query)}`);
            const json = await res.json();
            if (json.success) {
                const unique = json.data.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
                setDocKinds(unique);
            }
        } catch (e) { } finally { setFetchingKinds(false); }
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
        } catch (e) { } finally { setFetchingEmps(false); }
    };

    const fetchSituations = async () => {
        try {
            const res = await fetch("/api/import/transfer/situations");
            const json = await res.json();
            if (json.success) setSituations(json.data);
        } catch (e) { }
    };

    const fetchDrafts = async () => {
        if (!user) return;
        setFetchingDrafts(true);
        try {
            const res = await fetch("/api/memo/drafts");
            const json = await res.json();
            if (json.success) setDrafts(json.drafts || []);
        } catch (e) { } finally { setFetchingDrafts(false); }
    };

    const handleDeleteDraft = async (dNo) => {
        if (!confirm("هل أنت متأكد من حذف هذه المسودة نهائياً؟")) return;
        try {
            const res = await fetch("/api/memo/drafts", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ docNo: dNo })
            });
            const json = await res.json();
            if (json.success) {
                toast.success("تم حذف المسودة بنجاح");
                fetchDrafts();
            } else {
                toast.error(json.error || "فشل حذف المسودة");
            }
        } catch (err) {
            toast.error("حدث خطأ أثناء الاتصال بالسيرفر");
        }
    };

    /* ── Helpers ── */
    const toggleFavorite = (emp) => {
        if (!user) return;
        const newFavs = favorites.some(f => f.EMP_NUM === emp.EMP_NUM)
            ? favorites.filter(f => f.EMP_NUM !== emp.EMP_NUM)
            : [...favorites, emp];
        setFavorites(newFavs);
        try { localStorage.setItem(`fav_employees_${user.empNum}`, JSON.stringify(newFavs)); } catch (e) { }
    };

    const toggleKindFavorite = (kind) => {
        if (!user) return;
        const newFavs = kindFavorites.some(k => k.id === kind.id)
            ? kindFavorites.filter(k => k.id !== kind.id)
            : [...kindFavorites, kind];
        setKindFavorites(newFavs);
        try { localStorage.setItem(`fav_docKinds_${user.empNum}`, JSON.stringify(newFavs)); } catch (e) { }
    };

    const toggleEmployee = (emp) => {
        if (selectedEmps.some(e => e.EMP_NUM === emp.EMP_NUM)) {
            setSelectedEmps(selectedEmps.filter(e => e.EMP_NUM !== emp.EMP_NUM));
        } else {
            setSelectedEmps([...selectedEmps, {
                ...emp,
                customSituation: situations.length > 0 ? situations[0].SITUATION_C.toString() : "7"
            }]);
            setSearchTerm("");
        }
    };

    const updateEmpSituation = (empNum, situationId) => {
        setSelectedEmps(selectedEmps.map(e =>
            e.EMP_NUM === empNum ? { ...e, customSituation: situationId } : e
        ));
    };

    const handleOpenFile = async (filePath, dNo) => {
        if (!filePath) return;
        let rawPath = filePath.split('|').filter(p => !!p)[0];
        if (!rawPath) return;
        let finalPath = rawPath.trim().replace(/\//g, "\\");
        if (finalPath.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/) || (finalPath.split('\\')[0].includes('-') && !finalPath.startsWith("\\"))) {
            finalPath = "\\\\" + finalPath;
        } else if (finalPath.startsWith("\\") && !finalPath.startsWith("\\\\")) {
            finalPath = "\\" + finalPath;
        }
        const lowerPath = finalPath.toLowerCase();
        const isPdf = lowerPath.endsWith(".pdf");
        const isImage = [".jpg", ".jpeg", ".png", ".gif", ".bmp"].some(ext => lowerPath.endsWith(ext));
        const hasExt = finalPath.split(/[\\\/]/).pop().includes(".");
        if (isPdf || isImage || !hasExt) {
            let vp = finalPath;
            if (!hasExt && !isPdf) vp += ".pdf";
            window.open(`/pdf-viewer?file=${encodeURIComponent(vp)}&docNo=${dNo || ''}`, '_blank');
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
            toast.error("حدث خطأ أثناء محاولة فتح الملف");
        }
    };

    /* ── Filtered data ── */
    const filteredEmps = employees.filter(emp => {
        const matchesSearch = emp.EMP_NAME.includes(searchTerm) || emp.EMP_NUM.toString().includes(searchTerm);
        const isNotSelf = user ? String(emp.EMP_NUM) !== String(user.empNum) : true;
        return matchesSearch && isNotSelf;
    }).slice(0, 6);

    const isVacation = useMemo(() => {
        const selectedKind = docKinds.find(k => k.id.toString() === docType.toString());
        if (!selectedKind) return false;
        const normalize = (text) => (text || "").replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
        return normalize(selectedKind.label || "").includes(normalize("اجازة")) ||
            normalize(selectedKind.DOC_DESC_A || "").includes(normalize("اجازة"));
    }, [docType, docKinds]);

    /* ── STEP 2 → SAVE AS DRAFT (no recipients needed, docType optional) ── */
    const handleSaveAsDraft = async () => {
        if (!subject.trim()) { toast.error("برجاء كتابة موضوع المذكرة أولاً"); return; }
        setSavingDraft(true);
        try {
            if (sourceMode === "upload") {
                if (!uploadedFile) { toast.error("برجاء رفع الملف أولاً"); setSavingDraft(false); return; }
                const formData = new FormData();
                formData.append("wordFile", uploadedFile);
                formData.append("subject", subject);
                if (docType) formData.append("docType", docType);

                const res = await fetch("/api/memo/upload-word", {
                    method: "POST",
                    body: formData
                });
                const json = await res.json();
                if (json.success) {
                    toast.success("✅ تم رفع الملف وحفظ المسودة بنجاح");
                    setTimeout(() => router.push("/import"), 1500);
                } else {
                    toast.error(json.error || "فشل حفظ المسودة");
                }
            } else {
                const res = await fetch("/api/memo/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        docType: docType || 1,
                        subject,
                        recipientEmpNums: [], 
                    })
                });
                const json = await res.json();
                if (json.success) {
                    toast.success("✅ تم حفظ المذكرة كمسودة بنجاح — يمكنك استكمالها لاحقاً");
                    handleOpenFile(json.generatedPath);
                    setTimeout(() => router.push("/import"), 1800);
                } else {
                    toast.error(json.error || "فشل حفظ المسودة");
                }
            }
        } catch (err) {
            toast.error("حدث خطأ أثناء الاتصال بالسيرفر");
        } finally {
            setSavingDraft(false);
        }
    };

    /* ── STEP 3 → CREATE (from template/create) ── */
    const handleCreateFromTemplate = async () => {
        if (isCreatingRef.current) return;
        isCreatingRef.current = true;

        if (selectedEmps.length === 0 || !subject || !docType) {
            isCreatingRef.current = false;
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
                toast.success("تم تجهيز المكاتبة بنجاح");
                setSavedPath(json.generatedPath);
                setDocNo(json.docNo);
                setStep(4);
                handleOpenFile(json.generatedPath);
            } else {
                isCreatingRef.current = false;
                toast.error(json.error || "فشل إنشاء المذكرة");
            }
        } catch (err) {
            isCreatingRef.current = false;
            toast.error("حدث خطأ أثناء الاتصال بالسيرفر");
        } finally {
            setLoading(false);
        }
    };

    /* ── STEP 3 → CREATE (from uploaded file) ── */
    const handleCreateFromUpload = async () => {
        if (isUploadingRef.current) return; // منع الضغط مرتين
        isUploadingRef.current = true;

        if (!uploadedFile || !subject) {
            isUploadingRef.current = false;
            toast.error("برجاء التأكد من رفع الملف وكتابة الموضوع");
            return;
        }
        if (selectedEmps.length === 0) {
            isUploadingRef.current = false;
            toast.error("برجاء اختيار المستلمين");
            return;
        }
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("wordFile", uploadedFile);
            formData.append("subject", subject);
            if (docType) formData.append("docType", docType);

            const res = await fetch("/api/memo/upload-word", {
                method: "POST",
                body: formData
            });
            const json = await res.json();
            if (json.success) {
                toast.success("تم رفع الملف وتسجيل المكاتبة");
                setSavedPath(json.generatedPath);
                setDocNo(json.docNo);
                setStep(4);
            } else {
                isUploadingRef.current = false;
                toast.error(json.error || "فشل رفع الملف");
            }
        } catch (err) {
            isUploadingRef.current = false;
            toast.error("حدث خطأ أثناء الاتصال بالسيرفر");
        } finally {
            setLoading(false);
        }
    };

    /* ── STEP 4 → SEND (Archive) ── */
    const handleArchive = async () => {
        // منع الإرسال المزدوج بشكل فوري (قبل أي await)
        if (isArchivingRef.current) return;
        isArchivingRef.current = true;

        const allHaveSituations = selectedEmps.every(e => e.customSituation);
        if (!allHaveSituations) {
            isArchivingRef.current = false;
            toast.error("برجاء اختيار 'المطلوب' لكل مستلم قبل الإرسال");
            return;
        }
        setIsArchiving(true);
        try {
            let attachmentPath = null;
            if (attachments && attachments.length > 0) {
                const formData = new FormData();
                formData.append("docNo", docNo);
                attachments.forEach(item => {
                    formData.append("files", item.file);
                    formData.append("descriptions", item.desc || item.file.name);
                });
                const uploadRes = await fetch("/api/memo/upload", { method: "POST", body: formData });
                const uploadJson = await uploadRes.json();
                if (!uploadJson.success) throw new Error(uploadJson.error);
                attachmentPath = uploadJson.attachments;
            }

            const res = await fetch("/api/memo/archive", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    docNo,
                    path: savedPath,
                    attachments: attachmentPath,
                    recipients: selectedEmps.map(e => ({
                        empNum: e.EMP_NUM,
                        situationId: e.customSituation
                    })),
                    docType
                })
            });
            const json = await res.json();
            if (json.success) {
                if (json.warning) {
                    toast.warning(json.warning, { duration: 5000 });
                } else {
                    toast.success("✅ تم الإرسال بنجاح!");
                    if (json.pdfPath) {
                        // فتح الرابط النهائي مباشرة بعد النجاح لضمان عدم ظهور صفحة بيضاء
                        const pdfUrl = `/pdf-viewer?file=${encodeURIComponent(json.pdfPath)}&docNo=${docNo}`;
                        window.open(pdfUrl, '_blank');
                    }
                }
                // تأخير بسيط للتوجيه للسماح للنافذة المنبثقة بالظهور
                setTimeout(() => router.push("/export"), 1000);
            } else {
                isArchivingRef.current = false;
                toast.error(json.error || "فشل الإرسال");
            }
        } catch (err) {
            isArchivingRef.current = false;
            toast.error(err.message || "حدث خطأ أثناء الاتصال بالسيرفر");
        } finally {
            setIsArchiving(false);
        }
    };

    /* ─────────────── RENDER ─────────────── */
    return (
        <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
            {/* Header */}
            <div className="bg-slate-900 pt-10 pb-24 text-white">
                <div className="max-w-3xl mx-auto px-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
                    >
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        <span>العودة للخلف</span>
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-emerald-500 rounded-2xl shadow-xl shadow-emerald-500/20">
                            <StickyNote className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black">إنشاء مذكرة جديدة</h1>
                            <p className="text-slate-400 text-sm font-bold mt-1">
                                {step === 1 && "اختر مصدر الملف"}
                                {step === 2 && "أضف الموضوع والمرفقات"}
                                {step === 3 && "حدد نوع المكاتبة والمستلمين"}
                                {step === 4 && "راجع واعتمد وأرسل"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card */}
            <div className="max-w-3xl mx-auto px-6 -mt-12">
                <Card className="border-none shadow-2xl rounded-[28px] overflow-hidden bg-white">
                    <CardContent className="p-8">
                        <StepIndicator step={step} totalSteps={4} />

                        {/* ══════════ STEP 1: Source ══════════ */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-400">
                                <p className="text-center font-black text-slate-700 text-lg">اختار مصدر الملف</p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Upload from device */}
                                    <button
                                        onClick={() => { setSourceMode("upload"); fileInputRef.current?.click(); }}
                                        className={`group relative flex flex-col items-center gap-4 p-8 rounded-3xl border-2 transition-all cursor-pointer text-center
                                            ${sourceMode === "upload" && uploadedFile
                                                ? "border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-100"
                                                : "border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-lg"}`}
                                    >
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all
                                            ${sourceMode === "upload" && uploadedFile ? "bg-emerald-500" : "bg-blue-100 group-hover:bg-blue-500"}`}>
                                            <FileUp className={`w-8 h-8 transition-colors ${sourceMode === "upload" && uploadedFile ? "text-white" : "text-blue-500 group-hover:text-white"}`} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 text-base">رفع ملف Word من الجهاز</p>
                                            <p className="text-xs text-slate-400 font-bold mt-1">اختر ملف .docx أو .docm موجود على جهازك</p>
                                        </div>
                                        {sourceMode === "upload" && uploadedFile && (
                                            <div className="absolute top-3 left-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </button>

                                    {/* Choose from templates */}
                                    <button
                                        onClick={() => { setSourceMode("template"); setStep(2); }}
                                        className={`group relative flex flex-col items-center gap-4 p-8 rounded-3xl border-2 transition-all cursor-pointer text-center
                                            ${sourceMode === "template"
                                                ? "border-amber-500 bg-amber-50 shadow-xl shadow-amber-100"
                                                : "border-slate-200 hover:border-amber-400 hover:bg-amber-50 hover:shadow-lg"}`}
                                    >
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all
                                            ${sourceMode === "template" ? "bg-amber-500" : "bg-amber-100 group-hover:bg-amber-500"}`}>
                                            <Layout className={`w-8 h-8 transition-colors ${sourceMode === "template" ? "text-white" : "text-amber-500 group-hover:text-white"}`} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 text-base">اختيار من القوالب الجاهزة</p>
                                            <p className="text-xs text-slate-400 font-bold mt-1">استخدم قالباً جاهزاً من القوالب المحفوظة</p>
                                        </div>
                                        {sourceMode === "template" && (
                                            <div className="absolute top-3 left-3 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </button>

                                    {/* drafts */}
                                    <button
                                        onClick={() => { setSourceMode("draft"); fetchDrafts(); }}
                                        className={`group relative flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all cursor-pointer text-center
                                            ${sourceMode === "draft"
                                                ? "border-purple-500 bg-purple-50 shadow-xl shadow-purple-100"
                                                : "border-slate-200 hover:border-purple-400 hover:bg-purple-50 hover:shadow-lg"}`}
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all
                                            ${sourceMode === "draft" ? "bg-purple-500" : "bg-purple-100 group-hover:bg-purple-500"}`}>
                                            <FolderOpen className={`w-7 h-7 transition-colors ${sourceMode === "draft" ? "text-white" : "text-purple-500 group-hover:text-white"}`} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 text-sm">استكمال من المسودة</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-1">تعديل مكاتبة قمت بحفظها سابقاً</p>
                                        </div>
                                        {sourceMode === "draft" && (
                                            <div className="absolute top-3 left-3 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </button>
                                </div>

                                {/* Drafts list */}
                                {sourceMode === "draft" && (
                                    <div className="space-y-3 animate-in fade-in duration-300">
                                        <label className="text-xs font-black text-slate-500">اختر من المسودات المتاحة:</label>
                                        {fetchingDrafts ? (
                                            <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-500" /></div>
                                        ) : drafts.length === 0 ? (
                                            <div className="py-10 text-center border rounded-2xl border-dashed text-slate-400 font-bold">لا توجد مسودات حالية</div>
                                        ) : (
                                            <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                                                {drafts.map(draft => (
                                                    <div
                                                        key={draft.docNo}
                                                        onClick={() => {
                                                            setSelectedDraft(draft);
                                                            setSubject(draft.subject || "");
                                                            setDocType(draft.docType?.toString() || "");
                                                            setDocNo(draft.docNo);
                                                            setSavedPath(draft.fileName);
                                                            setStep(2);
                                                        }}
                                                        className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-purple-300 hover:shadow-md cursor-pointer transition-all group"
                                                    >
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-black text-xs shrink-0">
                                                                {draft.docNo}
                                                            </div>
                                                            <div className="text-right flex-1 min-w-0">
                                                                <p className="text-sm font-black text-slate-800 truncate">{draft.subject}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold">{draft.docTypeDesc} · {new Date(draft.date).toLocaleDateString("ar-EG")}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteDraft(draft.docNo);
                                                                }}
                                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                title="حذف المسودة"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                            <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-purple-500" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".docx,.docm,.doc"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setUploadedFile(file);
                                            setSourceMode("upload");
                                            toast.success(`تم اختيار: ${file.name}`);
                                        }
                                        e.target.value = '';
                                    }}
                                />

                                {/* Uploaded file preview */}
                                {uploadedFile && sourceMode === "upload" && (
                                    <div className="flex items-center gap-4 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl animate-in fade-in duration-300">
                                        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1 text-right">
                                            <p className="font-black text-slate-800 text-sm">{uploadedFile.name}</p>
                                            <p className="text-xs text-slate-400 font-bold">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-xs text-blue-500 hover:text-blue-700 font-black px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors"
                                            >تغيير</button>
                                            <button
                                                onClick={() => { setUploadedFile(null); setSourceMode(null); }}
                                                className="text-xs text-red-400 hover:text-red-600 font-black px-2 py-1.5 rounded-xl hover:bg-red-50 transition-colors"
                                            ><X className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                )}

                                {uploadedFile && sourceMode === "upload" && (
                                    <Button
                                        onClick={() => setStep(2)}
                                        className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white font-black text-base shadow-xl transition-all active:scale-95"
                                    >
                                        التالي: إضافة الموضوع
                                        <ChevronLeft className="w-5 h-5 mr-2" />
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* ══════════ STEP 2: Subject & Attachments ══════════ */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-400">

                                {/* Source summary */}
                                <div className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-bold
                                    ${sourceMode === "upload" ? "bg-blue-50 border-blue-100 text-blue-700"
                                    : sourceMode === "draft" ? "bg-purple-50 border-purple-100 text-purple-700"
                                    : "bg-amber-50 border-amber-100 text-amber-700"}`}>
                                    {sourceMode === "upload"
                                        ? <><FileUp className="w-4 h-4 shrink-0" /><span>ملف مرفوع: <span className="font-black">{uploadedFile?.name}</span></span></>
                                        : sourceMode === "draft"
                                        ? <><FolderOpen className="w-4 h-4 shrink-0" /><span>استكمال مسودة: <span className="font-black">{selectedDraft?.subject || "مسودة محفوظة"}</span></span></>
                                        : <><Layout className="w-4 h-4 shrink-0" /><span>سيتم إنشاء المذكرة من قالب جاهز — يمكنك حفظها مسودة الآن أو تحديد المستلمين لاحقاً</span></>}
                                </div>

                                {/* Doc Type — only for template mode, shown here in Step 2 */}
                                {sourceMode === "template" && (
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2 text-sm font-black text-slate-700">
                                            <Type className="w-4 h-4 text-amber-500" />
                                            نوع المكاتبة <span className="text-red-500">*</span>
                                        </label>

                                        {!docType ? (
                                            <div className="space-y-3">
                                                {kindFavorites.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-100">
                                                        {kindFavorites.map(kind => (
                                                            <button key={kind.id} onClick={() => setDocType(kind.id.toString())}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-white text-xs font-black text-amber-700 hover:bg-amber-100 transition-all">
                                                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                                                {kind.label || kind.DOC_DESC_A}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="relative">
                                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <Input placeholder="ابحث باسم المكاتبة..." value={kindSearchTerm}
                                                        onChange={(e) => setKindSearchTerm(e.target.value)}
                                                        className="h-11 pr-11 rounded-xl font-bold text-right border-slate-200" />
                                                </div>
                                                <div className="max-h-44 overflow-y-auto space-y-1 bg-slate-50 rounded-2xl border border-slate-100 p-2">
                                                    {docKinds.map(kind => {
                                                        const isFav = kindFavorites.some(k => k.id === kind.id);
                                                        return (
                                                            <div key={kind.id} onClick={() => setDocType(kind.id.toString())}
                                                                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white hover:shadow-md cursor-pointer transition-all group">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-black text-xs shrink-0">
                                                                        {kind.id}
                                                                    </div>
                                                                    <span className="text-sm font-black text-slate-700">{kind.label || kind.DOC_DESC_A}</span>
                                                                </div>
                                                                <button onClick={(e) => { e.stopPropagation(); toggleKindFavorite(kind); }}
                                                                    className={`p-1 rounded-lg ${isFav ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`}>
                                                                    <Star className={`w-3.5 h-3.5 ${isFav ? "fill-amber-500" : ""}`} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                                                        <Check className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-emerald-600 font-black">النوع المختار</p>
                                                        <p className="font-black text-emerald-900">{docKinds.find(k => k.id.toString() === docType)?.label}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setDocType("")} className="text-xs text-slate-400 hover:text-slate-600 font-black px-2 py-1 rounded-lg hover:bg-white transition">تغيير</button>
                                            </div>
                                        )}

                                        {/* Vacation fields */}
                                        {isVacation && (
                                            <div className="grid grid-cols-3 gap-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-black text-slate-600">رقم الموظف</label>
                                                    <Input value={vacationEmpNo} onChange={e => setVacationEmpNo(e.target.value)} placeholder="رقم الموظف" className="h-10 rounded-xl text-right" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-black text-slate-600">من تاريخ</label>
                                                    <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-10 rounded-xl" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-black text-slate-600">إلى تاريخ</label>
                                                    <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-10 rounded-xl" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Subject */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-black text-slate-700">
                                        <FileText className="w-4 h-4 text-blue-500" />
                                        موضوع المذكرة <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        placeholder="اكتب تفاصيل الموضوع هنا..."
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        rows={3}
                                        className="w-full p-4 rounded-2xl border border-slate-200 bg-white font-bold text-right shadow-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 resize-none"
                                    />
                                </div>

                                {/* Attachments */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-sm font-black text-slate-700">
                                        <Paperclip className="w-4 h-4 text-blue-500" />
                                        مرفقات إضافية (اختياري)
                                    </label>

                                    <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group">
                                        <div className="w-12 h-12 bg-slate-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
                                            <Plus className="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
                                        </div>
                                        <span className="text-sm font-black text-slate-500 group-hover:text-blue-600">اضغط لإضافة مرفقات</span>
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => {
                                                const newFiles = Array.from(e.target.files);
                                                setAttachments(prev => [...prev, ...newFiles.map(f => ({ file: f, desc: "" }))]);
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>

                                    {attachments.length > 0 && (
                                        <div className="space-y-2">
                                            {attachments.map((item, idx) => {
                                                const isImage = item.file.type.startsWith('image/');
                                                return (
                                                    <div key={`${item.file.name}-${idx}`}
                                                        className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-blue-200 transition-all">
                                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                                            {isImage
                                                                ? <img src={URL.createObjectURL(item.file)} alt="" className="w-full h-full object-cover" />
                                                                : <File className="w-5 h-5 text-slate-400" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-black text-slate-700 truncate">{item.file.name}</p>
                                                            <Input
                                                                placeholder="وصف المرفق..."
                                                                value={item.desc}
                                                                onChange={(e) => {
                                                                    const updated = [...attachments];
                                                                    updated[idx].desc = e.target.value;
                                                                    setAttachments(updated);
                                                                }}
                                                                className="h-7 mt-1 text-xs rounded-lg border-slate-200 bg-white"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                                                            className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-300 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Navigation */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={() => setStep(1)} className="h-12 flex-1 rounded-2xl font-black border-slate-200">
                                            <ArrowRight className="w-4 h-4 ml-2" /> السابق
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                if (!subject.trim()) { toast.error("برجاء كتابة موضوع المذكرة"); return; }
                                                if (sourceMode === "template" && !docType) { toast.error("برجاء اختيار نوع المكاتبة"); return; }
                                                setStep(3);
                                            }}
                                            className="h-12 flex-[2] rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white font-black shadow-lg transition-all active:scale-95"
                                        >
                                            التالي: التوجيه والمستلمين
                                            <ChevronLeft className="w-5 h-5 mr-2" />
                                        </Button>
                                    </div>
                                    {/* Save as Draft — for all source modes */}
                                    {(sourceMode === "template" || sourceMode === "draft" || (sourceMode === "upload" && uploadedFile)) && (
                                        <Button
                                            onClick={handleSaveAsDraft}
                                            disabled={savingDraft || !subject.trim()}
                                            variant="outline"
                                            className="w-full h-11 rounded-2xl border-purple-200 text-purple-700 hover:bg-purple-50 font-black transition-all"
                                        >
                                            {savingDraft
                                                ? <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري الحفظ...</>
                                                : <><FolderOpen className="w-4 h-4 ml-2" /> حفظ كمسودة الآن (بدون تحديد مستلمين)</>}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ══════════ STEP 3: Recipients & Doc Type ══════════ */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-400">

                                {/* Recipients */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-sm font-black text-slate-700">
                                        <UserPlus className="w-4 h-4 text-blue-500" />
                                        توجيه إلى <span className="text-red-500">*</span>
                                    </label>

                                    {/* Favorites */}
                                    {favorites.length > 0 && (
                                        <div className="flex flex-wrap gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-100">
                                            {favorites.map(fav => {
                                                const isSel = selectedEmps.some(e => e.EMP_NUM === fav.EMP_NUM);
                                                return (
                                                    <button key={fav.EMP_NUM} onClick={() => toggleEmployee(fav)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all
                                                        ${isSel ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-white text-slate-600 hover:border-emerald-300"}`}>
                                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black
                                                            ${isSel ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                                                            {fav.EMP_NAME?.charAt(0)}
                                                        </div>
                                                        {fav.EMP_NAME}
                                                        {isSel && <Check className="w-3 h-3" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="ابحث بالاسم أو رقم الملف..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="h-11 pr-11 rounded-xl font-bold text-right border-slate-200"
                                        />
                                    </div>

                                    {/* Search Results */}
                                    {searchTerm && filteredEmps.length > 0 && (
                                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-2 space-y-1">
                                            {filteredEmps.map(emp => {
                                                const isSel = selectedEmps.some(e => e.EMP_NUM === emp.EMP_NUM);
                                                const isFav = favorites.some(f => f.EMP_NUM === emp.EMP_NUM);
                                                return (
                                                    <div key={emp.EMP_NUM} onClick={() => toggleEmployee(emp)}
                                                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all
                                                        ${isSel ? "bg-emerald-50 border border-emerald-100" : "hover:bg-white hover:shadow-sm"}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs
                                                                ${isSel ? "bg-emerald-500 text-white" : "bg-blue-100 text-blue-600"}`}>
                                                                {emp.EMP_NAME.charAt(0)}
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-black text-slate-700">{emp.EMP_NAME}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold">{emp.SEC_N} · {emp.EMP_NUM}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={e => { e.stopPropagation(); toggleFavorite(emp); }}
                                                                className={`p-1 rounded ${isFav ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`}>
                                                                <Star className={`w-3.5 h-3.5 ${isFav ? "fill-amber-500" : ""}`} />
                                                            </button>
                                                            {isSel && <Check className="w-4 h-4 text-emerald-500" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Selected employees */}
                                    {selectedEmps.length > 0 && (
                                        <div className="space-y-3">
                                            {selectedEmps.map(emp => (
                                                <div key={emp.EMP_NUM} className="space-y-2">
                                                    <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-white text-sm shadow">
                                                                {emp.EMP_NAME.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-slate-900">{emp.EMP_NAME}</p>
                                                                <p className="text-[10px] text-slate-500 font-bold">{emp.SEC_N}</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => toggleEmployee(emp)}
                                                            className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 transition-colors">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    {/* Situation */}
                                                    <div className="mr-4 pr-4 border-r-4 border-emerald-200 flex flex-wrap gap-2">
                                                        {situations.map(sit => (
                                                            <button key={sit.SITUATION_C} onClick={() => updateEmpSituation(emp.EMP_NUM, sit.SITUATION_C.toString())}
                                                                className={`px-3 py-1.5 rounded-xl border-2 text-[10px] font-black transition-all
                                                                ${emp.customSituation === sit.SITUATION_C.toString()
                                                                        ? "bg-emerald-600 border-emerald-600 text-white shadow"
                                                                        : "bg-white border-slate-100 text-slate-500 hover:border-emerald-200"}`}>
                                                                {sit.SITUATION_DESC}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Navigation */}
                                <div className="flex gap-3 pt-2">
                                    <Button variant="outline" onClick={() => setStep(2)} className="h-12 flex-1 rounded-2xl font-black border-slate-200">
                                        <ArrowRight className="w-4 h-4 ml-2" /> السابق
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            if (sourceMode === "draft") {
                                                setStep(4);
                                            } else if (sourceMode === "upload") {
                                                handleCreateFromUpload();
                                            } else {
                                                handleCreateFromTemplate();
                                            }
                                        }}
                                        disabled={loading || selectedEmps.length === 0 || (sourceMode === "template" && !docType)}
                                        className="h-12 flex-[2] rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white font-black shadow-lg transition-all active:scale-95"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <>
                                                {sourceMode === "upload" ? <FileUp className="w-4 h-4 ml-2" /> : sourceMode === "draft" ? <ChevronLeft className="w-4 h-4 ml-2" /> : <FileEdit className="w-4 h-4 ml-2" />}
                                                {sourceMode === "upload" ? "رفع وتسجيل المكاتبة" : sourceMode === "draft" ? "التالي: المراجعة والإرسال" : "إنشاء وفتح الملف"}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ══════════ STEP 4: Review & Send ══════════ */}
                        {step === 4 && savedPath && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-400">
                                {/* Success banner */}
                                <div className="text-center space-y-3 py-4">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                        <Sparkles className="w-10 h-10 text-emerald-600" />
                                    </div>
                                    <h2 className="text-xl font-black text-slate-900">الملف جاهز</h2>
                                    <p className="text-sm text-slate-500 font-bold">رقم المكاتبة: <span className="text-blue-600 font-black">{docNo}</span></p>
                                </div>

                                {/* Subject summary */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 mb-1">الموضوع</p>
                                    <p className="font-black text-slate-800">{subject}</p>
                                </div>

                                {/* Recipients summary */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                    <p className="text-[10px] font-black text-slate-400">التوجيه إلى</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedEmps.map(emp => (
                                            <div key={emp.EMP_NUM} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center text-[10px] font-black text-white">{emp.EMP_NAME.charAt(0)}</div>
                                                <span className="text-xs font-black text-slate-700">{emp.EMP_NAME}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Attachments area in step 4 */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-sm font-black text-slate-700">
                                        <Paperclip className="w-4 h-4 text-blue-500" />
                                        مرفقات إضافية (اختياري)
                                    </label>
                                    <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group">
                                        <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                                        <span className="text-sm font-black text-slate-500 group-hover:text-blue-600">إضافة ملفات</span>
                                        <input type="file" multiple className="hidden"
                                            onChange={(e) => {
                                                const newFiles = Array.from(e.target.files);
                                                setAttachments(prev => [...prev, ...newFiles.map(f => ({ file: f, desc: "" }))]);
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                    {attachments.length > 0 && (
                                        <div className="space-y-2">
                                            {attachments.map((item, idx) => (
                                                <div key={`${item.file.name}-${idx}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                                    <File className="w-4 h-4 text-slate-400 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black text-slate-600 truncate">{item.file.name}</p>
                                                        <Input placeholder="وصف..." value={item.desc}
                                                            onChange={e => { const u = [...attachments]; u[idx].desc = e.target.value; setAttachments(u); }}
                                                            className="h-7 mt-1 text-xs rounded-lg" />
                                                    </div>
                                                    <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                                                        className="p-1 hover:text-red-500 text-slate-300 transition-colors">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    {sourceMode === "template" && (
                                        <Button
                                            onClick={() => handleOpenFile(savedPath, docNo)}
                                            className="h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black shadow-lg group"
                                        >
                                            <ExternalLink className="w-5 h-5 ml-2 group-hover:rotate-12 transition-transform" />
                                            فتح وتعديل الملف
                                        </Button>
                                    )}
                                    <Button
                                        onClick={handleArchive}
                                        disabled={isArchiving}
                                        className={`h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-200 animate-pulse hover:animate-none
                                            ${sourceMode === "upload" ? "col-span-full" : ""}`}
                                    >
                                        {isArchiving
                                            ? <><Loader2 className="w-5 h-5 animate-spin ml-2" /> جاري الإرسال...</>
                                            : <><Send className="w-5 h-5 ml-2" /> اعتماد وإرسال</>}
                                    </Button>

                                    {sourceMode !== "upload" && (
                                        <Button
                                            onClick={() => {
                                                toast.success("تم حفظ المكاتبة كمسودة بنجاح");
                                                setTimeout(() => router.push("/import"), 800);
                                            }}
                                            variant="outline"
                                            className="h-14 rounded-2xl border-slate-200 font-black text-slate-600 hover:bg-slate-50 col-span-full"
                                        >
                                            <FolderOpen className="w-5 h-5 ml-2 text-purple-500" />
                                            حفظ كمسودة (بدون إرسال)
                                        </Button>
                                    )}
                                </div>

                                <button
                                    onClick={() => router.push("/import")}
                                    className="w-full text-sm text-slate-400 hover:text-slate-600 font-black py-2 transition-colors"
                                >
                                    الذهاب للسجل بدون إرسال
                                </button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
