"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,

} from "@/components/ui/card";
import {
    Search,
    FileText,
    Calendar,
    ExternalLink,
    Filter,
    Loader2,
    AlertCircle,
    Clock,
    ArrowUpDown,
    FolderOpen,
    Send,
    Star,
    X,
    UserCheck,
    UserPlus,
    CheckCircle2,
    Users,
    Check,
    AlertTriangle,
    ChevronDown,
    Paperclip,
    Files,
    Lock,
    Unlock,
    Bell,
    MessageCircle,
    History,
    User,
    Globe,
    Monitor,
    ChevronLeft,
    Download

} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";




// قائمة المستخدمين الذين تظهر لهم "النافذة الخاصة" (التحويل الإداري بالأزرق)
const SPECIAL_TRANSFER_USERS = ["1714", "1712", "1716"];
// قائمة المستخدمين المصرح لهم بـ "إغلاق وحماية الملفات" (زر القفل)
const AUTHORIZED_LOCKERS = ["938", "181", "1714"];
// قائمة الموظفين الذين يظهرون في المقترحات السريعة داخل النافذة الخاصة
const getSpecialEmpCodes = (userEmpNum) => {
    const codes = {
        "1714": ["1712", "1716", "1713", "1761", "183", "1757", "1711", "888", "153", "1734", "1728", "1773", "181", "966", "1503", "987", "260"],
        "1712": ["1714", "1716", "1713", "1761", "183", "1757", "1711", "888", "153", "1734", "1728", "1773", "181", "966", "1503", "987", "260"],
        "1716": ["1714", "1712", "1713", "1761", "183", "1757", "1711", "888", "153", "1734", "1728", "1773", "181", "966", "1503", "987", "260"],
        // ممكن تضيف المزيد هنا
    };
    return codes[userEmpNum] || [];
};

// يرجّع موظفي النافذة الخاصة مرتّبين حسب ترتيب الأكواد في getSpecialEmpCodes
const getOrderedSpecialEmps = (employees = [], userEmpNum) => {
    const orderedCodes = getSpecialEmpCodes(userEmpNum).map(String);
    const orderIndex = new Map(orderedCodes.map((code, idx) => [code, idx]));

    return employees
        .filter(emp => orderIndex.has(String(emp?.EMP_NUM)))
        .slice() // avoid mutating original array during sort
        .sort((a, b) => (orderIndex.get(String(a?.EMP_NUM)) ?? 1e9) - (orderIndex.get(String(b?.EMP_NUM)) ?? 1e9));
};

// مسميات مختصرة خاصة لموظفي النافذة الخاصة (special emp codes)
// عدّل القيم هنا فقط للأكواد التي تريد تغيير اسم إدارتها
const SPECIAL_EMP_SHORT_LABELS = {
    "1714": "ر.م.أ",
    "1712": "نائب ر.م.أ",
    "1713": "مستشار ر.م.ا للكاميرات",
    "1716": "مستشار ر.م.ا للتعاقدات",
    "1761": "البحوث والمشروعات",
    "183": "الانتاج",
    "1757": "الجودة",
    "1711": "المالى",
    "888": "التجاري",
    "153": "التسويق",
    "1734": "الأمن",
    "1773": "الموارد البشرية",
    "1728": "الشئون الادارية",
    "181": "نظم المعلومات",
    "966": "القانونية",
    "1503": "العلاقات العامة",
    "987": "المكتب الفنى",
    "260": "سكرتارية",
};

// المستخدمين الممنوعين من رؤية الملفات في مكاتبات الخارجى
const RESTRICTED_VIEW_USERS = ["1714", "1716", "1712"];
// الحالات المطلوبة
const SITUATION_OPTIONS = [
    { id: 7, label: "أتخاذ اللازم" },
    { id: 5, label: "للإحاطة" },
    { id: 6, label: "للعرض" },
    { id: 4, label: "إبداء الرأي" },
    { id: 1, label: "مطلوب الرد" },
    { id: 2, label: "مطلوب توقيع ر.م.ا" },
    { id: 3, label: "مطلوب تصديق ر.م.ا" },
    { id: 8, label: "للاعتماد" },
];
const SITUATION_OPTIONS2 = [
    { id: 7, label: "أتخاذ اللازم" },
    { id: 5, label: "للإحاطة" },
    { id: 6, label: "للعرض" },
    { id: 4, label: "إبداء الرأي" }
];


export default function ImportPage() {
    const router = useRouter();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [user, setUser] = useState(null);

    // الفلاتر
    const today = new Date().toISOString().split('T')[0];
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);
    const [searchQuery, setSearchQuery] = useState("");
    const [incoming, setIncoming] = useState(false);
    const [internal, setInternal] = useState(false);
    const [answered, setAnswered] = useState(false);
    const [pending, setPending] = useState(false);
    const [allPending, setAllPending] = useState(false);

    // حالات شاشة التحويل
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);

    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [favorites, setFavorites] = useState([]);
    const [isTransferring, setIsTransferring] = useState(false);
    const [isFiltersLoaded, setIsFiltersLoaded] = useState(false);

    // إضافات التحويل الجديدة
    const [situations, setSituations] = useState([]);
    const [selectedSituation, setSelectedSituation] = useState("");
    const [editableSubject, setEditableSubject] = useState("");
    const [selectedEmps, setSelectedEmps] = useState([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [attachmentSelection, setAttachmentSelection] = useState(null);

    // حالات المرفقات في التحويل (للمستخدم 1714)
    const [transferAttachments, setTransferAttachments] = useState([]);

    // حالات شاشة الرد (Reply Mode)
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
    const [replyDocType, setReplyDocType] = useState("");
    const [replySubject, setReplySubject] = useState("");
    const [docKinds, setDocKinds] = useState([]);
    const [kindSearchTerm, setKindSearchTerm] = useState("");
    const [isCreatingReply, setIsCreatingReply] = useState(false);
    const [replySavedPath, setReplySavedPath] = useState(null);
    const [replyDocNo, setReplyDocNo] = useState(null);
    const [replyExistingAttachments, setReplyExistingAttachments] = useState([]); // مسارات الملفات الأصلية
    const [replyNewAttachments, setReplyNewAttachments] = useState([]); // ملفات جديدة سيتم رفعها
    const [isArchivingReply, setIsArchivingReply] = useState(false);

    // حالات التنبيه السريع
    const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
    const [notifMessage, setNotifMessage] = useState("");
    const [isSendingNotif, setIsSendingNotif] = useState(false);
    const [notifRecipients, setNotifRecipients] = useState([]);
    const [notifEmpSearch, setNotifEmpSearch] = useState("");

    // جلب بيانات المستخدم وتجهيز المفضلات الخاصة به
    useEffect(() => {
        const fetchUserAndFavs = async () => {
            try {
                const res = await fetch("/api/auth/me");
                const json = await res.json();
                if (json.success) {
                    setUser(json.user);

                    // بعد جلب المستخدم، نحمل المفضلات الخاصة به فقط
                    const savedFavorites = localStorage.getItem(`fav_employees_${json.user.empNum}`);
                    if (savedFavorites) {
                        setFavorites(JSON.parse(savedFavorites));
                    } else {
                        setFavorites([]); // صفر المفضلات لو مستخدم جديد
                    }

                    // استعادة حالة الفلاتر بعد تحميل المستخدم
                    const loadedFilters = loadFilterState();
                    setIsFiltersLoaded(true);

                    // ✅ إذا كان هناك بحث قادم من الرابط، استدعِ البيانات فوراً
                    if (loadedFilters && loadedFilters.searchQuery) {
                        fetchData(loadedFilters);
                    }
                }
            } catch (err) {
                console.error("Error fetching user session:", err);
                const loadedFilters = loadFilterState();
                setIsFiltersLoaded(true);
                if (loadedFilters && loadedFilters.searchQuery) {
                    fetchData(loadedFilters);
                }
            }
        };

        fetchUserAndFavs();
        fetchEmployees(); // جلب الموظفين عند تحميل الصفحة لضمان عمل التنبيهات السريعة
    }, []);

    // حفظ الفلاتر تلقائياً عند تغيير أي منها (فقط بعد التحميل الأول)
    useEffect(() => {
        if (isFiltersLoaded) {
            saveFilterState();
        }
    }, [fromDate, toDate, searchQuery, incoming, internal, answered, pending, allPending, isFiltersLoaded]);


    // دالة لحفظ حالة الفلاتر
    const saveFilterState = () => {
        const filterState = {
            fromDate,
            toDate,
            searchQuery,
            incoming,
            internal,
            answered,
            pending,
            allPending
        };
        localStorage.setItem('importPageFilters', JSON.stringify(filterState));
    };

    // دالة لاستعادة حالة الفلاتر
    const loadFilterState = () => {
        // 1. التحقق أولاً من وجود بحث في الرابط (Query Param)
        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const urlSearch = urlParams.get("search");
            const urlDate = urlParams.get("date");

            if (urlSearch) {
                setSearchQuery(urlSearch);

                // إذا كان في تاريخ مرسل، استخدمه كفلتر بداية ونهاية
                if (urlDate) {
                    setFromDate(urlDate);
                    setToDate(urlDate);
                } else {
                    setFromDate(""); // تصفير التاريخ لضمان العثور على المكاتبة مهما كان تاريخها
                    setToDate("");
                }

                setIncoming(false);
                setInternal(false);
                setAnswered(false);
                setPending(false);
                setAllPending(false);
                return {
                    searchQuery: urlSearch,
                    fromDate: urlDate || "",
                    toDate: urlDate || "",
                    incoming: false,
                    internal: false,
                    answered: false,
                    pending: false,
                    allPending: false
                };
            }
        }

        const savedFilters = localStorage.getItem('importPageFilters');
        if (savedFilters) {
            try {
                const parsed = JSON.parse(savedFilters);
                setFromDate(parsed.fromDate || today);
                setToDate(parsed.toDate || today);
                setSearchQuery(parsed.searchQuery || "");
                setIncoming(parsed.incoming || false);
                setInternal(parsed.internal || false);
                setAnswered(parsed.answered || false);
                setPending(parsed.pending || false);
                setAllPending(parsed.allPending || false);

                // إرجاع الفلاتر المحملة لاستخدامها في fetchData
                return parsed;
            } catch (error) {
                console.error("Error loading filters:", error);
            }
        }
        return null;
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
        localStorage.setItem(`fav_employees_${user.empNum}`, JSON.stringify(newFavs));
    };

    const fetchEmployees = async () => {
        if (employees.length > 0) return;
        setLoadingEmployees(true);
        try {
            const res = await fetch("/api/import/transfer/employees");
            const json = await res.json();
            if (json.success) {
                // تصفية النتائج لضمان عدم وجود تكرار في EMP_NUM
                const uniqueEmps = json.data.filter((v, i, a) => a.findIndex(t => t.EMP_NUM === v.EMP_NUM) === i);
                setEmployees(uniqueEmps);
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
        } finally {
            setLoadingEmployees(false);
        }
    };
    const downloadFile = async (filePath, fileName) => {
        try {
            const response = await fetch("/api/memo/download", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: filePath })
            });

            if (!response.ok) {
                // قراءة النص فقط (يمكن أن يكون JSON أو نص عادي)
                const errorText = await response.text();
                let errorMsg = "فشل التحميل";
                try {
                    // حاول تحويل النص إلى JSON إذا كان بصيغة JSON
                    const errorJson = JSON.parse(errorText);
                    errorMsg = errorJson.error || errorMsg;
                } catch {
                    // إذا لم يكن JSON، استخدم النص كما هو
                    errorMsg = errorText || errorMsg;
                }
                throw new Error(errorMsg);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName || filePath.split('\\').pop().split('/').pop() || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download error:", error);
            toast.error(error.message || "حدث خطأ أثناء تحميل الملف");
        }
    };
    const fetchSituations = async () => {
        if (situations.length > 0) return;
        try {
            const res = await fetch("/api/import/transfer/situations");
            const json = await res.json();
            if (json.success) {
                setSituations(json.data);
                if (json.data.length > 0) setSelectedSituation(json.data[0].SITUATION_C.toString());
            }
        } catch (error) {
            console.error("Error fetching situations:", error);
        }
    };

    const fetchDocKinds = async (query = "") => {
        try {
            const res = await fetch(`/api/memo/kinds?q=${encodeURIComponent(query)}`);
            const json = await res.json();
            if (json.success) setDocKinds(json.data);
        } catch (error) {
            console.error("Error fetching kinds:", error);
        }
    };

    const handleOpenReply = (item) => {
        setSelectedDoc(item);
        setReplySubject(`رد على: ${item.SUBJECT}`);
        setReplyDocType("");
        // تجهيز المرفقات الأصلية والمستند الأساسي ليكونوا مرفقات تلقائية في الرد
        let initialAtts = [];
        if (item.FILE_NAME) initialAtts.push(item.FILE_NAME);

        // استخدام قائمة المرفقات الجديدة (ATTACHMENTS_LIST) إذا كانت موجودة
        if (item.ATTACHMENTS_LIST && item.ATTACHMENTS_LIST.length > 0) {
            const listPaths = item.ATTACHMENTS_LIST.map(a => a.FILE_PATH).filter(p => !!p);
            initialAtts = [...initialAtts, ...listPaths];
        } else if (item.FILE_ATTACH) {
            // كخطة بديلة للمكاتبات القديمة أو إذا لم تكن القائمة موجودة
            const existing = item.FILE_ATTACH.split('|').filter(a => !!a);
            initialAtts = [...initialAtts, ...existing];
        }

        // إزالة التكرار لضمان عدم إرسال نفس الملف مرتين
        setReplyExistingAttachments(Array.from(new Set(initialAtts)));
        setReplyNewAttachments([]);

        // تعيين المستلم الافتراضي (الجهة التي أرسلت المكاتبة)
        const senderEmp = employees.find(e => e.EMP_NUM.toString() === item.PLACE_C?.toString());
        if (senderEmp) {
            setSelectedEmps([{
                ...senderEmp,
                customSituation: "7" // اتخاذ اللازم
            }]);
        } else {
            setSelectedEmps([]);
        }

        setIsReplyModalOpen(true);
        fetchEmployees();
        fetchSituations();
        fetchDocKinds();
    };

    const handleOpenTransfer = (item) => {
        setSelectedDoc(item);
        setEditableSubject(item.SUBJECT);
        setSelectedEmps([]);
        setTransferAttachments([]); // إعادة تعيين المرفقات
        setIsTransferModalOpen(true);
        fetchEmployees();
        fetchSituations();
    };

    const toggleEmpSelection = (emp) => {
        if (selectedEmps.some(e => e.EMP_NUM === emp.EMP_NUM)) {
            setSelectedEmps(selectedEmps.filter(e => e.EMP_NUM !== emp.EMP_NUM));
        } else {
            // إضافة الموظف مع القيم الافتراضية للموضوع والحالة
            setSelectedEmps([...selectedEmps, {
                ...emp,
                customSubject: editableSubject,
                customSituation: selectedSituation
            }]);
        }
    };

    // تحديث البيانات الخاصة لموظف معين
    const updateEmpCustomData = (empNum, field, value) => {
        setSelectedEmps(selectedEmps.map(e =>
            e.EMP_NUM === empNum ? { ...e, [field]: value } : e
        ));
    };

    const executeTransfer = async () => {
        if (!selectedDoc || selectedEmps.length === 0) return;
        setIsTransferring(true);

        try {
            let attachmentsData = [];

            // 1. رفع المرفقات الجديدة إذا وجدت
            if (transferAttachments && transferAttachments.length > 0) {
                const formData = new FormData();
                formData.append("docNo", selectedDoc.DOC_NO);

                transferAttachments.forEach(att => {
                    formData.append("files", att.file);
                    formData.append("descriptions", att.desc || att.file.name);
                });

                const uploadRes = await fetch("/api/memo/upload", {
                    method: "POST",
                    body: formData
                });

                const uploadJson = await uploadRes.json();

                if (uploadJson.success) {
                    // تحويل المرفقات المرفوعة إلى التنسيق المطلوب للتحويل
                    attachmentsData = uploadJson.attachments.map(att => ({
                        path: att.path,
                        desc: att.desc
                    }));
                } else {
                    throw new Error(uploadJson.error || "فشل رفع المرفقات");
                }
            }

            // 2. تنفيذ التحويل مع المرفقات
            const res = await fetch("/api/import/transfer/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    docNo: selectedDoc.DOC_NO,
                    attachments: attachmentsData,
                    recipients: selectedEmps.map(e => ({
                        empNum: e.EMP_NUM,
                        situationId: e.customSituation || selectedSituation,
                        subject: e.customSubject || editableSubject
                    }))
                }),
            });

            const json = await res.json();

            if (json.success) {
                toast.success(`تم تحويل المكاتبة إلى ${selectedEmps.length} موظف بنجاح`);
                if (json.skippedCount > 0) {
                    const names = json.skippedEmployees.map(e => e.empName).join('، ');
                    // toast.info(`تم تخطي ${json.skippedCount} موظف موجودين مسبقاً في الشجرة: ${names}`, { duration: 7000 });
                }
                setIsTransferring(false);
                setIsTransferModalOpen(false);
                setTransferAttachments([]);
                setIsConfirmOpen(false);
                fetchData();
            } else {
                // ✅ عرض رسالة الخطأ مع الموظفين الممنوعين
                if (json.blockedEmployees && json.blockedEmployees.length > 0) {
                    const blockedNames = json.blockedEmployees.map(e => e.empName).join('، ');
                    toast.error(
                        <div className="space-y-2">
                            <p className="font-bold">{json.error}</p>
                            <p className="text-sm text-red-600">الموظفين: {blockedNames}</p>
                        </div>
                    );
                } else {
                    toast.error(json.error || "فشل التحويل");
                }
            }
        } catch (err) {
            console.error("Transfer Error:", err);
            toast.error(err.message || "حدث خطأ أثناء الاتصال بالسيرفر");
        } finally {
            setIsTransferring(false);
        }
    };
    const handleCreateReply = async () => {
        if (!replyDocType || !selectedDoc || selectedEmps.length === 0) {
            toast.error("برجاء اختيار النوع والمستلمين");
            return;
        }

        setIsCreatingReply(true);
        try {
            const res = await fetch("/api/memo/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    docType: replyDocType,
                    subject: replySubject,
                    recipientEmpNums: selectedEmps.map(e => e.EMP_NUM),
                    parentDocNo: selectedDoc.DOC_NO,
                    transType: 3 // رد
                })
            });

            const json = await res.json();
            if (json.success) {
                setReplyDocNo(json.docNo);
                setReplySavedPath(json.filePath);
                toast.success("تم إنشاء مسودة الرد، جاري فتح الوورد للتعديل...");

                // استخدام الدالة الموحدة لفتح الملف لضمان معالجة المسار
                openFile(json.filePath, null);
            } else {
                toast.error(json.error || "فشل إنشاء مسودة الرد");
            }
        } catch (error) {
            toast.error("خطأ في الاتصال بالسيرفر");
        } finally {
            setIsCreatingReply(false);
        }
    };

    const executeReplyArchive = async () => {
        if (!replyDocNo || !replySavedPath) return;

        setIsArchivingReply(true);
        try {
            let finalUploadedAttachments = [];

            // 1. رفع المرفقات الجديدة أولاً (كما في صفحة إنشاء مكاتبة)
            if (replyNewAttachments.length > 0) {
                const formData = new FormData();
                formData.append("docNo", replyDocNo);
                replyNewAttachments.forEach(file => formData.append("files", file));

                const uploadRes = await fetch("/api/memo/upload", {
                    method: "POST",
                    body: formData
                });
                const uploadJson = await uploadRes.json();
                if (uploadJson.success) {
                    finalUploadedAttachments = uploadJson.attachments || [];
                } else {
                    throw new Error(uploadJson.error || "فشل رفع المرفقات الجديدة");
                }
            }

            // 2. دمج المرفقات الأصلية مع الجديدة في مصفوفة كائنات
            const attachmentsArr = replyExistingAttachments.map(p => ({
                path: p,
                desc: p.split(/[\\\/]/).pop()
            }));

            if (finalUploadedAttachments.length > 0) {
                attachmentsArr.push(...finalUploadedAttachments);
            }

            // 3. الأرشفة والتحويل النهائي
            const res = await fetch("/api/memo/archive", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    docNo: replyDocNo,
                    path: replySavedPath,
                    attachments: attachmentsArr,
                    recipients: selectedEmps.map(e => ({
                        empNum: e.EMP_NUM,
                        situationId: e.customSituation || "7"
                    }))
                })
            });

            const json = await res.json();
            if (json.success) {
                toast.success("تم إرسال الرد بنجاح");
                setIsReplyModalOpen(false);
                fetchData();

                // فتح الـ PDF النهائي فوراً للمعينة (الذي أعاده السيرفر)
                openFile(json.pdfPath, replyDocNo);
            } else {
                toast.error(json.error || "فشل أرشفة الرد");
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || "حدث خطأ أثناء الاتصال بالسيرفر");
        } finally {
            setIsArchivingReply(false);
        }
    };

    const fetchData = async (options = {}) => {
        setLoading(true);
        setError("");

        try {
            let params = new URLSearchParams();

            // استخدام القيم من options لو موجودة، وإلا نستخدم الـ state
            const searchVal = options.search !== undefined ? options.search : searchQuery;
            const isAllPending = options.allPending !== undefined ? options.allPending : allPending;
            const isIncoming = options.incoming !== undefined ? options.incoming : incoming;
            const isInternal = options.internal !== undefined ? options.internal : internal;
            const isAnswered = options.answered !== undefined ? options.answered : answered;
            const isPending = options.pending !== undefined ? options.pending : pending;
            const fromD = options.fromDate !== undefined ? options.fromDate : fromDate;
            const toD = options.toDate !== undefined ? options.toDate : toDate;

            //  لو عرض كل الجاري الرد عليها
            if (isAllPending) {
                params.append("allPending", "true");
            }

            // نوع المكاتبة (يعمل في الحالتين)
            if (isIncoming) params.append("docCategory", "incoming");
            if (isInternal) params.append("docCategory", "internal");

            if (!isAllPending) {
                // التاريخ
                if (fromD && toD) {
                    params.append("fromDate", fromD);
                    params.append("toDate", toD);
                }

                // الحالة
                if (isAnswered) params.append("status", "answered");
                if (isPending) params.append("status", "pending");
            }

            // البحث
            if (searchVal) {
                params.append("search", searchVal);
            }

            const res = await fetch(`/api/import?${params.toString()}`);

            if (!res.ok) {
                const text = await res.text();
                console.error("Fetch data error response:", text);
                throw new Error("فشل في جلب البيانات من السيرفر");
            }

            const json = await res.json();

            if (json.success) {
                setData(json.data);
            } else {
                setError(json.error || "حدث خطأ أثناء جلب البيانات");
            }

        } catch (err) {
            console.error("Fetch data error:", err);
            setError("فشل الاتصال بالسيرفر أو استجابة غير صالحة");
        } finally {
            setLoading(false);
        }
    };
    const resetFilters = () => {
        const defaultFilters = {
            fromDate: today,
            toDate: today,
            searchQuery: "",
            incoming: false,
            internal: false,
            answered: false,
            pending: false,
            allPending: false
        };

        setFromDate(today);
        setToDate(today);
        setSearchQuery("");
        setIncoming(false);
        setInternal(false);
        setAnswered(false);
        setPending(false);
        setAllPending(false);

        // حذف الفلاتر المحفوظة
        localStorage.removeItem('importPageFilters');

        // جلب البيانات بدون فلاتر
        fetchData(defaultFilters);
    };
    const handleSenderClick = (name) => {
        setSearchQuery(name);

        // جلب البيانات بالاسم الجديد مع الحفاظ على التواريخ والفلاتر الحالية
        fetchData({
            search: name
        });
    };

    useEffect(() => {
        if (isFiltersLoaded) {
            fetchData();
        }
    }, [incoming, internal, answered, pending, allPending, isFiltersLoaded]);

    let filterText = "";

    if (incoming && answered) {
        filterText = "عرض المكاتبات الواردة التي تم الرد عليها";
    } else if (incoming && pending) {
        filterText = "عرض المكاتبات الواردة التى لم يتم الرد عليها";
    } else if (incoming) {
        filterText = "عرض جميع المكاتبات الواردة";
    } else if (internal && answered) {
        filterText = "عرض المكاتبات الداخلية التي تم الرد عليها";
    } else if (internal && pending) {
        filterText = "عرض المكاتبات الداخلية التى لم يتم الرد عليها";
    } else if (internal) {
        filterText = "عرض المكاتبات الداخلية";
    } else if (answered) {
        filterText = "عرض المكاتبات التي تم الرد عليها";
    } else if (allPending && incoming) {
        filterText = "عرض المكاتبات الخارجية الجاري الرد عليها";
    } else if (allPending && internal) {
        filterText = "عرض المكاتبات الداخلية الجاري الرد عليها";
    } else if (allPending) {
        filterText = "عرض المكاتبات الجاري الرد عليها";
    } else {
        filterText = "عرض جميع المكاتبات";
    }

    const handleSearch = (e) => {
        e.preventDefault();
        fetchData();
    };

    const openFile = async (fileName, docNo) => {
        if (!fileName) {
            toast.error("لا يوجد مسار ملف لهذه المكاتبة");
            return;
        }

        // إذا كان هناك رقم مكاتبة، نقوم بتحديث حالة القراءة في الخلفية
        if (docNo) {
            fetch("/api/import/markSeen", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ docNo }),
            }).catch(err => console.error("Error marking as seen:", err));

            // تحديث الحالة محلياً ليختفي تنبيه "جديد" فوراً
            setData(prev => prev.map(item =>
                item.DOC_NO === docNo ? { ...item, SEEN_FLAG: 1 } : item
            ));
        }

        // نأخذ أول ملف فقط للعرض السريع
        let rawPath = fileName.split('|').filter(p => !!p)[0];
        if (!rawPath) return;

        // تنظيف ومسح المسار
        let finalPath = rawPath.trim().replace(/\//g, "\\");

        // إذا كان المسار يبدأ بـ IP أو اسم سيرفر بدون \\، نقوم بإضافتها
        if (finalPath.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/) || (finalPath.split('\\')[0].includes('-') && !finalPath.startsWith("\\"))) {
            finalPath = "\\\\" + finalPath;
        } else if (finalPath.startsWith("\\") && !finalPath.startsWith("\\\\")) {
            finalPath = "\\" + finalPath;
        }

        const lowerPath = finalPath.toLowerCase();
        const fileNamePart = finalPath.split(/[\\\/]/).pop();
        const hasAnyExtension = fileNamePart.includes(".");

        const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp"];
        const isImage = imageExtensions.some(ext => lowerPath.endsWith(ext));
        const isPdf = lowerPath.endsWith(".pdf");

        // 1. إذا كان الملف PDF أو صورة أو ليس له امتداد (مكاتبة قديمة)، نفتح في العارض الذكي
        if (isPdf || isImage || !hasAnyExtension) {
            let viewerPath = finalPath;
            if (!hasAnyExtension && !isPdf) {
                viewerPath += ".pdf";
            }
            const viewerUrl = `/pdf-viewer?file=${encodeURIComponent(viewerPath)}&docNo=${docNo || ''}`;
            window.open(viewerUrl, '_blank');
            return;
        }

        // 2. للملفات الأخرى (وورد، إكسيل، إلخ)، نستخدم نظام الفتح المحلي للملفات
        toast.info("جاري محاولة فتح الملف بالأداة المناسبة...");
        try {
            const res = await fetch("/api/memo/open-local", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: finalPath })
            });
            const json = await res.json();

            if (json.success) {
                if (json.isRemote) {
                    window.location.href = `aoi-open:${finalPath}`;
                } else {
                    toast.success("تم فتح الملف بنجاح");
                }
            } else {
                window.location.href = `aoi-open:${finalPath}`;
            }
        } catch (e) {
            window.location.href = `aoi-open:${finalPath}`;
        }
    };

    const handleLock = async (docNo) => {
        if (!confirm("هل أنت متأكد من إغلاق هذه المكاتبة؟ لن يتمكن أحد من تعديل الملفات المرتبطة بها بعد الآن.")) return;

        try {
            const res = await fetch("/api/memo/lock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ docNo }),
            });

            // تحقق من أن الاستجابة ناجحة قبل محاولة تحويلها لـ JSON
            if (!res.ok) {
                const text = await res.text();
                console.error("Server error response:", text);
                throw new Error(text || "فشل الاتصال بالسيرفر");
            }

            const json = await res.json();
            if (json.success) {
                toast.success("تم إغلاق المكاتبة وحمايتها بنجاح");
                fetchData();
            } else {
                toast.error(json.error || "فشل إغلاق المكاتبة");
            }
        } catch (err) {
            console.error("Lock error:", err);
            toast.error(err.message || "حدث خطأ أثناء الاتصال بالسيرفر");
        }
    };
    const [showSendersDetail, setShowSendersDetail] = useState(false);

    const sendersStats = data.reduce((acc, item) => {
        const sender = item.PLACE_NAME || "جهة غير معروفة";
        const sector = item.PLACE_SEC || "بدون قطاع";

        if (!acc[sender]) {
            acc[sender] = { count: 1, sector: sector };
        } else {
            acc[sender].count++;
        }

        return acc;
    }, {});
    const sendersCount = Object.keys(sendersStats).length;


    return (
        <div className="min-h-screen bg-slate-50/50 pb-12 rtl">
            {/* Elegant Header */}
            <div className="bg-white border-b shadow-sm sticky top-[65px] z-30">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex flex-col gap-6">

                        {/* Title Section */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                                    <FileText className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-slate-900 leading-tight"> الوارد</h1>
                                    <p className="text-slate-400 text-sm font-medium">{filterText || "استعرض وابحث في مكاتباتك"}</p>
                                </div>
                            </div>

                            {/* All Pending Highlight Toggle */}
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => {
                                        const newState = !(allPending && internal);
                                        setAllPending(newState);
                                        setInternal(newState);
                                        setIncoming(false);
                                        if (newState) {
                                            setAnswered(false); setPending(false);
                                        }
                                    }}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-300 border-2 ${allPending && internal
                                        ? "bg-green-600 border-green-600 text-white shadow-xl shadow-green-200 scale-105"
                                        : "bg-white border-slate-100 text-slate-600 hover:border-green-200 hover:bg-slate-50"
                                        }`}
                                >
                                    <Clock className={`w-4 h-4 ${allPending && internal ? "animate-pulse" : ""}`} />
                                    <span className="font-bold whitespace-nowrap text-sm">داخلي لم يتم الرد عليها</span>
                                </button>

                                <button
                                    onClick={() => {
                                        const newState = !(allPending && incoming);
                                        setAllPending(newState);
                                        setIncoming(newState);
                                        setInternal(false);
                                        if (newState) {
                                            setAnswered(false); setPending(false);
                                        }
                                    }}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-300 border-2 ${allPending && incoming
                                        ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200 scale-105"
                                        : "bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:bg-slate-50"
                                        }`}
                                >
                                    <Clock className={`w-4 h-4 ${allPending && incoming ? "animate-pulse" : ""}`} />
                                    <span className="font-bold whitespace-nowrap text-sm">خارجي لم يتم الرد عليها</span>
                                </button>
                            </div>
                        </div>

                        {/* Filter Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">

                            {/* Category & Status Groups */}
                            <div className="lg:col-span-4 flex flex-wrap gap-4">
                                {/* Category Group - Light Blue Background */}
                                <div className="flex flex-col gap-1.5 flex-1 bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50 shadow-sm transition-all hover:shadow-md">
                                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mr-1">نوع المكاتبة</label>
                                    <div className="flex p-1 bg-blue-200/30 rounded-xl gap-1">
                                        <button
                                            onClick={() => { setIncoming(!incoming); setInternal(false); setAllPending(false); }}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${incoming ? "bg-blue-600 text-white shadow-sm scale-[1.02]" : "text-blue-400 hover:text-blue-600"}`}
                                        >خارجي</button>
                                        <button
                                            onClick={() => { setInternal(!internal); setIncoming(false); setAllPending(false); }}
                                            className={`flex-1 py-1 px-3 rounded-lg text-sm font-bold transition-all ${internal ? "bg-green-600 text-white shadow-sm scale-[1.02]" : "text-blue-400 hover:text-blue-600"}`}
                                        >داخلي</button>
                                    </div>
                                </div>

                                {/* Status Group - Light Indigo Background */}
                                <div className="flex flex-col gap-1.5 flex-1 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50 shadow-sm transition-all hover:shadow-md">
                                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mr-1">حالة الرد</label>
                                    <div className="flex p-1 bg-indigo-200/30 rounded-xl gap-1">
                                        <button
                                            onClick={() => { setPending(!pending); setAnswered(false); setAllPending(false); }}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${pending ? "bg-red-600 text-black shadow-sm scale-[1.02]" : "text-indigo-400 hover:text-indigo-600"}`}
                                        >لم يتم الرد</button>
                                        <button
                                            onClick={() => { setAnswered(!answered); setPending(false); setAllPending(false); }}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${answered ? "bg-green-600 text-black shadow-sm scale-[1.02]" : "text-indigo-400 hover:text-indigo-600"}`}
                                        >تم</button>
                                    </div>
                                </div>
                            </div>

                            {/* Search & Date Controls - Light Slate Background */}
                            <div className="lg:col-span-8 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                <form onSubmit={handleSearch} className="flex flex-wrap md:flex-nowrap gap-3 items-end">
                                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">من تاريخ</label>
                                        <div className="relative">
                                            <Input
                                                type="date"
                                                value={fromDate}
                                                onChange={(e) => setFromDate(e.target.value)}
                                                disabled={allPending}
                                                className="h-11 pr-5 bg-white border-slate-200 focus:ring-2 focus:ring-blue-100 transition-all rounded-xl disabled:opacity-50 text-sm font-bold shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">إلى تاريخ</label>
                                        <div className="relative">
                                            {/* <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> */}
                                            <Input
                                                type="date"
                                                value={toDate}
                                                onChange={(e) => setToDate(e.target.value)}
                                                disabled={allPending}
                                                className="h-11 pr-5 bg-white border-slate-200 focus:ring-2 focus:ring-blue-100 transition-all rounded-xl disabled:opacity-50 text-sm font-bold shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">بحث نصي</label>
                                        <div className="relative">
                                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                placeholder="رقم المكاتبة أو الموضوع..."
                                                className="h-11 pr-10 bg-white border-slate-200 focus:ring-2 focus:ring-blue-100 transition-all rounded-xl text-sm font-bold shadow-sm placeholder:font-medium"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        <span className="font-bold">تطبيق</span>
                                    </Button>
                                    <Button
                                        onClick={resetFilters}
                                        variant="outline"
                                        className="h-11 px-6 border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl transition-all duration-300 group"
                                    >
                                        <X className="w-4 h-4 ml-2 group-hover:rotate-90 transition-transform duration-300" />
                                        <span className="font-medium">إعادة تعيين</span>
                                    </Button>
                                </form>
                            </div>

                        </div>
                    </div>
                </div>
            </div>


            <div className="max-w-7xl mx-auto px-6 mt-8">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <TooltipProvider delayDuration={0}>
                    <Card className="border-none shadow-2xl overflow-hidden bg-white/80 backdrop-blur-md rounded-3xl border border-white/20">

                        <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 py-6 px-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                                        <FolderOpen className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-bold text-white">نتائج المكاتبات</CardTitle>
                                        <p className="text-slate-400 text-sm mt-0.5">تم العثور على {data.length} مكاتبة</p>
                                    </div>
                                </div>

                                {/* Statistics Insight & Details */}
                                <div className="flex flex-col items-end gap-2">
                                    <div
                                        onClick={() => setShowSendersDetail(!showSendersDetail)}
                                        className="flex items-center gap-3 bg-white/5 p-2 pr-4 rounded-2xl border border-white/10 backdrop-blur-sm cursor-pointer hover:bg-white/10 transition-all group"
                                    >
                                        <span className="text-white/60 text-sm">إجمالي الجهات المرسلة:</span>
                                        <Badge className="bg-blue-500 text-white border-none px-3 py-1 text-sm font-bold group-hover:scale-110 transition-transform">
                                            {sendersCount} جهة
                                        </Badge>
                                        <div className={`transition-transform duration-300 ${showSendersDetail ? 'rotate-180' : ''}`}>
                                            <ChevronDown className="w-4 h-4 text-white/40" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Senders Grid - Expanded View */}
                            {showSendersDetail && (
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                                    {Object.entries(sendersStats).map(([name, stats]) => (
                                        <div
                                            key={name}
                                            onClick={() => handleSenderClick(name)}
                                            className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2 backdrop-blur-sm group hover:bg-white/10 transition-all cursor-pointer hover:border-blue-500/50"
                                        >
                                            <div className="flex items-start justify-between">
                                                <h4 className="text-white font-bold text-sm leading-tight group-hover:text-blue-400 transition-colors">{name}</h4>
                                                <Badge variant="outline" className="text-blue-400 border-blue-400/30 font-black text-[10px]">
                                                    {stats.count}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="ghost" className="p-0 text-slate-500 text-[10px] font-bold">
                                                    {stats.sector}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardHeader>

                        <CardContent className="p-0">
                            <div className="overflow-x-auto custom-scrollbar scrollbar-top">


                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-slate-500 text-xs font-black uppercase tracking-widest border-b">
                                            <th className="px-6 py-5">رقم المكاتبة</th>
                                            <th className="px-6 py-5">التاريخ</th>
                                            <th className="px-6 py-5">الموضوع</th>
                                            <th className="px-6 py-5">المرسل </th>
                                            <th className="px-6 py-5">الحالة</th>
                                            <th className="px-6 py-5">المطلوب</th>
                                            <th className="px-6 py-5 text-center">الإجـــــراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="7" className="py-24 text-center">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="relative">
                                                            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                                                            <div className="absolute inset-0 blur-xl bg-blue-400/20 animate-pulse"></div>
                                                        </div>
                                                        <span className="text-slate-400 font-bold tracking-wide">جاري استدعاء البيانات...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : data.length > 0 ? (
                                            data.map((item, index) => (
                                                <tr
                                                    key={`${item.DOC_NO}-${index}`}
                                                    onClick={() => handleOpenTransfer(item)}
                                                    className={`
                                                        transition-all duration-200 group cursor-pointer animate-in fade-in slide-in-from-right-4
                                                        ${item.ANSERED === 1
                                                            ? "bg-white"
                                                            : "bg-slate-100"
                                                        }
                                                        ${(!item.SEEN_FLAG || item.SEEN_FLAG === 0) ? "font-bold" : "font-normal"}
                                                        border-b border-slate-100
                                                    `}
                                                    style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
                                                >
                                                    <td className="px-6 py-5 text-center">
                                                        <div className="flex flex-col items-center justify-center gap-1">
                                                            <div className="flex items-center gap-2">
                                                                {(!item.SEEN_FLAG || item.SEEN_FLAG === 0) && (
                                                                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" title="جديد" />
                                                                )}
                                                                {item.FLAG === 2 && <Lock className="w-4 h-4 text-red-500" title="مغلق" />}
                                                                <span className={`text-lg group-hover:text-blue-600 transition-colors ${(!item.SEEN_FLAG || item.SEEN_FLAG === 0) ? "font-black text-slate-950" : "font-bold text-slate-700"}`}>
                                                                    {item.DOC_NO}
                                                                </span>
                                                            </div>
                                                            {(!item.SEEN_FLAG || item.SEEN_FLAG === 0) && (
                                                                <Badge className="bg-blue-600 text-white border-none text-[8px] px-1 py-0 h-4 min-w-[30px] justify-center">جديد</Badge>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-5 text-right font-bold text-slate-600">
                                                        <div className="flex flex-col gap-0.5">
                                                             <span className="text-sm">
                                                                 {item.DOC_DATE_STR ? (item.DOC_DATE_STR.includes(' ') ? item.DOC_DATE_STR.split(' ')[0].split('-').reverse().join('/') : item.DOC_DATE_STR.split('-').reverse().join('/')) : '-'}
                                                             </span>
                                                             {item.DOC_DATE_STR?.includes(' ') && (
                                                                 <span className="text-[10px] text-slate-400 font-medium">
                                                                     {item.DOC_DATE_STR.split(' ')[1]}
                                                                 </span>
                                                             )}
                                                         </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right max-w-sm">
                                                        <p className={`${(!item.SEEN_FLAG || item.SEEN_FLAG === 0) ? "font-black text-slate-900" : "font-bold text-slate-700"} leading-relaxed line-clamp-2`}>{item.SUBJECT}</p>
                                                        <Badge variant="outline" className="mt-1 text-[10px] border-slate-200 text-slate-400">{item.DOC_DESC_A}</Badge>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className={`text-sm ${(!item.SEEN_FLAG || item.SEEN_FLAG === 0) ? "font-black text-slate-950" : "font-bold text-slate-700"}`}>
                                                                {item.PLACE_NAME || '-'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">{item.PLACE_SEC || '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <Badge className={`font-black px-3 py-1 rounded-full text-[10px] ${item.ANSERED === 1 ? "bg-emerald-50 text-emerald-600 border-none" : "bg-amber-50 text-amber-600 border-none"}`}>
                                                            {item.ANSERED_DESC}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <span className="text-xs font-bold text-slate-500">{item.SITUATION_DESC || '-'}</span>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        {(item.ALL_RECIPIENTS || item.MY_TRANSFERS_COUNT > 0) && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-9 w-9 p-0 rounded-xl text-purple-600 hover:bg-purple-50 transition-colors"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <Users className="w-4 h-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="bg-slate-900 text-white border-slate-800 p-4 rounded-3xl shadow-2xl max-w-xs z-[300]" side="top" sideOffset={10}>
                                                                    <div className="space-y-4 text-right" dir="rtl">

                                                                        {/* المحول إليهم مني (أنا اللي حولت لهم) */}
                                                                        {item.MY_TRANSFERS_COUNT > 0 && (
                                                                            <>
                                                                                <div className="flex items-center gap-2 border-b border-green-500/30 pb-3">
                                                                                    <div className="p-1.5 bg-green-500/20 rounded-lg">
                                                                                        <Send className="w-4 h-4 text-green-400" />
                                                                                    </div>
                                                                                    <span className="font-black text-sm text-green-100">
                                                                                        المحول إليهم مني ({item.MY_TRANSFERS_COUNT})
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                                                                    {item.MY_TRANSFERS && item.MY_TRANSFERS.split(' | ').map((transfer, idx) => {
                                                                                        const parts = transfer.split(' (');
                                                                                        const name = parts[0];
                                                                                        const rest = parts[1] ? '(' + parts[1] : '';

                                                                                        return (
                                                                                            <div key={idx} className="flex items-center gap-3 group/rec py-0.5">
                                                                                                <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                                                                                                <div className="flex flex-col">
                                                                                                    <span className="text-xs font-bold tracking-tight text-green-200">
                                                                                                        {name}
                                                                                                    </span>
                                                                                                    {rest && (
                                                                                                        <span className="text-[10px] text-green-400 font-medium">
                                                                                                            {rest.replace(')', '')}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </>
                                                                        )}

                                                                        {/* الزملاء المستلمين حالياً (اللي اتحولت لهم معايا) */}
                                                                        {item.ALL_RECIPIENTS && (
                                                                            <>
                                                                                <div className="flex items-center gap-2 border-b border-blue-500/30 pb-3 pt-2">
                                                                                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                                                                        <Users className="w-4 h-4 text-blue-400" />
                                                                                    </div>
                                                                                    <span className="font-black text-sm text-blue-100">الزملاء المستلمون للمكاتبة</span>
                                                                                </div>
                                                                                <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                                                                    {item.ALL_RECIPIENTS.split(' | ').filter(n => n.trim()).map((rec, rIdx) => {
                                                                                        const parts = rec.split(' (');
                                                                                        const name = parts[0].trim();
                                                                                        const situation = parts[1] ? parts[1].replace(')', '') : '';

                                                                                        return (
                                                                                            <div key={rIdx} className="flex items-center gap-3 group/rec py-0.5">
                                                                                                <div className={`w-2 h-2 rounded-full ${name === user?.empName ? "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" : "bg-slate-700 group-hover/rec:bg-slate-500"} transition-all`} />
                                                                                                <div className="flex flex-col">
                                                                                                    <span className={`text-xs font-bold tracking-tight ${name === user?.empName ? "text-blue-400" : "text-slate-300 group-hover/rec:text-white"} transition-colors`}>
                                                                                                        {name}
                                                                                                    </span>
                                                                                                    {situation && (
                                                                                                        <span className="text-[10px] text-slate-500">
                                                                                                            {situation}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}

                                                        {item.FILE_NAME && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-9 w-9 p-0 rounded-xl text-amber-600 hover:bg-amber-50 transition-colors"
                                                                onClick={(e) => { e.stopPropagation(); openFile(item.FILE_NAME, item.DOC_NO); }}
                                                                title="عرض الملف"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        {((item.ATTACHMENTS_LIST !== undefined ? item.ATTACHMENTS_LIST.length > 0 : !!item.FILE_ATTACH)) && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-9 w-9 p-0 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // استخدام القائمة الجديدة لو موجودة، وإلا نستخدم النص القديم
                                                                    const attList = item.ATTACHMENTS_LIST !== undefined
                                                                        ? item.ATTACHMENTS_LIST
                                                                        : (item.FILE_ATTACH ? item.FILE_ATTACH.split('|').map(p => ({ FILE_PATH: p, FILE_DESC: p.split('\\').pop() })) : []);

                                                                    if (attList.length > 1) {
                                                                        setAttachmentSelection({ docNo: item.DOC_NO, attachments: attList });
                                                                    } else {
                                                                        openFile(attList[0].FILE_PATH, item.DOC_NO);
                                                                    }
                                                                }}
                                                                title="عرض المرفقات"
                                                            >
                                                                <div className="relative">
                                                                    <Paperclip className="w-4 h-4" />
                                                                    {item.ATTACHMENTS_LIST?.length > 1 && (
                                                                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] w-3 h-3 flex items-center justify-center rounded-full font-bold">
                                                                            {item.ATTACHMENTS_LIST.length}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 w-9 p-0 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(`/reports/tracking/${item.DOC_NO}`);
                                                            }}
                                                            title="تتبع مسار المكاتبة"
                                                        >
                                                            <History className="w-4 h-4" />
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 w-9 p-0 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenReply(item);
                                                            }}
                                                            title="رد على المكاتبة"
                                                        >
                                                            <ArrowUpDown className="w-4 h-4 rotate-90" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 w-9 p-0 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedDoc(item);

                                                                // استخراج المرسل الأصلي (PLACE_C)
                                                                const senderEmp = employees.find(emp =>
                                                                    emp.EMP_NUM.toString() === item.PLACE_C?.toString()
                                                                );

                                                                // استخراج المحول إليهم سابقاً من حقل MY_TRANSFERS
                                                                let previousRecipients = [];
                                                                if (item.MY_TRANSFERS) {
                                                                    // استخراج الأرقام بين الأقواس: "الاسم (1234)" -> "1234"
                                                                    const codes = item.MY_TRANSFERS.match(/\(\d+\)/g) || [];
                                                                    const cleanCodes = codes.map(c => c.replace(/\(|\)/g, ''));
                                                                    previousRecipients = employees.filter(emp =>
                                                                        cleanCodes.includes(emp.EMP_NUM.toString())
                                                                    );
                                                                }

                                                                // دمج بدون تكرار
                                                                const allInitial = [...(senderEmp ? [senderEmp] : []), ...previousRecipients];
                                                                const uniqueInitial = allInitial.filter((v, i, a) => a.findIndex(t => t.EMP_NUM === v.EMP_NUM) === i);

                                                                setNotifRecipients(uniqueInitial);
                                                                setIsNotifModalOpen(true);
                                                                setNotifMessage(`بخصوص المكاتبة رقم: ${item.DOC_NO}`);
                                                                setNotifEmpSearch("");
                                                            }}
                                                            title="إرسال تنبيه"
                                                        >
                                                            <Bell className="w-4 h-4" />
                                                        </Button>
                                                        {!item.ANSERED && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-9 w-9 p-0 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        const res = await fetch("/api/import/updateAnswered", {
                                                                            method: "POST",
                                                                            headers: { "Content-Type": "application/json" },
                                                                            body: JSON.stringify({ docNo: item.DOC_NO }),
                                                                        });
                                                                        const json = await res.json();
                                                                        if (json.success) {
                                                                            toast.success("تم الرد بنجاح");
                                                                            fetchData();
                                                                        }
                                                                    } catch {
                                                                        toast.error("فشل تحديث الحالة");
                                                                    }
                                                                }}
                                                            >
                                                                <Badge className="bg-green-50 text-green-600 border-none font-black px-4 py-2 rounded-xl cursor-pointer"> تم الرد</Badge>
                                                            </Button>
                                                        )}

                                                        {item.ANSERED === 1 && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-9 w-9 p-0 rounded-xl text-orange-600 hover:bg-orange-50 transition-colors"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (!confirm("هل أنت متأكد من إلغاء تأكيد الرد؟")) return;
                                                                    try {
                                                                        const res = await fetch("/api/import/updateAnswered", {
                                                                            method: "POST",
                                                                            headers: { "Content-Type": "application/json" },
                                                                            body: JSON.stringify({ docNo: item.DOC_NO, status: 0 }),
                                                                        });
                                                                        const json = await res.json();
                                                                        if (json.success) {
                                                                            toast.success("تم إلغاء تأكيد الرد");
                                                                            fetchData();
                                                                        }
                                                                    } catch {
                                                                        toast.error("فشل إلغاء الرد");
                                                                    }
                                                                }}
                                                            >
                                                                <Badge className="bg-orange-50 text-orange-600 border-none font-black px-4 py-2 rounded-xl cursor-pointer">إلغاء الرد</Badge>
                                                            </Button>
                                                        )}

                                                        {/* {AUTHORIZED_LOCKERS.includes(String(user?.empNum || "")) && item.FLAG !== 2 && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-9 w-9 p-0 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                                                                onClick={(e) => { e.stopPropagation(); handleLock(item.DOC_NO); }}
                                                                title="حماية الملف وإغلاقه"
                                                            >
                                                                <Unlock className="w-4 h-4" />
                                                            </Button>
                                                        )} */}

                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="py-32 text-center text-slate-400 px-6">
                                                    <div className="flex flex-col items-center gap-4 bg-slate-50/50 p-12 rounded-[40px] border border-dashed border-slate-200">
                                                        <Search className="w-12 h-12 opacity-10" />
                                                        <p className="text-lg font-black text-slate-800">لا توجد مكاتبات حالياً</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card >
                </TooltipProvider>



                {/* Additional Insights Section */}
                {/* <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="rounded-3xl border-none shadow-xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white group hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                                <Search className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-blue-100 uppercase tracking-widest">إجمالي النتائج</h3>
                                <p className="text-3xl font-black leading-none mt-1">{data.length}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="rounded-3xl border-none shadow-xl bg-white p-6 border-l-4 border-l-emerald-500 group hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-4">
                            <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">مكاتبات مكتملة</h3>
                                <p className="text-3xl font-black text-slate-800 leading-none mt-1">
                                    {data.filter(i => i.ANSERED === 1).length}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="rounded-3xl border-none shadow-xl bg-white p-6 border-l-4 border-l-amber-500 group hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-4">
                            <div className="bg-amber-50 p-3 rounded-2xl text-amber-600">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">جاري العمل</h3>
                                <p className="text-3xl font-black text-slate-800 leading-none mt-1">
                                    {data.filter(i => i.ANSERED !== 1).length}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div> */}
            </div >

            {/* Transfer Modal */}
            {
                isTransferModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <div
                            onClick={() => setIsTransferModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                        />

                        {/* Modal Content */}
                        <div
                            className="relative bg-white w-full max-w-7xl rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh] animate-in zoom-in-95 fade-in duration-300 slide-in-from-bottom-4"
                        >
                            {/* Header */}
                            <div className="bg-slate-900 p-6 text-white relative">
                                <button
                                    onClick={() => setIsTransferModalOpen(false)}
                                    className="absolute left-6 top-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                {SPECIAL_TRANSFER_USERS.includes(String(user?.empNum || "")) || user?.empNum?.toString() === "1712" ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 bg-blue-600 rounded-[20px] shadow-xl shadow-blue-500/20">
                                                <Send className="w-8 h-8 text-white stroke-[2.5px]" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <h2 className="text-2xl font-black text-white leading-tight">تحويل المكاتبة</h2>
                                                <p className="text-blue-300/60 text-xs font-bold">يرجى تحديد الإجراء المناسب لكل موظف من جدول التحويلات أدناه..</p>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-[28px] border border-white/10 backdrop-blur-md">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-right" dir="rtl">
                                                <div className="flex items-center gap-6 divide-x divide-x-reverse divide-white/10 flex-1">
                                                    <div className="flex flex-col gap-0.5 min-w-[120px]">
                                                        <span className="text-blue-400 font-black text-[10px] uppercase tracking-widest opacity-80">رقم المكاتبة</span>
                                                        <span className="text-lg font-black text-white">{selectedDoc.DOC_NO}</span>
                                                    </div>
                                                    <div className="flex-1 px-8">
                                                        <span className="text-blue-400 font-bold text-[10px] uppercase tracking-widest block mb-0.5 opacity-80">موضوع المكاتبة</span>
                                                        <p className="text-white font-bold leading-tight text-sm line-clamp-1">{selectedDoc.SUBJECT}</p>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 px-6 min-w-[120px]">
                                                        <span className="text-blue-400 font-bold text-[10px] uppercase tracking-widest block mb-0.5 opacity-80">تاريخ المكاتبة</span>
                                                        <span className="text-sm font-black text-white whitespace-nowrap">{selectedDoc.DOC_DATE_STR}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {selectedDoc.FILE_NAME && !(RESTRICTED_VIEW_USERS.includes(String(user?.empNum)) && selectedDoc.DOC_TYPE === 27) && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-10 bg-blue-600/10 border-blue-600/30 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl font-bold gap-2 px-4 transition-all"
                                                            onClick={() => openFile(selectedDoc.FILE_NAME, selectedDoc.DOC_NO)}
                                                        >
                                                            <FileText className="w-4 h-4" />

                                                            عرض المكاتبة
                                                        </Button>
                                                    )}
                                                    {((selectedDoc.ATTACHMENTS_LIST !== undefined ? selectedDoc.ATTACHMENTS_LIST.length > 0 : !!selectedDoc.FILE_ATTACH)) && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-10 bg-indigo-600/10 border-indigo-600/30 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl font-bold gap-2 px-4 transition-all"
                                                            onClick={() => {
                                                                const attList = selectedDoc.ATTACHMENTS_LIST !== undefined
                                                                    ? selectedDoc.ATTACHMENTS_LIST
                                                                    : (selectedDoc.FILE_ATTACH ? selectedDoc.FILE_ATTACH.split('|').map(p => ({ FILE_PATH: p, FILE_DESC: p.split('\\').pop() })) : []);

                                                                if (attList.length > 1) {
                                                                    setAttachmentSelection({ docNo: selectedDoc.DOC_NO, attachments: attList });
                                                                } else if (attList.length === 1) {
                                                                    openFile(attList[0].FILE_PATH, selectedDoc.DOC_NO);
                                                                }
                                                            }}
                                                        >
                                                            <Paperclip className="w-4 h-4" />
                                                            المرفقات
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-500/20">
                                                <Send className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-white">تحويل مكاتبة</h2>
                                                <p className="text-slate-400 text-sm font-medium">اختر الشخص الموجه إليه المكاتبة</p>
                                            </div>
                                        </div>

                                        {selectedDoc && (
                                            <div className="space-y-4">
                                                <div className="bg-white/5 p-4 rounded-[24px] border border-white/10 backdrop-blur-md">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-right" dir="rtl">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-orange-400 font-black text-xs uppercase tracking-wider">رقم المكاتبة</span>
                                                            <span className="text-xl font-black text-white">{selectedDoc.DOC_NO}</span>
                                                        </div>
                                                        <div className="flex-1 md:mx-6">
                                                            <span className="text-orange-400 font-bold text-xs uppercase tracking-wider block mb-1" >موضوع المكاتبة الحالي</span>
                                                            <p className="text-white font-bold leading-tight text-sm line-clamp-2">{selectedDoc.SUBJECT}</p>
                                                        </div>
                                                        <div className="text-right flex flex-col items-end gap-3">
                                                            <div>
                                                                <span className="text-orange-400 font-bold text-xs uppercase tracking-wider block mb-1">تاريخ المكاتبة</span>
                                                                <span className="text-white font-black text-sm">{selectedDoc.DOC_DATE_STR}</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {selectedDoc.FILE_NAME && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-9 bg-orange-600/20 border-orange-600 text-orange-300 hover:bg-orange-600 hover:text-white rounded-xl font-bold gap-2"
                                                                        onClick={() => openFile(selectedDoc.FILE_NAME, selectedDoc.DOC_NO)}
                                                                    >
                                                                        <FileText className="w-4 h-4" />
                                                                        عرض المكاتبة
                                                                    </Button>
                                                                )}
                                                                {selectedDoc.FILE_ATTACH && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-9 bg-amber-600/20 border-amber-600 text-amber-300 hover:bg-amber-600 hover:text-white rounded-xl font-bold gap-2"
                                                                        onClick={() => {
                                                                            const atts = selectedDoc.FILE_ATTACH.split('|');
                                                                            if (atts.length > 1) {
                                                                                setAttachmentSelection({ docNo: selectedDoc.DOC_NO, attachments: atts });
                                                                            } else {
                                                                                openFile(selectedDoc.FILE_ATTACH, selectedDoc.DOC_NO);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Paperclip className="w-4 h-4" />
                                                                        المرفقات
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 bg-white/5 p-5 rounded-[24px] border border-white/10">
                                                    {/* <div className="flex flex-col gap-1.5">
                                                        <label className="text-[10px] uppercase font-bold text-orange-400 tracking-widest text-right mr-1">تعديل موضوع التحويل (سيرفق مع كل موظف مختار)</label>
                                                        <Input
                                                            value={editableSubject}
                                                            onChange={(e) => setEditableSubject(e.target.value)}
                                                            className="bg-white/10 border-white/20 text-white placeholder:text-white/20 h-11 rounded-xl focus:ring-orange-500/50 font-bold text-right"
                                                        />
                                                    </div> */}

                                                    <div className="pt-2 border-t border-white/10">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2 text-orange-400">
                                                                <Paperclip className="w-4 h-4" />
                                                                <span className="text-xs font-black">إضافة مرفقات جديدة إضافية مع التحويل</span>
                                                            </div>
                                                            {transferAttachments.length > 0 && (
                                                                <Badge className="bg-orange-500 text-white border-none text-[10px] font-black h-5">
                                                                    {transferAttachments.length} ملفات مختارة
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {transferAttachments.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mb-4">
                                                                {transferAttachments.map((att, idx) => (
                                                                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/10 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                                                                        <span className="text-[10px] font-bold text-white/80 truncate max-w-[150px]">{att.file ? att.file.name : (att.name || 'ملف')}</span>
                                                                        <button
                                                                            onClick={() => setTransferAttachments(transferAttachments.filter((_, i) => i !== idx))}
                                                                            className="text-white/40 hover:text-red-400 transition-colors"
                                                                        >
                                                                            <X className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <Button
                                                            asChild
                                                            variant="outline"
                                                            className="w-full h-12 rounded-2xl border-dashed border-white/20 bg-white/5 hover:bg-white/10 text-white font-black group transition-all"
                                                        >
                                                            <label className="cursor-pointer flex items-center justify-center gap-3">
                                                                <Paperclip className="w-5 h-5 group-hover:rotate-12 transition-transform text-orange-400" />
                                                                <span className="text-sm">اضغط هنا لاختيار ملفات لرفعها مع التحويل</span>
                                                                <input
                                                                    type="file"
                                                                    multiple
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        const files = Array.from(e.target.files || []);
                                                                        const newAtts = files.map(f => ({ file: f, desc: f.name }));
                                                                        setTransferAttachments([...transferAttachments, ...newAtts]);
                                                                    }}
                                                                />
                                                            </label>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="p-3 flex-1 overflow-y-auto bg-slate-50/50" dir="rtl">
                                {/* Layout for Special User 1714: Two Columns */}
                                {SPECIAL_TRANSFER_USERS.includes(String(user?.empNum || "")) ? (
                                    <div className="flex flex-col h-full overflow-hidden">
                                        {/* Matrix Grid Selection */}
                                        <div className="flex-1 bg-blue-50/50 p-2">
                                            <div className="w-full overflow-x-auto">
                                                <table className="border border-blue-300 rounded-[24px] bg-white/80 shadow-lg min-w-max border-separate" dir="rtl" style={{ borderSpacing: "6" }}>
                                                    <thead>
                                                        <tr>
                                                            {/* Empty corner cell */}
                                                            <th className="px-2 py-1 bg-blue-100 rounded-tr-[20px] border-b-2 border-blue-400 min-w-[130px] text-xs">
                                                                <div className="flex items-center gap-2 text-blue-950">
                                                                    <Users className="w-4 h-4" />
                                                                    <span className="text-xs font-black uppercase tracking-widest">الإجراءات المطلوبة</span>
                                                                </div>
                                                            </th>
                                                            {/* Employee Headers */}
                                                            {getOrderedSpecialEmps(employees, user?.empNum?.toString())
                                                                .map((emp, idx, arr) => (
                                                                    <th
                                                                        key={emp.EMP_NUM}
                                                                        className={`
                                                                            px-1 py-1 border-b-2 border-blue-100 min-w-[68px] max-w-[110px] text-center transition-all bg-blue-50/70
                                                                            ${idx === arr.length - 1 ? 'rounded-tl-[20px]' : ''}
                                                                        `}
                                                                        style={{ fontSize: "12px" }}
                                                                    >
                                                                        <div className="flex flex-col items-center gap-1">
                                                                            {/* <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-base shadow border-2 border-white
                                                                                ${selectedEmps.some(se => se.EMP_NUM === emp.EMP_NUM) ? "bg-blue-600 text-white" : "bg-slate-200 text-blue-600"}
                                                                            `}>
                                                                                {emp.EMP_NAME?.charAt(0)}
                                                                            </div> */}
                                                                            <div className="">
                                                                                {/* <p className="font-black text-blue-900 text-xs whitespace-nowrap">{emp.EMP_NAME}</p> */}
                                                                                <p className={`text-[9px] text-blue-600 font-bold ${selectedEmps.some(se => se.EMP_NUM === emp.EMP_NUM) ? "bg-blue-600 text-white" : "bg-slate-200 text-blue-600"}`}>
                                                                                    {SPECIAL_EMP_SHORT_LABELS[emp.EMP_NUM?.toString()] || emp.SEC_N}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </th>
                                                                ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {SITUATION_OPTIONS2.map((sit, rowIdx) => (
                                                            <tr key={sit.id} className={`group transition-colors bg-white ${rowIdx % 2 === 0 ? "bg-blue-50/50" : ""} hover:bg-blue-100/60`}>
                                                                {/* Action Label Row Header */}
                                                                <td className="px-2 py-1 font-black text-blue-900 text-xs border-l border-blue-100 bg-blue-100 sticky right-0 z-10 shadow-[4px_0_8px_rgba(0,0,15,0.03)] min-w-[120px]">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors
                                                                            ${selectedEmps.some(se => se.customSituation === sit.id.toString()) ? "bg-blue-100 text-blue-600" : "bg-white text-blue-400 border border-blue-100"}
                                                                        `}>
                                                                            <CheckCircle2 className="w-4 h-4" />
                                                                        </div>
                                                                        {sit.label}
                                                                    </div>
                                                                </td>
                                                                {/* Checkbox Cells */}
                                                                {getOrderedSpecialEmps(employees, user?.empNum?.toString())
                                                                    .map((emp, colIdx) => {
                                                                        const isSelectedAction = selectedEmps.some(se => se.EMP_NUM === emp.EMP_NUM && se.customSituation === sit.id.toString());

                                                                        return (
                                                                            <td
                                                                                key={`${emp.EMP_NUM}-${sit.id}`}
                                                                                className={`
                                                                                    px-2 py-1 text-center cursor-pointer border border-blue-100 transition-all
                                                                                    ${isSelectedAction ? "bg-blue-600/90 hover:bg-blue-700 border-blue-500" : "bg-white hover:bg-blue-100"}
                                                                                `}
                                                                                style={{ minWidth: "60px", maxWidth: "80px" }}
                                                                                onClick={() => {
                                                                                    if (isSelectedAction) {
                                                                                        setSelectedEmps(selectedEmps.filter(se => se.EMP_NUM !== emp.EMP_NUM));
                                                                                    } else {
                                                                                        const otherEmps = selectedEmps.filter(se => se.EMP_NUM !== emp.EMP_NUM);
                                                                                        setSelectedEmps([...otherEmps, { ...emp, customSituation: sit.id.toString(), customSubject: editableSubject }]);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <div className={`w-4 h-4 mx-auto rounded-full border-2 flex items-center justify-center transition-all duration-200
                                                                                    ${isSelectedAction
                                                                                        ? "bg-blue-600 border-blue-600 shadow shadow-blue-100 scale-105"
                                                                                        : "border-blue-100 group-hover:border-blue-200"
                                                                                    }
                                                                                `}>
                                                                                    {isSelectedAction && <Check className="w-4 h-4 text-white stroke-[3px]" />}
                                                                                </div>
                                                                            </td>
                                                                        );
                                                                    })}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Attachments Section for Special Users - Professional Footer-style */}
                                        {/* <div className="bg-slate-50 border-t border-slate-200 p-6">
                                            <div className="flex flex-col gap-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-100 rounded-xl">
                                                            <Paperclip className="w-5 h-5 text-blue-600" />
                                                        </div>
                                                        <h4 className="font-black text-slate-800">مرفقات إضافية للتحويل</h4>
                                                    </div>
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        className="rounded-xl border-dashed border-blue-300 bg-white hover:bg-blue-50 text-blue-700 font-bold px-6 transition-all border-2"
                                                    >
                                                        <label className="cursor-pointer flex items-center gap-2">
                                                            <Paperclip className="w-4 h-4" />
                                                            إضافة ملف جديد
                                                            <input
                                                                type="file"
                                                                multiple
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const files = Array.from(e.target.files || []);
                                                                    const newAtts = files.map(f => ({ file: f, desc: f.name }));
                                                                    setTransferAttachments([...transferAttachments, ...newAtts]);
                                                                }}
                                                            />
                                                        </label>
                                                    </Button>
                                                </div>

                                                {transferAttachments.length > 0 && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {transferAttachments.map((att, idx) => (
                                                            <div key={idx} className="bg-white border border-slate-200 p-3 rounded-2xl flex items-center gap-3 group animate-in zoom-in-95">
                                                                <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                                                    <Files className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                                                                </div>
                                                                <div className="flex-1 space-y-1">
                                                                    <Input
                                                                        value={att.desc}
                                                                        onChange={(e) => {
                                                                            const updated = [...transferAttachments];
                                                                            updated[idx].desc = e.target.value;
                                                                            setTransferAttachments(updated);
                                                                        }}
                                                                        placeholder="اسم المرفق..."
                                                                        className="h-8 text-xs font-bold border-none bg-transparent focus:ring-0 shadow-none px-0"
                                                                    />
                                                                    <p className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{att.file ? att.file.name : (att.name || '')}</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => setTransferAttachments(transferAttachments.filter((_, i) => i !== idx))}
                                                                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div> */}
                                    </div>
                                ) : (
                                    <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6 bg-slate-50/50" dir="rtl">
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                                            {/* ✅ الجزء الأيمن: المفضلة + البحث - تصميم موحد مع ExportPage */}
                                            <div className="lg:col-span-7 flex flex-col gap-4">

                                                {/* ✅ قسم المفضلة - يظهر فقط لو فيه موظفين مفضلين */}
                                                {favorites.length > 0 && (
                                                    <section className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                            <h3 className="font-black text-slate-800 text-sm">المفضلين</h3>
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
                                                                        onClick={() => toggleEmpSelection(fav)}
                                                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-right ${isSelected
                                                                            ? "border-blue-500 bg-blue-50 text-blue-700"
                                                                            : "border-slate-100 bg-white hover:border-blue-200"
                                                                            }`}
                                                                    >
                                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                                                                            }`}>
                                                                            {fav.EMP_NAME?.charAt(0)}
                                                                        </div>
                                                                        <span className="text-xs font-bold truncate max-w-[120px]">{fav.EMP_NAME}</span>
                                                                        {isSelected && <Check className="w-3 h-3 text-blue-600" />}
                                                                        {/* ✅ استخدام div بدلاً من button لمنع التداخل */}
                                                                        <div
                                                                            onClick={(e) => { e.stopPropagation(); toggleFavorite(fav); }}
                                                                            className="p-1 hover:bg-amber-50 rounded text-amber-500 cursor-pointer"
                                                                            title="إزالة من المفضلة"
                                                                            role="button"
                                                                            tabIndex={0}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter' || e.key === ' ') {
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

                                                {/* قسم البحث والاختيار */}
                                                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                                                            <Users className="w-5 h-5 text-blue-600" />
                                                            البحث والاختيار
                                                        </h3>
                                                        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                                                            <span className="text-[10px] font-black text-blue-600">الافتراضي:</span>
                                                            <select
                                                                value={selectedSituation}
                                                                onChange={(e) => setSelectedSituation(e.target.value)}
                                                                className="bg-transparent border-none text-[10px] font-black text-blue-700 focus:ring-0 outline-none cursor-pointer"
                                                            >
                                                                {situations.map(s => (
                                                                    <option key={s.SITUATION_C} value={s.SITUATION_C}>{s.SITUATION_DESC}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="relative">
                                                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <Input
                                                            placeholder="ابحث بالاسم أو رقم الموظف..."
                                                            value={employeeSearch}
                                                            onChange={(e) => setEmployeeSearch(e.target.value)}
                                                            className="h-12 pr-12 rounded-2xl border-slate-200 font-bold text-right shadow-inner bg-slate-50/30"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {employees
                                                            .filter(emp =>
                                                                String(emp.EMP_NUM) !== String(user?.empNum) &&
                                                                (emp.EMP_NAME.includes(employeeSearch) || emp.EMP_NUM.toString().includes(employeeSearch))
                                                            )
                                                            // ✅ ترتيب: المفضلين يظهرون أولاً
                                                            .sort((a, b) => {
                                                                const aFav = favorites.some(f => f.EMP_NUM === a.EMP_NUM);
                                                                const bFav = favorites.some(f => f.EMP_NUM === b.EMP_NUM);
                                                                if (aFav && !bFav) return -1;
                                                                if (!aFav && bFav) return 1;
                                                                return 0;
                                                            })
                                                            .slice(0, 50)
                                                            .map(emp => {
                                                                const isSelected = selectedEmps.some(e => e.EMP_NUM === emp.EMP_NUM);
                                                                const isFavorite = favorites.some(f => f.EMP_NUM === emp.EMP_NUM);
                                                                return (
                                                                    <div
                                                                        key={emp.EMP_NUM}
                                                                        onClick={() => toggleEmpSelection(emp)}
                                                                        className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group relative ${isSelected
                                                                            ? "border-blue-500 bg-blue-50/50 shadow-sm"
                                                                            : "border-slate-50 bg-white hover:border-slate-200"
                                                                            }`}
                                                                    >
                                                                        {/* زر المفضلة السريع */}
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
                                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                                    e.stopPropagation();
                                                                                    toggleFavorite(emp);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Star className={`w-3.5 h-3.5 ${isFavorite ? "fill-amber-500" : ""}`} />
                                                                        </div>
                                                                        <div className="flex items-center gap-3 flex-1">
                                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs transition-colors ${isSelected
                                                                                ? "bg-blue-600 text-white"
                                                                                : isFavorite
                                                                                    ? "bg-amber-100 text-amber-600"
                                                                                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                                                                                }`}>
                                                                                {emp.EMP_NAME.charAt(0)}
                                                                            </div>
                                                                            <div className="text-right pr-1">
                                                                                <p className="font-bold text-slate-800 text-xs">{emp.EMP_NAME}</p>
                                                                                <p className="text-[9px] text-slate-400 font-bold">{emp.SEC_N}</p>
                                                                            </div>
                                                                        </div>
                                                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ✅ الجزء الأيسر: إدارة المختارين والغرض - تصميم موحد */}
                                            <div className="lg:col-span-5 flex flex-col gap-4">
                                                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col h-full">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                                                            <MessageCircle className="w-5 h-5 text-indigo-600" />
                                                            المستلمون والغرض ({selectedEmps.length})
                                                        </h3>
                                                        {selectedEmps.length > 0 && (
                                                            <Button variant="ghost" size="sm" onClick={() => setSelectedEmps([])}
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold text-xs">
                                                                مسح الكل
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {selectedEmps.length === 0 ? (
                                                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 min-h-[200px] border-2 border-dashed border-slate-100 rounded-2xl">
                                                            <Users className="w-10 h-10 opacity-10" />
                                                            <p className="text-xs font-bold">برجاء اختيار موظف واحد على الأقل</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                                                            {selectedEmps.map(emp => (
                                                                <div key={emp.EMP_NUM} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 relative group animate-in slide-in-from-left-4">
                                                                    <button
                                                                        onClick={() => toggleEmpSelection(emp)}
                                                                        className="absolute left-3 top-3 p-1 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 transition-all opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-sm">
                                                                            {emp.EMP_NAME.charAt(0)}
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="font-black text-slate-800 text-xs">{emp.EMP_NAME}</p>
                                                                            <p className="text-[9px] font-bold text-slate-400">{emp.SEC_N}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[9px] font-black text-slate-400 uppercase mr-1">الغرض من المكاتبة</label>
                                                                        <Select
                                                                            value={(emp.customSituation || selectedSituation).toString()}
                                                                            onValueChange={(val) => updateEmpCustomData(emp.EMP_NUM, "customSituation", val)}
                                                                        >
                                                                            <SelectTrigger className="h-10 bg-black border-slate-200 rounded-xl font-bold text-xs">
                                                                                <SelectValue placeholder="اختر الغرض..." />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {situations.map(s => (
                                                                                    <SelectItem key={s.SITUATION_C} value={s.SITUATION_C.toString()} className="font-bold text-xs">
                                                                                        {s.SITUATION_DESC}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between" dir="rtl">
                                <Button variant="ghost" onClick={() => setIsTransferModalOpen(false)} className="font-bold text-slate-500">إغلاق</Button>
                                <div className="flex items-center gap-4">
                                    {selectedEmps.length > 0 && (
                                        <Badge className="bg-blue-50 text-blue-600 border-none font-black px-6 py-3 rounded-2xl text-sm shadow-sm ring-1 ring-blue-100">
                                            تم اختيار {selectedEmps.length} موظف للتحويل
                                        </Badge>
                                    )}
                                    <Button
                                        disabled={selectedEmps.length === 0 || isTransferring}
                                        onClick={() => setIsConfirmOpen(true)}
                                        className={`h-12 px-10 rounded-2xl font-black text-white shadow-xl transition-all ${SPECIAL_TRANSFER_USERS.includes(String(user?.empNum || "")) ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200" : "bg-orange-600 hover:bg-orange-700 shadow-orange-200"}`}
                                    >
                                        {isTransferring ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-2" />}
                                        تأكيد التحويل النهائي
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Confirmation Modal */}
            {
                isConfirmOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsConfirmOpen(false)} />
                        <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-8 text-center space-y-6" dir="rtl">
                                <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="w-10 h-10 text-orange-600 animate-bounce" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900">تأكيد عملية التحويل</h3>
                                    <p className="text-slate-500 font-medium leading-relaxed">
                                        هل أنت متأكد من تحويل هذه المكاتبة إلى <span className="text-orange-600 font-black underline">{selectedEmps.length}</span> موظف؟
                                    </p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <Button variant="outline" onClick={() => setIsConfirmOpen(false)} className="flex-1 h-12 rounded-2xl font-bold border-slate-200 text-slate-600">تراجع</Button>
                                    <Button
                                        onClick={executeTransfer}
                                        disabled={isTransferring}
                                        className="flex-1 h-12 rounded-2xl font-black bg-slate-900 hover:bg-orange-600 text-white transition-all shadow-xl shadow-slate-200"
                                    >
                                        {isTransferring ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5 ml-2" />}
                                        نعم، قم بالتحويل
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Reply Modal */}
            {
                isReplyModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsReplyModalOpen(false)} />
                        <div className="relative bg-white w-full max-w-7xl rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
                            {/* Header */}
                            <div className="bg-blue-900 p-8 text-white relative">
                                <button onClick={() => setIsReplyModalOpen(false)} className="absolute left-8 top-8 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-4 bg-blue-600 rounded-2xl shadow-lg">
                                        <ArrowUpDown className="w-8 h-8 text-white rotate-90" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white">الرد  على المكاتبة</h2>
                                        <p className="text-blue-200 text-sm font-medium">سيتم رد مكاتبة جديدة   مرتبطة بالمستند الأصلي</p>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-6 rounded-[24px] border border-white/10 backdrop-blur-md">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-right" dir="rtl">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-blue-300 font-black text-[10px] uppercase tracking-widest">المكاتبة الأصلية</span>
                                            <span className="text-2xl font-black text-white">{selectedDoc?.DOC_NO}</span>
                                        </div>
                                        <div className="flex-1 md:mx-12">
                                            <span className="text-blue-300 font-bold text-[10px] uppercase tracking-widest block mb-1">موضوع الرد</span>
                                            <Input
                                                value={replySubject}
                                                onChange={(e) => setReplySubject(e.target.value)}
                                                className="bg-white/10 border-white/20 text-white placeholder:text-white/20 h-14 rounded-2xl focus:ring-blue-500 font-black text-lg text-right"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 flex-1 overflow-y-auto flex flex-col gap-8 bg-slate-50/50" dir="rtl">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Left Column: Template & Recipients */}
                                    <div className="space-y-8">
                                        <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge className="bg-blue-100 text-blue-600 border-none">1</Badge>
                                                <h3 className="font-black text-slate-800">اختر قالب الرد</h3>
                                            </div>
                                            <div className="relative">
                                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    placeholder="ابحث عن نوع المكاتبة..."
                                                    className="h-14 pr-11 bg-slate-50 border-none rounded-2xl font-bold"
                                                    value={kindSearchTerm}
                                                    onChange={(e) => {
                                                        setKindSearchTerm(e.target.value);
                                                        fetchDocKinds(e.target.value);
                                                    }}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                                                {docKinds.map(kind => (
                                                    <button
                                                        key={kind.id}
                                                        onClick={() => setReplyDocType(kind.id.toString())}
                                                        className={`p-4 rounded-2xl border-2 transition-all text-right group ${replyDocType === kind.id.toString() ? "bg-blue-600 border-blue-600 text-white shadow-lg scale-[0.98]" : "bg-white border-slate-100 hover:border-blue-200 text-slate-600"}`}
                                                    >
                                                        <p className="font-black text-sm">{kind.DOC_DESC_A}</p>
                                                        <p className={`text-[10px] uppercase font-bold ${replyDocType === kind.id.toString() ? "text-blue-100" : "text-slate-400"}`}>{kind.DOC_DESC}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Right Column: Attachments & Target */}
                                    <div className="space-y-8">
                                        {/* Recipients Section */}
                                        <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge className="bg-blue-100 text-blue-600 border-none">2</Badge>
                                                <h3 className="font-black text-slate-800">توجيه الرد إلى</h3>
                                            </div>
                                            <div className="relative">
                                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    placeholder="ابحث عن الموظفين..."
                                                    className="h-14 pr-11 bg-slate-50 border-none rounded-2xl font-bold font-black"
                                                    value={employeeSearch}
                                                    onChange={(e) => setEmployeeSearch(e.target.value)}
                                                />
                                            </div>
                                            {employeeSearch && (
                                                <div className="bg-slate-50 rounded-2xl max-h-[150px] overflow-y-auto p-2 space-y-1">
                                                    {employees.filter(e => e.EMP_NAME.includes(employeeSearch)).map(emp => (
                                                        <button
                                                            key={emp.EMP_NUM}
                                                            onClick={() => {
                                                                if (!selectedEmps.some(e => e.EMP_NUM === emp.EMP_NUM)) {
                                                                    setSelectedEmps([...selectedEmps, { ...emp, customSituation: "7" }]);
                                                                }
                                                                setEmployeeSearch("");
                                                            }}
                                                            className="w-full p-3 text-right hover:bg-white rounded-xl font-bold text-sm transition-colors flex items-center justify-between"
                                                        >
                                                            <span className="font-black">{emp.EMP_NAME}</span>
                                                            <span className="text-[10px] text-slate-400">{emp.SEC_N}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                                {selectedEmps.map(emp => (
                                                    <div key={emp.EMP_NUM} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                                                                    <User className="w-5 h-5 text-slate-400" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-slate-800 text-sm">{emp.EMP_NAME}</p>
                                                                    <p className="text-[10px] text-slate-400 font-bold">{emp.SEC_N}</p>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => setSelectedEmps(selectedEmps.filter(e => e.EMP_NUM !== emp.EMP_NUM))} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/50">
                                                            {situations.map(sit => (
                                                                <button
                                                                    key={sit.SITUATION_C}
                                                                    onClick={() => {
                                                                        setSelectedEmps(selectedEmps.map(e => e.EMP_NUM === emp.EMP_NUM ? { ...e, customSituation: sit.SITUATION_C.toString() } : e));
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${emp.customSituation === sit.SITUATION_C.toString() ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "bg-white text-slate-500 border border-slate-200 hover:border-blue-200"}`}
                                                                >
                                                                    {sit.SITUATION_DESC}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {/* Attachments Section */}
                                        <section className="bg-slate-900 p-6 rounded-[32px] text-white space-y-4 shadow-xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <Paperclip className="w-5 h-5 text-blue-400" />
                                                    <h3 className="font-black">مرفقات الرد</h3>
                                                </div>
                                                <Badge className="bg-blue-500/20 text-blue-300 border-none px-3 font-black">
                                                    {replyExistingAttachments.length + replyNewAttachments.length} ملف
                                                </Badge>
                                            </div>

                                            <div className="space-y-3">
                                                {/* Original Files (read-only in this context or removable) */}
                                                {replyExistingAttachments.map((path, idx) => (
                                                    <div key={`exist-${idx}`} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl group hover:bg-white/10 transition-all cursor-pointer"
                                                        onClick={() => {
                                                            openFile(path, selectedDoc?.DOC_NO);
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <Files className="w-4 h-4 text-blue-400 shrink-0" />
                                                            <span className="text-xs font-bold truncate opacity-70" dir="ltr">{path.split('\\').pop()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Search className="w-3 h-3 text-white/20 group-hover:text-blue-400 transition-colors" />
                                                            <Badge variant="outline" className="text-[8px] border-white/20 text-white/40">ملف أصلي</Badge>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* New Files */}
                                                {replyNewAttachments.map((file, idx) => (
                                                    <div key={`new-${idx}`} className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl animate-in slide-in-from-right-2 duration-300">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <Paperclip className="w-4 h-4 text-emerald-400 shrink-0" />
                                                            <span className="text-xs font-black truncate text-blue-100">{file.name}</span>
                                                        </div>
                                                        <button onClick={() => setReplyNewAttachments(replyNewAttachments.filter((_, i) => i !== idx))} className="text-white/20 hover:text-red-400 transition-colors p-1">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pt-2">
                                                <Button
                                                    asChild
                                                    variant="outline"
                                                    className="w-full h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-black group"
                                                >
                                                    <label className="cursor-pointer flex items-center justify-center gap-2">
                                                        <Paperclip className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                                        إضافة مرفقات جديدة
                                                        <input
                                                            type="file"
                                                            multiple
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const files = Array.from(e.target.files || []);
                                                                setReplyNewAttachments([...replyNewAttachments, ...files]);
                                                            }}
                                                        />
                                                    </label>
                                                </Button>
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-8 bg-white border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    {!replySavedPath ? (
                                        <Button
                                            onClick={handleCreateReply}
                                            disabled={isCreatingReply || !replyDocType || selectedEmps.length === 0}
                                            className="h-16 px-12 bg-slate-900 hover:bg-blue-600 text-white rounded-[24px] font-black text-lg transition-all shadow-xl shadow-slate-200"
                                        >
                                            {isCreatingReply ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <FileText className="ml-2 h-5 w-5" />}
                                            إنشاء الرد (Word)
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <Button
                                                onClick={() => openFile(replySavedPath, null)}
                                                className="h-16 px-8 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-[24px] font-black border-2 border-blue-100"
                                            >
                                                <ExternalLink className="ml-2 h-5 w-5" />
                                                فتح الملف مرة ثانية
                                            </Button>
                                            <Button
                                                onClick={executeReplyArchive}
                                                disabled={isArchivingReply}
                                                className="h-16 px-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[24px] font-black text-xl shadow-xl shadow-emerald-100 animate-pulse-slow"
                                            >
                                                {isArchivingReply ? <Loader2 className="ml-2 h-6 w-6 animate-spin" /> : <Send className="ml-2 h-6 w-6" />}
                                                إرسال الرد النهائي
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-slate-400">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span className="text-sm font-bold">سيتم إرفاق المكاتبة الأصلية تلقائياً مع هذا الرد</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal إرسال تنبيه سريع */}
            {
                isNotifModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsNotifModalOpen(false)} />
                        <Card className="relative w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border-none animate-in zoom-in-95 duration-200">
                            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Bell className="w-6 h-6 text-blue-400" />
                                    <h2 className="text-xl font-black">إرسال تنبيه عن مكاتبة</h2>
                                </div>
                                <button
                                    onClick={() => setIsNotifModalOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <CardContent className="p-8 space-y-6 text-right" dir="rtl">
                                <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 flex flex-col gap-2">
                                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">المكاتبة المختارة</p>
                                    <p className="font-black text-blue-900">{selectedDoc?.DOC_NO} - {selectedDoc?.SUBJECT}</p>
                                </div>

                                {/* حقل البحث عن الموظفين */}
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-slate-700 mr-1">المستلمون</label>
                                    <div className="relative">
                                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="ابحث بالاسم أو رقم الموظف..."
                                            value={notifEmpSearch}
                                            onChange={(e) => setNotifEmpSearch(e.target.value)}
                                            className="h-12 pr-11 rounded-2xl border-slate-200 font-bold bg-slate-50"
                                        />
                                    </div>

                                    {/* نتائج البحث (تظهر فقط عند وجود بحث) */}
                                    {notifEmpSearch && (
                                        <div className="bg-slate-50 rounded-2xl max-h-[200px] overflow-y-auto p-2 space-y-1 border border-slate-100">
                                            {employees
                                                .filter(emp =>
                                                    !notifRecipients.some(r => r.EMP_NUM === emp.EMP_NUM) && // مستبعد المختارين
                                                    (emp.EMP_NAME.includes(notifEmpSearch) || emp.EMP_NUM.toString().includes(notifEmpSearch))
                                                )
                                                .slice(0, 10)
                                                .map(emp => (
                                                    <button
                                                        key={emp.EMP_NUM}
                                                        onClick={() => {
                                                            setNotifRecipients([...notifRecipients, emp]);
                                                            setNotifEmpSearch(""); // مسح البحث بعد الإضافة
                                                        }}
                                                        className="w-full p-3 text-right hover:bg-white rounded-xl font-bold text-sm transition-colors flex items-center justify-between"
                                                    >
                                                        <span className="font-black">{emp.EMP_NAME}</span>
                                                        <span className="text-[10px] text-slate-400">{emp.SEC_N}</span>
                                                    </button>
                                                ))}
                                            {employees.filter(emp =>
                                                !notifRecipients.some(r => r.EMP_NUM === emp.EMP_NUM) &&
                                                (emp.EMP_NAME.includes(notifEmpSearch) || emp.EMP_NUM.toString().includes(notifEmpSearch))
                                            ).length === 0 && (
                                                    <div className="p-4 text-center text-slate-400 text-sm font-medium">
                                                        لا يوجد موظفين جدد بهذا الاسم
                                                    </div>
                                                )}
                                        </div>
                                    )}

                                    {/* عرض المستلمين المختارين كـ tags */}
                                    {notifRecipients.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {notifRecipients.map(emp => (
                                                <div
                                                    key={emp.EMP_NUM}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 border border-blue-200 rounded-xl text-blue-700 text-sm font-bold"
                                                >
                                                    <span>{emp.EMP_NAME}</span>
                                                    <button
                                                        onClick={() => setNotifRecipients(notifRecipients.filter(r => r.EMP_NUM !== emp.EMP_NUM))}
                                                        className="p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <label className="text-sm font-black text-slate-700 mr-1">محتوى الرسالة</label>
                                    <textarea
                                        placeholder="اكتب ملاحظاتك..."
                                        value={notifMessage}
                                        onChange={(e) => setNotifMessage(e.target.value)}
                                        className="w-full min-h-[120px] p-4 rounded-2xl border-2 border-slate-100 font-bold focus:border-blue-500 focus:ring-0 outline-none transition-all resize-none shadow-inner bg-slate-50/20"
                                    />

                                    <Button
                                        onClick={async () => {
                                            if (notifRecipients.length === 0 || !notifMessage.trim()) {
                                                toast.error("برجاء اختيار مستلم واحد على الأقل وكتابة الرسالة");
                                                return;
                                            }
                                            setIsSendingNotif(true);
                                            try {
                                                // إرسال التنبيه لكل مستلم على حدة (أو يمكن تعديل الـ API لاستقبال مصفوفة)
                                                for (const recipient of notifRecipients) {
                                                    const res = await fetch("/api/notifications", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({
                                                            receiverId: Number(recipient.EMP_NUM),
                                                            message: notifMessage,
                                                            docNo: selectedDoc.DOC_NO
                                                        })
                                                    });
                                                    const json = await res.json();
                                                    if (!json.success) {
                                                        throw new Error(json.error || "فشل الإرسال لأحد المستلمين");
                                                    }
                                                }
                                                toast.success(`تم إرسال التنبيه إلى ${notifRecipients.length} مستلم بنجاح`);
                                                setIsNotifModalOpen(false);
                                                setNotifMessage("");
                                                setNotifRecipients([]);
                                            } catch (err) {
                                                toast.error(`فشل الإرسال: ${err.message}`);
                                            } finally {
                                                setIsSendingNotif(false);
                                            }
                                        }}
                                        disabled={isSendingNotif || notifRecipients.length === 0}
                                        className="w-full h-16 rounded-[24px] bg-slate-900 hover:bg-blue-600 text-white font-black text-lg shadow-xl shadow-blue-100 transition-all group active:scale-95"
                                    >
                                        {isSendingNotif ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5 ml-2 transition-transform" />
                                                إرسال التنبيه الآن ({notifRecipients.length})
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            {/* Modal اختيار المرفقات (عند وجود مرفقات متعددة) */}
            {
                attachmentSelection && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setAttachmentSelection(null)} />
                        <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-6 bg-blue-900 text-white flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Paperclip className="w-6 h-6 text-blue-400" />
                                    <h2 className="text-xl font-black text-white">اختر المرفق للعرض</h2>
                                </div>
                                <button onClick={() => setAttachmentSelection(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto bg-slate-50" dir="ltr">
                                {attachmentSelection.attachments.map((att, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group shadow-sm">
                                        <button
                                            onClick={() => {
                                                openFile(att.FILE_PATH, attachmentSelection.docNo);
                                                // لا تغلق المودال بعد فتح الملف
                                            }}
                                            className="flex-1 flex items-center gap-4 text-right"
                                            dir="rtl"
                                        >
                                            <div className="p-2 bg-slate-50 group-hover:bg-blue-100 rounded-xl transition-colors">
                                                <Files className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0 text-right">
                                                <p className="font-bold text-slate-700 truncate">{att.FILE_DESC || att.FILE_PATH.split('\\').pop()}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">مرفق رقم {idx + 1}</p>
                                            </div>
                                        </button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 rounded-lg text-blue-600 hover:bg-blue-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                downloadFile(att.FILE_PATH, att.FILE_DESC || att.FILE_PATH.split('\\').pop());
                                            }}
                                            title="تحميل الملف"
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 bg-white border-t border-slate-100 text-center">
                                <Button variant="ghost" onClick={() => setAttachmentSelection(null)} className="font-bold text-slate-500">إلغاء</Button>
                            </div>
                        </div>
                    </div>
                )
            }


        </div >
    );
}