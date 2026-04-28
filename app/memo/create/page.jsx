"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    FileText, Send, Loader2, Building2,
    Calendar as CalendarIcon, Type, StickyNote, UserPlus,
    Search, Check, Info, FolderTree, FileCode, ExternalLink,
    Sparkles, FileEdit, ChevronLeft, ChevronRight, Paperclip,
    ListTodo, X, File, Files, Image as ImageIcon, Star,
    Upload, FileUp, Layout, ArrowLeft, Plus, FolderOpen, Trash2,
    ArrowRight, ShieldCheck
} from "lucide-react";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

/* ─────────────── SECTION HEADER ─────────────── */
function SectionHeader({ icon: Icon, label, color = "blue", badge }) {
    const colorMap = {
        blue: "bg-blue-100 text-blue-600",
        amber: "bg-amber-100 text-amber-600",
        emerald: "bg-emerald-100 text-emerald-600",
        purple: "bg-purple-100 text-purple-600",
    };
    return (
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color]}`}>
                <Icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-black text-slate-700">{label}</span>
            {badge && (
                <span className="text-[10px] font-black text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">{badge}</span>
            )}
        </div>
    );
}

/* ─────────────── MAIN PAGE ─────────────── */
export default function CreateMemoPage() {
    const router = useRouter();

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
    const [isApproving, setIsApproving] = useState(false);
    const isArchivingRef = useRef(false);
    const isCreatingRef = useRef(false);

    // --- Source ---
    const [sourceMode, setSourceMode] = useState(null); // "template" | "draft"
    const [drafts, setDrafts] = useState([]);
    const [fetchingDrafts, setFetchingDrafts] = useState(false);
    const [selectedDraft, setSelectedDraft] = useState(null);

    // --- Form fields ---
    const [subject, setSubject] = useState("");
    const [attachments, setAttachments] = useState([]);
    const [docType, setDocType] = useState("");
    const [kindSearchTerm, setKindSearchTerm] = useState("");
    const [selectedEmps, setSelectedEmps] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [vacationEmpNo, setVacationEmpNo] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // --- After creation ---
    const [savedPath, setSavedPath] = useState(null);
    const [docNo, setDocNo] = useState(null);
    const [creationDone, setCreationDone] = useState(false);
    const [isApproved, setIsApproved] = useState(false);   // تم الاعتماد وفتح الـ PDF
    const [isWordOpened, setIsWordOpened] = useState(false); // تم فتح الورد للتعديل
    const [openingWord, setOpeningWord] = useState(false);  // جاري فتح الورد

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
                if (selectedDraft?.docNo === dNo) {
                    setSelectedDraft(null);
                    setSubject(""); setDocType(""); setDocNo(null); setSavedPath(null);
                }
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
        const isWord = lowerPath.endsWith(".docx") || lowerPath.endsWith(".docm") || lowerPath.endsWith(".doc");
        const isImage = [".jpg", ".jpeg", ".png", ".gif", ".bmp"].some(ext => lowerPath.endsWith(ext));
        const hasExt = finalPath.split(/[\\\/]/).pop().includes(".");

        // ← لو ملف Word → فتحه مباشرة عبر API بدون الدخول في منطق PDF
        if (isWord) {
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
                        toast.success("يتم الآن فتح الملف في Word...");
                    }
                } else {
                    toast.error("فشل فتح الملف: " + json.error);
                }
            } catch (e) {
                toast.error("حدث خطأ أثناء محاولة فتح الملف");
            }
            return;
        }

        // ← PDF أو صورة أو ملف بدون امتداد → فتحه في الـ PDF viewer
        if (isPdf || isImage || !hasExt) {
            let vp = finalPath;
            if (!hasExt && !isPdf) vp += ".pdf";
            window.open(`/pdf-viewer?file=${encodeURIComponent(vp)}&docNo=${dNo || ''}`, '_blank');
            return;
        }

        // ← أي امتداد آخر → open-local API
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

    /* ── Ensure doc is created before send/approve ── */
    const ensureDocCreated = async () => {
        if (creationDone && docNo && savedPath) return true;
        if (isCreatingRef.current) return false;
        isCreatingRef.current = true;

        if (!subject.trim()) { toast.error("برجاء كتابة موضوع المذكرة"); isCreatingRef.current = false; return false; }
        if (!docType) { toast.error("برجاء اختيار نوع المكاتبة"); isCreatingRef.current = false; return false; }

        setLoading(true);
        try {
            let endpoint, body, fetchOpts;
            if (sourceMode === "draft" && docNo) {
                // Already has docNo from draft
                isCreatingRef.current = false;
                setLoading(false);
                return true;
            }
            // Create from template
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
                setSavedPath(json.generatedPath);
                setDocNo(json.docNo);
                setCreationDone(true);
                handleOpenFile(json.generatedPath);
                isCreatingRef.current = false;
                return true;
            } else {
                toast.error(json.error || "فشل إنشاء المذكرة");
                isCreatingRef.current = false;
                return false;
            }
        } catch (err) {
            toast.error("حدث خطأ أثناء الاتصال بالسيرفر");
            isCreatingRef.current = false;
            return false;
        } finally {
            setLoading(false);
        }
    };

    /* ── SAVE AS DRAFT ── */
    const handleSaveAsDraft = async () => {
        if (!subject.trim()) { toast.error("برجاء كتابة موضوع المذكرة أولاً"); return; }
        setSavingDraft(true);
        try {
            // لو المذكرة اتعملت بالفعل (بعد الاعتماد مثلاً) روح للسجل مباشرة
            if (creationDone && docNo) {
                toast.success("✅ المذكرة محفوظة بالفعل كمسودة");
                setTimeout(() => router.push("/import"), 1200);
                return;
            }
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
                toast.success("✅ تم حفظ المذكرة كمسودة بنجاح");
                handleOpenFile(json.generatedPath);
                setTimeout(() => router.push("/import"), 1800);
            } else {
                toast.error(json.error || "فشل حفظ المسودة");
            }
        } catch (err) {
            toast.error("حدث خطأ أثناء الاتصال بالسيرفر");
        } finally {
            setSavingDraft(false);
        }
    };

    /* ── فتح ملف الـ Word للتعديل ── */
    const handleOpenWordForEdit = async () => {
        if (!subject.trim()) { toast.error("برجاء كتابة موضوع المذكرة أولاً"); return; }
        if (!docType) { toast.error("برجاء اختيار نوع المكاتبة أولاً"); return; }
        setOpeningWord(true);
        try {
            let currentDocNo = docNo;
            let currentPath = savedPath;

            // إنشاء الملف أولاً لو لم يتم بعد
            if (!creationDone || !currentDocNo) {
                const res = await fetch("/api/memo/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        docType,
                        subject,
                        recipientEmpNums: [],
                        vacationEmpNo,
                        fromDate,
                        toDate
                    })
                });
                const json = await res.json();
                if (!json.success) { toast.error(json.error || "فشل إنشاء الملف"); return; }
                currentDocNo = json.docNo;
                currentPath = json.generatedPath;
                setSavedPath(currentPath);
                setDocNo(currentDocNo);
                setCreationDone(true);
            }

            // ── تحويل المسار لملف Word ──
            // المسار المحفوظ في الـ DB قد يكون بدون امتداد أو PDF
            // نبعت للـ API ويتولى هو تخمين الامتداد الصحيح (.docx/.docm/.doc)
            await openWordFileDirect(currentPath, currentDocNo);
            setIsWordOpened(true);
            toast.success(`✅ تم فتح الملف — عدّل وأغلق Word ثم اضغط اعتماد`);
        } catch (err) {
            toast.error("حدث خطأ أثناء فتح الملف");
        } finally {
            setOpeningWord(false);
        }
    };

    /* ── فتح ملف Word مباشرة (يتجاوز منطق PDF) ── */
    const openWordFileDirect = async (filePath, dNo) => {
        if (!filePath) { toast.error("مسار الملف غير متاح"); return; }

        // تنظيف المسار
        let rawPath = filePath.split('|').filter(p => !!p)[0];
        if (!rawPath) { toast.error("مسار الملف فارغ"); return; }
        let finalPath = rawPath.trim().replace(/\//g, "\\");
        if (finalPath.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/) || (finalPath.split('\\')[0].includes('-') && !finalPath.startsWith("\\"))) {
            finalPath = "\\\\" + finalPath;
        } else if (finalPath.startsWith("\\") && !finalPath.startsWith("\\\\")) {
            finalPath = "\\" + finalPath;
        }

        // إزالة امتداد PDF لو موجود وإضافة .docx مبدئياً ليقوم السيرفر بتخمين الصحيح
        const lowerPath = finalPath.toLowerCase();
        if (lowerPath.endsWith(".pdf")) {
            finalPath = finalPath.replace(/\.pdf$/i, ".docx");
        } else if (!lowerPath.endsWith(".docx") && !lowerPath.endsWith(".docm") && !lowerPath.endsWith(".doc")) {
            // بدون امتداد → نضيف .docx وسيقوم السيرفر بالتخمين الصحيح
            finalPath = finalPath + ".docx";
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
                    // الجهاز بعيد → استخدم البروتوكول المحلي
                    const link = document.createElement('a');
                    link.href = `aoi-open:${json.resolvedPath || finalPath}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
                // else: تم الفتح محلياً من السيرفر
            } else {
                toast.error("فشل فتح ملف Word: " + (json.error || "خطأ غير معروف"));
            }
        } catch (e) {
            toast.error("حدث خطأ أثناء الاتصال بالسيرفر لفتح الملف");
        }
    };

    /* ── APPROVE: يفتح الـ PDF فقط (بعد فتح الورد) ── */
    const handleApprove = async () => {
        if (!isWordOpened) {
            toast.error("برجاء فتح الملف في Word وتعديله أولاً قبل الاعتماد");
            return;
        }
        if (!creationDone || !docNo || !savedPath) {
            toast.error("حدث خطأ — برجاء فتح الملف في Word أولاً");
            return;
        }
        setIsApproving(true);
        try {
            // فتح الـ PDF في تاب جديد لوضع الإمضاء
            await openPdfForSigning(savedPath, docNo);
            setIsApproved(true);
            toast.success(`✅ تم اعتماد المذكرة رقم ${docNo} — يمكنك إرسالها أو تركها كمسودة`);
        } catch (err) {
            toast.error("حدث خطأ أثناء فتح الـ PDF");
        } finally {
            setIsApproving(false);
        }
    };

    /* ── فتح الـ PDF في تاب جديد للإمضاء ── */
    const openPdfForSigning = async (filePath, dNo) => {
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
        const hasExt = finalPath.split(/[\\\/]/).pop().includes(".");
        let pdfPath = finalPath;
        if (!lowerPath.endsWith(".pdf") && !hasExt) pdfPath += ".pdf";
        // لو مسار Word → نحوله لـ PDF path بتغيير الامتداد
        if (lowerPath.endsWith(".docx") || lowerPath.endsWith(".docm") || lowerPath.endsWith(".doc")) {
            pdfPath = finalPath.replace(/\.(docx|docm|doc)$/i, ".pdf");
        }
        window.open(`/pdf-viewer?file=${encodeURIComponent(pdfPath)}&docNo=${dNo || ''}`, '_blank');
    };

    /* ── SEND (Archive) ── */
    const handleSend = async () => {
        if (isArchivingRef.current) return;
        if (!subject.trim()) { toast.error("برجاء كتابة موضوع المذكرة"); return; }
        if (!docType) { toast.error("برجاء اختيار نوع المكاتبة"); return; }
        if (selectedEmps.length === 0) { toast.error("برجاء اختيار مستلم"); return; }
        const allHaveSituations = selectedEmps.every(e => e.customSituation);
        if (!allHaveSituations) { toast.error("برجاء اختيار 'المطلوب' لكل مستلم قبل الإرسال"); return; }

        isArchivingRef.current = true;
        setIsArchiving(true);
        try {
            // Step 1: create doc if not yet created
            let currentDocNo = docNo;
            let currentPath = savedPath;

            if (!creationDone || !currentDocNo) {
                const createRes = await fetch("/api/memo/create", {
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
                const createJson = await createRes.json();
                if (!createJson.success) {
                    toast.error(createJson.error || "فشل إنشاء المذكرة");
                    isArchivingRef.current = false;
                    return;
                }
                currentDocNo = createJson.docNo;
                currentPath = createJson.generatedPath;
                setSavedPath(currentPath);
                setDocNo(currentDocNo);
                setCreationDone(true);
            }

            // Step 2: upload attachments
            let attachmentPath = null;
            if (attachments && attachments.length > 0) {
                const formData = new FormData();
                formData.append("docNo", currentDocNo);
                attachments.forEach(item => {
                    formData.append("files", item.file);
                    formData.append("descriptions", item.desc || item.file.name);
                });
                const uploadRes = await fetch("/api/memo/upload", { method: "POST", body: formData });
                const uploadJson = await uploadRes.json();
                if (!uploadJson.success) throw new Error(uploadJson.error);
                attachmentPath = uploadJson.attachments;
            }

            // Step 3: archive/send
            const res = await fetch("/api/memo/archive", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    docNo: currentDocNo,
                    path: currentPath,
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
                        const pdfUrl = `/pdf-viewer?file=${encodeURIComponent(json.pdfPath)}&docNo=${currentDocNo}`;
                        window.open(pdfUrl, '_blank');
                    }
                }
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

    const anyLoading = loading || savingDraft || isArchiving || isApproving || openingWord;

        /* ─────────────── RENDER ─────────────── */
    /* ─────────────── RENDER ─────────────── */
    return (
        <div className="min-h-screen bg-slate-50 pb-10" dir="rtl">
            {/* Header */}
            <div className="bg-slate-900 pt-8 pb-16 text-white shrink-0">
                <div className="max-w-[98%] xl:max-w-7xl mx-auto px-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 group text-sm"
                    >
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        <span>العودة للخلف</span>
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
                            <StickyNote className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black">إنشاء مذكرة جديدة</h1>
                            <p className="text-slate-400 text-xs font-bold mt-1">أملأ البيانات في شاشة واحدة متكاملة</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="max-w-[98%] xl:max-w-7xl mx-auto px-4 -mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    
                    {/* ══ COLUMN 1 ══ */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                {/* ══ SECTION 1: SOURCE ══ */}
                <Card className="border-none shadow-xl rounded-[24px] overflow-hidden bg-white">
                    <CardContent className="p-6">
                        <SectionHeader icon={Layout} label="مصدر المذكرة" color="amber" />

                        <div className="grid grid-cols-2 gap-3">
                            {/* Template */}
                            <button
                                onClick={() => {
                                    setSourceMode("template");
                                    setSelectedDraft(null);
                                    setDocNo(null); setSavedPath(null); setCreationDone(false);
                                }}
                                className={`group relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer text-center
                                    ${sourceMode === "template"
                                        ? "border-amber-500 bg-amber-50 shadow-lg shadow-amber-100"
                                        : "border-slate-200 hover:border-amber-400 hover:bg-amber-50 hover:shadow-md"}`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow transition-all
                                    ${sourceMode === "template" ? "bg-amber-500" : "bg-amber-100 group-hover:bg-amber-500"}`}>
                                    <Layout className={`w-6 h-6 transition-colors ${sourceMode === "template" ? "text-white" : "text-amber-500 group-hover:text-white"}`} />
                                </div>
                                <div>
                                    <p className="font-black text-slate-800 text-sm">قالب جاهز</p>
                                    <p className="text-[11px] text-slate-400 font-bold mt-0.5">إنشاء من قالب محفوظ</p>
                                </div>
                                {sourceMode === "template" && (
                                    <div className="absolute top-3 left-3 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </button>

                            {/* Draft */}
                            <button
                                onClick={() => { setSourceMode("draft"); fetchDrafts(); }}
                                className={`group relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer text-center
                                    ${sourceMode === "draft"
                                        ? "border-purple-500 bg-purple-50 shadow-lg shadow-purple-100"
                                        : "border-slate-200 hover:border-purple-400 hover:bg-purple-50 hover:shadow-md"}`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow transition-all
                                    ${sourceMode === "draft" ? "bg-purple-500" : "bg-purple-100 group-hover:bg-purple-500"}`}>
                                    <FolderOpen className={`w-6 h-6 transition-colors ${sourceMode === "draft" ? "text-white" : "text-purple-500 group-hover:text-white"}`} />
                                </div>
                                <div>
                                    <p className="font-black text-slate-800 text-sm">من المسودة</p>
                                    <p className="text-[11px] text-slate-400 font-bold mt-0.5">استكمال مسودة محفوظة</p>
                                </div>
                                {sourceMode === "draft" && (
                                    <div className="absolute top-3 left-3 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </button>
                        </div>

                        {/* Drafts list */}
                        {sourceMode === "draft" && (
                            <div className="mt-4 space-y-2 animate-in fade-in duration-300">
                                <label className="text-xs font-black text-slate-500">اختر من المسودات المتاحة:</label>
                                {fetchingDrafts ? (
                                    <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-purple-500" /></div>
                                ) : drafts.length === 0 ? (
                                    <div className="py-8 text-center border rounded-2xl border-dashed text-slate-400 font-bold text-sm">لا توجد مسودات حالية</div>
                                ) : (
                                    <div className="max-h-52 overflow-y-auto space-y-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
                                        {drafts.map(draft => (
                                            <div
                                                key={draft.docNo}
                                                onClick={() => {
                                                    setSelectedDraft(draft);
                                                    setSubject(draft.subject || "");
                                                    setDocType(draft.docType?.toString() || "");
                                                    setDocNo(draft.docNo);
                                                    setSavedPath(draft.fileName);
                                                    setCreationDone(true);
                                                    // المسودة عندها ملف Word موجود بالفعل → فعّل زرار الاعتماد مباشرة
                                                    setIsWordOpened(true);
                                                    setIsApproved(false);
                                                }}
                                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all group
                                                    ${selectedDraft?.docNo === draft.docNo
                                                        ? "bg-purple-50 border-purple-300 shadow-sm"
                                                        : "bg-white border-slate-100 hover:border-purple-200 hover:shadow-sm"}`}
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs shrink-0
                                                        ${selectedDraft?.docNo === draft.docNo ? "bg-purple-500 text-white" : "bg-purple-100 text-purple-600"}`}>
                                                        {draft.docNo}
                                                    </div>
                                                    <div className="text-right flex-1 min-w-0">
                                                        <p className="text-sm font-black text-slate-800 truncate">{draft.subject}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">{draft.docTypeDesc} · {new Date(draft.date).toLocaleDateString("ar-EG")}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteDraft(draft.docNo); }}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="حذف المسودة"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    {selectedDraft?.docNo === draft.docNo
                                                        ? <Check className="w-4 h-4 text-purple-500" />
                                                        : <ChevronLeft className="w-4 h-4 text-slate-300" />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
                {/* ══ SECTION 2: DOC TYPE ══ */}
                <Card className="border-none shadow-xl rounded-[24px] overflow-hidden bg-white">
                    <CardContent className="p-6">
                        <SectionHeader icon={Type} label="نوع المكاتبة" color="amber" badge="مطلوب" />

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
                                    {fetchingKinds ? (
                                        <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-500" /></div>
                                    ) : docKinds.map(kind => {
                                        const isFav = kindFavorites.some(k => k.id === kind.id);
                                        return (
                                            <div key={kind.id} onClick={() => setDocType(kind.id.toString())}
                                                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white hover:shadow-md cursor-pointer transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-black text-xs shrink-0">
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
                                        <p className="font-black text-emerald-900">{docKinds.find(k => k.id.toString() === docType)?.label || docType}</p>
                                    </div>
                                </div>
                                <button onClick={() => setDocType("")} className="text-xs text-slate-400 hover:text-slate-600 font-black px-3 py-1.5 rounded-xl hover:bg-white transition">تغيير</button>
                            </div>
                        )}

                        {/* Vacation fields */}
                        {isVacation && (
                            <div className="grid grid-cols-3 gap-3 mt-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
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
                    </CardContent>
                </Card>
                    </div>

                    {/* ══ COLUMN 2 ══ */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                {/* ══ SECTION 3: SUBJECT ══ */}
                <Card className="border-none shadow-xl rounded-[24px] overflow-hidden bg-white flex flex-col flex-1">
                    <CardContent className="p-6 flex flex-col flex-1">
                        <SectionHeader icon={FileText} label="موضوع المذكرة" color="blue" badge="مطلوب" />
                        <textarea
                            placeholder="اكتب تفاصيل الموضوع هنا..."
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full flex-1 min-h-[120px] p-4 rounded-2xl border border-slate-200 bg-white font-bold text-right shadow-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 resize-none"
                        />
                    </CardContent>
                </Card>
                <Card className="border-none shadow-xl rounded-[24px] overflow-hidden bg-white">
                    <CardContent className="p-6">
                        <SectionHeader icon={Paperclip} label="مرفقات إضافية (اختياري)" color="blue" />

                        <label className="flex flex-col items-center gap-3 p-5 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group">
                            <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors">
                                <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
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
                            <div className="space-y-2 mt-3">
                                {attachments.map((item, idx) => {
                                    const isImg = item.file.type.startsWith('image/');
                                    return (
                                        <div key={`${item.file.name}-${idx}`}
                                            className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-200 transition-all">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                                {isImg
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
                    </CardContent>
                </Card>
                    </div>

                    {/* ══ COLUMN 3 ══ */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                <Card className="border-none shadow-xl rounded-[24px] overflow-hidden bg-white">
                    <CardContent className="p-6">
                        <SectionHeader icon={UserPlus} label="توجيه إلى" color="emerald" badge="مطلوب للإرسال" />

                        {/* Favorites */}
                        {favorites.length > 0 && (
                            <div className="flex flex-wrap gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-100 mb-3">
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
                        <div className="relative mb-3">
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
                            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-2 space-y-1 mb-3">
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
                    </CardContent>
                </Card>
                {isApproved && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-blue-600 rounded-[20px] p-5 text-white">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-base">تم الاعتماد — رقم المذكرة: {docNo}</p>
                                    <p className="text-blue-200 text-xs font-bold mt-1">تم فتح الـ PDF لإضافة الإمضاء</p>
                                </div>
                                <button
                                    onClick={() => openPdfForSigning(savedPath, docNo)}
                                    className="shrink-0 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors px-3 py-2 rounded-xl text-xs font-black"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    فتح PDF
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <Card className="border-none shadow-xl rounded-[24px] overflow-hidden bg-white">
                    <CardContent className="p-6">
                        <div className="space-y-3">

                            {/* 1) OPEN WORD */}
                            <Button
                                onClick={handleOpenWordForEdit}
                                disabled={anyLoading}
                                className={`w-full h-14 rounded-2xl text-white font-black text-base shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2
                                    ${isWordOpened
                                        ? "bg-slate-600 hover:bg-slate-700 shadow-slate-200"
                                        : "bg-amber-500 hover:bg-amber-600 shadow-amber-200"}`}
                            >
                                {openingWord
                                    ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري فتح الملف...</>
                                    : isWordOpened
                                        ? <><Check className="w-5 h-5" /> تم فتح Word — فتح مرة أخرى</>
                                        : <><FileEdit className="w-5 h-5" /> فتح الملف للتعديل</>}
                            </Button>

                            {/* 2) APPROVE — مشروط بفتح Word */}
                            <button
                                onClick={!isWordOpened ? () => toast.error("افتح الملف في Word وعدّله أولاً") : handleApprove}
                                disabled={anyLoading}
                                style={{ border: 0, outline: 0, width: "100%" }}
                                className={`h-12 rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2
                                    ${!isWordOpened
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                        : isApproved
                                            ? "bg-blue-400 hover:bg-blue-500 text-white shadow-blue-100 cursor-pointer"
                                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 cursor-pointer"}`}
                            >
                                {isApproving
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري فتح PDF...</>
                                    : !isWordOpened
                                        ? <span className="opacity-60">اعتماد + فتح PDF </span>
                                        : isApproved
                                            ? <><Check className="w-4 h-4" /> تم الاعتماد — فتح PDF مجدداً</>
                                            : <><ShieldCheck className="w-4 h-4" /> اعتماد + فتح PDF للتوقيع</>}
                            </button>

                            {/* 3) SEND + DRAFT */}
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    onClick={handleSend}
                                    disabled={anyLoading}
                                    className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isArchiving
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</>
                                        : <><Send className="w-4 h-4" /> إرسال المكاتبة</>}
                                </Button>
                                <Button
                                    onClick={handleSaveAsDraft}
                                    disabled={anyLoading}
                                    variant="outline"
                                    className="h-12 rounded-2xl border-purple-200 text-purple-700 hover:bg-purple-50 font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {savingDraft
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
                                        : <><FolderOpen className="w-4 h-4" /> حفظ كمسودة</>}
                                </Button>
                            </div>

                            {/* Flow progress */}
                            {/* <div className="flex items-center justify-center gap-2 pt-1">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-all ${isWordOpened ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>① فتح Word</span>
                                <ChevronLeft className="w-3 h-3 text-slate-300" />
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-all ${isApproved ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>② اعتماد + PDF</span>
                                <ChevronLeft className="w-3 h-3 text-slate-300" />
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">③ إرسال أو مسودة</span>
                            </div> */}
                        </div>
                    </CardContent>
                </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
