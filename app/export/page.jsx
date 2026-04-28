"use client";

import { useState, useEffect, useRef } from "react";
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
    ExternalLink,
    Loader2,
    AlertCircle,
    Clock,
    FolderOpen,
    Send,
    Star,
    X,
    CheckCircle2,
    Check,
    AlertTriangle,
    ChevronDown,
    Paperclip,
    Files,
    Lock,
    Unlock,
    Bell,
    MessageCircle,
    RotateCcw,
    History,
    Users,
    Globe,
    Monitor,
    ChevronLeft,
    Trash2,
    Pencil,
    RefreshCcw,
    ArrowUpDown,
    User
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


// قائمة المستخدمين الذين تظهر لهم "النافذة الخاصة" (التحويل الإداري بالأرزق)
const SPECIAL_TRANSFER_USERS = ["1714"];
// قائمة المستخدمين المصرح لهم بـ "إغلاق وحماية الملفات" (زر القفل)
const AUTHORIZED_LOCKERS = ["938", "181", "1714"];
// قائمة الموظفين الذين يظهرون في المقترحات السريعة داخل النافذة الخاصة
const SPECIAL_EMP_CODES = ["1712", "1716", "1713", "1761", "183", "1757", "1711", "888", "153", "1734", "1773", "1728", "181", "966", "1503", "987", "260"];

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

export default function ExportPage() {
    const router = useRouter();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [user, setUser] = useState(null);

    // الفلاتر
    const today = new Date().toISOString().split('T')[0];
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [incoming, setIncoming] = useState(false);
    const [internal, setInternal] = useState(false);
    const [answered, setAnswered] = useState(false);
    const [pending, setPending] = useState(false);
    const [allPending, setAllPending] = useState(false);

    // حالات شاشة إعادة الإرسال
    const [isResendModalOpen, setIsResendModalOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);

    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [favorites, setFavorites] = useState([]);
    const [resendNewAttachments, setResendNewAttachments] = useState([]); // مرفقات جديدة لإعادة الإرسال
    const [isResending, setIsResending] = useState(false);

    // إضافات إعادة الإرسال الجديدة
    const [situations, setSituations] = useState([]);
    const [selectedSituation, setSelectedSituation] = useState("");
    const [editableSubject, setEditableSubject] = useState("");
    const [selectedEmps, setSelectedEmps] = useState([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [attachmentSelection, setAttachmentSelection] = useState(null);

    const [isFiltersLoaded, setIsFiltersLoaded] = useState(false);

    // حالات التنبيه السريع
    const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
    const [notifMessage, setNotifMessage] = useState("");
    const [notifRecipients, setNotifRecipients] = useState([]); // مصفوفة مستلمين متعددين
    const [notifEmpSearch, setNotifEmpSearch] = useState(""); // بحث داخل المودال
    const [isSendingNotif, setIsSendingNotif] = useState(false);

    // حالات حذف التحويل
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteCheckLoading, setDeleteCheckLoading] = useState(false);
    const [deletionRecipients, setDeletionRecipients] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [resendAttachments, setResendAttachments] = useState([]); // للمستخدم 1714
    const [isUploading, setIsUploading] = useState(false);
    const [canDelete, setCanDelete] = useState(false);

    // حالات تعديل الورد وتحديث الـ PDF آلياً
    const [updatingDocs, setUpdatingDocs] = useState({}); // { docNo: true/false }
    const updatingDocsRef = useRef({});
    const pollingIntervals = useRef({});

    // حالات تعديل غرض المكاتبة
    const [isPurposeModalOpen, setIsPurposeModalOpen] = useState(false);
    const [purposeToUpdate, setPurposeToUpdate] = useState(null);
    const [purposeSubject, setPurposeSubject] = useState("");
    const [purposeAttachments, setPurposeAttachments] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]);
    const [newSituationId, setNewSituationId] = useState("");
    const [isUpdatingPurpose, setIsUpdatingPurpose] = useState(false);
    const [isPurposeUploading, setIsPurposeUploading] = useState(false);

    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [manageTab, setManageTab] = useState('edit'); // 'edit' | 'delete'
    const [manageLoading, setManageLoading] = useState(false); // لتحميل بيانات الحذف عند الفتح

    // حالات شاشة الإلحاق (Reply/Follow-up Mode)
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
    const [replyDocType, setReplyDocType] = useState("");
    const [replySubject, setReplySubject] = useState("");
    const [docKinds, setDocKinds] = useState([]);
    const [kindSearchTerm, setKindSearchTerm] = useState("");
    const [isCreatingReply, setIsCreatingReply] = useState(false);
    const [replySavedPath, setReplySavedPath] = useState(null);
    const [replyDocNo, setReplyDocNo] = useState(null);
    const [replyExistingAttachments, setReplyExistingAttachments] = useState([]);
    const [replyNewAttachments, setReplyNewAttachments] = useState([]);
    const [isArchivingReply, setIsArchivingReply] = useState(false);

    // دالة لتحديد نوع المكاتبة وإرجاع بيانات العرض
    const getMemoTypeInfo = (item) => {
        // لو فيها parentDocNo يبقى دي رد
        if (item.PARENT_DOC_NO || item.TRANS_TYPE === 3) {
            return {
                type: 'reply',
                label: 'رد',
                color: 'bg-purple-50 text-purple-600 border-purple-200',
                icon: <ArrowUpDown className="w-3 h-3 rotate-90" />
            };
        }
        // لو فيها تحويلات من عندها أو TRANS_TYPE = 2
        if (item.TRANS_TYPE === 2 || item.MY_TRANSFERS_COUNT > 0) {
            return {
                type: 'transfer',
                label: 'مُحولة',
                color: 'bg-blue-50 text-blue-600 border-blue-200',
                icon: <Send className="w-3 h-3" />
            };
        }
        // غير كده = مكاتبة منشأة أصلية
        return {
            type: 'original',
            label: 'منشأة',
            color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            icon: <FileText className="w-3 h-3" />
        };
    };
    // جلب بيانات المستخدم وتجهيز المفضلات الخاصة به
    useEffect(() => {
        const fetchUserAndFavs = async () => {
            try {
                const res = await fetch("/api/auth/me");
                const json = await res.json();
                if (json.success) {
                    setUser(json.user);
                    const savedFavorites = localStorage.getItem(`fav_employees_export_${json.user.empNum}`);
                    if (savedFavorites) {
                        setFavorites(JSON.parse(savedFavorites));
                    } else {
                        setFavorites([]);
                    }

                    setIsFiltersLoaded(true);
                }
            } catch (err) {
                console.error("Error fetching user session:", err);
                setIsFiltersLoaded(true);
            }
        };

        fetchUserAndFavs();
        fetchEmployees(); // جلب الموظفين لضمان عمل التنبيهات السريعة
    }, []);

    const toggleFavorite = (emp) => {
        // ✅ حماية إضافية
        if (!user || !user.empNum || !emp || !emp.EMP_NUM) {
            console.error("Invalid user or employee data");
            return;
        }

        let newFavs;
        if (favorites.some(f => f.EMP_NUM === emp.EMP_NUM)) {
            newFavs = favorites.filter(f => f.EMP_NUM !== emp.EMP_NUM);
        } else {
            newFavs = [...favorites, emp];
        }
        setFavorites(newFavs);

        try {
            localStorage.setItem(`fav_employees_export_${user.empNum}`, JSON.stringify(newFavs));
        } catch (err) {
            console.error("Error saving to localStorage:", err);
        }
    };

    const fetchEmployees = async () => {
        if (employees.length > 0) return;
        setLoadingEmployees(true);
        try {
            const res = await fetch("/api/import/transfer/employees");
            const json = await res.json();
            if (json.success) {
                const uniqueEmps = json.data.filter((v, i, a) => a.findIndex(t => t.EMP_NUM === v.EMP_NUM) === i);
                setEmployees(uniqueEmps);
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
        } finally {
            setLoadingEmployees(false);
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

    const handleOpenResend = (item) => {
        setSelectedDoc(item);
        setEditableSubject(item.SUBJECT);
        setSelectedEmps([]);
        setResendNewAttachments([]); // تصفير المرفقات عند كل مرة
        setIsResendModalOpen(true);
        fetchEmployees();
        fetchSituations();
    };

    const toggleEmpSelection = (emp) => {
        if (selectedEmps.some(e => e.EMP_NUM === emp.EMP_NUM)) {
            setSelectedEmps(selectedEmps.filter(e => e.EMP_NUM !== emp.EMP_NUM));
        } else {
            setSelectedEmps([...selectedEmps, {
                ...emp,
                customSubject: editableSubject,
                customSituation: selectedSituation
            }]);
        }
    };

    const updateEmpCustomData = (empNum, field, value) => {
        setSelectedEmps(selectedEmps.map(e =>
            e.EMP_NUM === empNum ? { ...e, [field]: value } : e
        ));
    };

    // في دالة executeResend
    const executeResend = async () => {
        if (!selectedDoc || selectedEmps.length === 0) return;
        setIsResending(true);

        try {
            let attachmentsData = [];

            // 1. رفع المرفقات الجديدة لو وجدت
            if (resendNewAttachments && resendNewAttachments.length > 0) {
                const formData = new FormData();
                formData.append("docNo", selectedDoc.DOC_NO);

                resendNewAttachments.forEach(att => {
                    formData.append("files", att.file);
                    formData.append("descriptions", att.desc || att.file.name);
                });

                const uploadRes = await fetch("/api/memo/upload", {
                    method: "POST",
                    body: formData
                });

                const uploadJson = await uploadRes.json();

                if (uploadJson.success) {
                    attachmentsData = uploadJson.attachments.map(att => ({
                        path: att.path,
                        desc: att.desc
                    }));
                } else {
                    throw new Error(uploadJson.error || "فشل رفع المرفقات");
                }
            }

            // 2. إرسال طلب إعادة الإرسال
            const res = await fetch("/api/export/resend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    docNo: selectedDoc.DOC_NO,
                    attachments: attachmentsData, // ✅ نرسل مصفوفة الكائنات
                    recipients: selectedEmps.map(e => ({
                        empNum: e.EMP_NUM,
                        situationId: e.customSituation || selectedSituation,
                        subject: e.customSubject || editableSubject
                    }))
                }),
            });

            const json = await res.json();

            if (json.success) {
                toast.success(`تم إعادة إرسال المكاتبة إلى ${selectedEmps.length} موظف بنجاح`);
                setIsResending(false);
                setIsResendModalOpen(false);
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
                    toast.error(json.error || "فشل الإرسال");
                }
            }
        } catch (err) {
            console.error("Resend Error:", err);
            toast.error(err.message || "حدث خطأ أثناء الاتصال بالسيرفر");
        } finally {
            setIsResending(false);
        }
    };

    // const handleDeleteCheck = async (docNo) => {
    //     setSelectedDoc(data.find(i => i.DOC_NO === docNo));
    //     setDeleteCheckLoading(true);
    //     setIsDeleteModalOpen(true);
    //     try {
    //         const res = await fetch(`/api/import/delete-transfer?docNo=${docNo}`);
    //         const json = await res.json();
    //         if (json.success) {
    //             setDeletionRecipients(json.recipients);
    //             setCanDelete(json.canDelete);
    //             if (json.hasAnswered) {
    //                 toast.error(json.message);
    //             }
    //         } else {
    //             toast.error(json.error || "فشل التحقق من المكاتبة");
    //             setIsDeleteModalOpen(false);
    //         }
    //     } catch (err) {
    //         toast.error("حدث خطأ أثناء الاتصال بالسيرفر");
    //         setIsDeleteModalOpen(false);
    //     } finally {
    //         setDeleteCheckLoading(false);
    //     }
    // };

    const handleDeleteRecipient = async (targetEmpNum) => {
        if (!selectedDoc) return;
        if (!confirm("هل أنت متأكد من حذف هذا التحويل لهذا الموظف فقط؟ سيتم حذف أي تحويلات فرعية قام بها أيضاً.")) return;

        setIsDeleting(true);
        try {
            const res = await fetch("/api/import/delete-transfer", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    docNo: selectedDoc.DOC_NO,
                    targetEmpNum: targetEmpNum
                }),
            });
            const json = await res.json();
            if (json.success) {
                toast.success(json.message);
                setDeletionRecipients(deletionRecipients.filter(r => r.empNum !== targetEmpNum));
                fetchData();
            } else {
                toast.error(json.error || "فشل حذف التحويل");
            }
        } catch (err) {
            toast.error("حدث خطأ أثناء الاتصال بالسيرفر");
        } finally {
            setIsDeleting(false);
        }
    };

    const executeDeletion = async () => {
        if (!selectedDoc || !canDelete) return;

        setIsDeleting(true);
        try {
            const res = await fetch("/api/import/delete-transfer", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ docNo: selectedDoc.DOC_NO }),
            });
            const json = await res.json();
            if (json.success) {
                toast.success(json.message || "تم حذف التحويلات بنجاح");
                setIsDeleteModalOpen(false);
                fetchData();
            } else {
                toast.error(json.error || "فشل عملية الحذف");
            }
        } catch (err) {
            toast.error("حدث خطأ أثناء الحذف");
        } finally {
            setIsDeleting(false);
        }
    };
    // ✅ دالة موحدة لفتح شاشة الإدارة (تعديل + حذف)
    const handleOpenManageModal = async (item) => {
        setSelectedDoc(item);
        setPurposeToUpdate(item);
        setPurposeSubject(item.SUBJECT || "");
        setPurposeAttachments([]);
        setNewSituationId("");

        // تجهيز المرفقات الموجودة للتعديل
        const attList = item.ATTACHMENTS_LIST !== undefined
            ? item.ATTACHMENTS_LIST
            : (item.FILE_ATTACH ? item.FILE_ATTACH.split('|').map(p => ({ FILE_PATH: p, FILE_DESC: p.split('\\').pop() })) : []);
        setExistingAttachments(attList);

        setIsManageModalOpen(true);
        setManageTab('edit'); // الافتراضي هو التعديل
        setManageLoading(true);

        // ✅ جلب بيانات الحذف في الخلفية دون فتح نافذة منفصلة
        try {
            const res = await fetch(`/api/import/delete-transfer?docNo=${item.DOC_NO}`);
            const json = await res.json();
            if (json.success) {
                setDeletionRecipients(json.recipients);
                setCanDelete(json.canDelete);
            }
        } catch (err) {
            console.error("Error fetching deletion data:", err);
        } finally {
            setManageLoading(false);
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
        setReplySubject(`الحاق على مكاتبة : ${item.SUBJECT || ''}`);
        setReplyDocType("");

        let initialAtts = [];
        if (item.FILE_NAME) initialAtts.push(item.FILE_NAME);

        if (item.ATTACHMENTS_LIST && item.ATTACHMENTS_LIST.length > 0) {
            const listPaths = item.ATTACHMENTS_LIST.map(a => a.FILE_PATH).filter(p => !!p);
            initialAtts = [...initialAtts, ...listPaths];
        } else if (item.FILE_ATTACH) {
            const existing = item.FILE_ATTACH.split('|').filter(a => !!a);
            initialAtts = [...initialAtts, ...existing];
        }

        setReplyExistingAttachments(Array.from(new Set(initialAtts)));
        setReplyNewAttachments([]);
        setSelectedEmps([]);

        setIsReplyModalOpen(true);
        // Ensure employees are fetched if not already
        if (employees.length === 0) {
            fetchEmployees();
        }
        // fetchSituations and docKinds are needed for the reply modal
        // assuming fetchSituations is defined somewhere or we use the pre-fetched ones
        if (situations.length === 0) {
            // Usually fetched on mount, but we ensure it's available
            const fetchSits = async () => {
                const res = await fetch("/api/situations");
                const json = await res.json();
                if (json.success) setSituations(json.data);
            };
            fetchSits();
        }
        fetchDocKinds();
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
                    transType: 3 // رد أو إلحاق
                })
            });

            const json = await res.json();
            if (json.success) {
                setReplyDocNo(json.docNo);
                setReplySavedPath(json.filePath);
                toast.success("تم إنشاء المسودة، جاري فتح الوورد للتعديل...");

                openFile(json.filePath, null);
            } else {
                toast.error(json.error || "فشل الإنشاء");
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

            const attachmentsArr = replyExistingAttachments.map(p => ({
                path: p,
                desc: p.split(/[\\\/]/).pop()
            }));

            if (finalUploadedAttachments.length > 0) {
                attachmentsArr.push(...finalUploadedAttachments);
            }

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
                toast.success("تم إرسال الإلحاق بنجاح");
                setIsReplyModalOpen(false);
                fetchData();

                openFile(json.pdfPath, replyDocNo);
            } else {
                toast.error(json.error || "فشل الأرشفة");
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
            const searchVal = options.search !== undefined ? options.search : searchQuery;
            const isAllPending = options.allPending !== undefined ? options.allPending : allPending;
            const isIncoming = options.incoming !== undefined ? options.incoming : incoming;
            const isInternal = options.internal !== undefined ? options.internal : internal;
            const isAnswered = options.answered !== undefined ? options.answered : answered;
            const isPending = options.pending !== undefined ? options.pending : pending;
            const fromD = options.fromDate !== undefined ? options.fromDate : fromDate;
            const toD = options.toDate !== undefined ? options.toDate : toDate;

            if (isAllPending) {
                params.append("allPending", "true");
            } else {
                if (fromD && toD) {
                    params.append("fromDate", fromD);
                    params.append("toDate", toD);
                }
                if (isIncoming) params.append("docCategory", "incoming");
                if (isInternal) params.append("docCategory", "internal");
                if (isAnswered) params.append("status", "answered");
                if (isPending) params.append("status", "pending");
            }
            if (searchVal) {
                params.append("search", searchVal);
            }

            const res = await fetch(`/api/export?${params.toString()}`);
            if (!res.ok) throw new Error("فشل في جلب البيانات من السيرفر");
            const json = await res.json();
            if (json.success) setData(json.data);
            else setError(json.error || "حدث خطأ أثناء جلب البيانات");
        } catch (err) {
            console.error("Fetch data error:", err);
            setError("فشل الاتصال بالسيرفر أو استجابة غير صالحة");
        } finally {
            setLoading(false);
        }
    };


    const handleRecipientClick = (name) => {
        setSearchQuery(name);
        fetchData({ search: name });
    };

    useEffect(() => {
        if (isFiltersLoaded) {
            fetchData();
        }
    }, [incoming, internal, answered, pending, allPending, isFiltersLoaded]);

    let filterText = "";
    if (incoming && answered) filterText = "عرض المكاتبات الصادرة الخارجية التي تم الرد عليها";
    else if (incoming && pending) filterText = "عرض المكاتبات الصادرة الخارجية الجاري الرد عليها";
    else if (incoming) filterText = "عرض جميع المكاتبات الصادرة الخارجية";
    else if (internal && answered) filterText = "عرض المكاتبات الصادرة الداخلية التي تم الرد عليها";
    else if (internal && pending) filterText = "عرض المكاتبات الصادرة الداخلية الجاري الرد عليها";
    else if (internal) filterText = "عرض المكاتبات الصادرة الداخلية";
    else if (answered) filterText = "عرض المكاتبات التي تم الرد عليها";
    else if (allPending) filterText = "عرض المكاتبات الجاري الرد عليها";
    else filterText = "عرض جميع المكاتبات الصادرة";

    const handleSearch = (e) => {
        e.preventDefault();
        fetchData();
    };

    const openFile = async (fileName, docNo, forceWord = false) => {
        if (!fileName) {
            toast.error("لا يوجد مسار ملف لهذه المكاتبة");
            return;
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
        if (!forceWord && (isPdf || isImage || !hasAnyExtension)) {
            let viewerPath = finalPath;
            if (!hasAnyExtension && !isPdf) {
                viewerPath += ".pdf";
            }
            const viewerUrl = `/pdf-viewer?file=${encodeURIComponent(viewerPath)}&docNo=${docNo || ''}`;
            window.open(viewerUrl, '_blank');
            return;
        }

        // 2. للملفات الأخرى (وورد، إكسيل، إلخ)، نستخدم نظام الفتح المحلي للملفات
        toast.info("جاري محاولة فتح الملف  ...");
        try {
            const res = await fetch("/api/memo/open-local", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: finalPath })
            });
            const json = await res.json();

            if (json.success) {
                if (json.isRemote) {
                    window.location.href = `aoi-open:${json.resolvedPath || finalPath}`;
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
            const json = await res.json();
            if (json.success) {
                toast.success("تم إغلاق المكاتبة وحمايتها بنجاح");
                fetchData();
            } else {
                toast.error(json.error || "فشل إغلاق المكاتبة");
            }
        } catch (err) {
            console.error("Lock error:", err);
            toast.error("حدث خطأ أثناء الاتصال بالسيرفر");
        }
    };

    const handleUpdatePurpose = async () => {
        if (!purposeToUpdate) return;

        // التأكد من وجود تغيير واحد على الأقل
        const hasChanges =
            newSituationId ||
            purposeSubject !== (purposeToUpdate.SUBJECT || "") ||
            purposeAttachments.length > 0 ||
            existingAttachments.length !== (purposeToUpdate.FILE_ATTACH ? purposeToUpdate.FILE_ATTACH.split('|').filter(Boolean).length : 0);

        if (!hasChanges) {
            toast.error("لم تقم بأي تعديل");
            return;
        }

        setIsUpdatingPurpose(true);
        setIsPurposeUploading(true);

        const formData = new FormData();
        formData.append("docNo", purposeToUpdate.DOC_NO);

        if (newSituationId) {
            formData.append("newPurpose", newSituationId);
        }

        formData.append("subject", purposeSubject);

        // إرسال المرفقات التي تم الإبقاء عليها (المسارات فقط)
        existingAttachments.forEach(att => formData.append("keptAttachments", att.FILE_PATH));

        // إرسال المرفقات الجديدة (ملفات وأوصاف)
        purposeAttachments.forEach(att => {
            formData.append("attachments", att.file);
            formData.append("descriptions", att.desc || att.file.name);
        });

        // إشارة للباك اند أننا ندير المرفقات حالياً (لمعالجة حالة حذف الكل)
        formData.append("manageAttachments", "true");

        try {
            const res = await fetch("/api/export/update-purpose", {
                method: "POST",
                body: formData,
            });
            const json = await res.json();
            if (json.success) {
                toast.success("تم تحديث المكاتبة بنجاح");
                setIsPurposeModalOpen(false);
                fetchData(); // إعادة تحميل البيانات
            } else {
                toast.error(json.error || "فشل التحديث");
            }
        } catch (err) {
            toast.error("حدث خطأ أثناء الاتصال بالسيرفر");
        } finally {
            setIsUpdatingPurpose(false);
            setIsPurposeUploading(false);
        }
    };

    const handleUpdatePdf = async (docNo, quiet = false) => {
        if (!quiet && !confirm("هل أنت متأكد من رغبتك في تحديث الـ PDF؟ سيتم استبدال الملف الحالي بالنسخة الجديدة من الورد وإرسال إشعار للمستلمين.")) return;

        setUpdatingDocs(prev => ({ ...prev, [docNo]: true }));
        updatingDocsRef.current[docNo] = true;
        try {
            const res = await fetch("/api/memo/update-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ docNo }),
            });
            const json = await res.json();
            if (json.success) {
                if (!quiet) toast.success(json.message || "تم التحديث بنجاح");
                else toast.success(`✅ تم تحديث مكاتبة رقم ${docNo} تلقائياً بعد حفظك لملف الورد`);

                fetchData();
            } else {
                if (!quiet) toast.error(json.error || "فشل التحديث");
            }
        } catch (err) {
            console.error("Update error:", err);
            if (!quiet) toast.error("حدث خطأ أثناء الاتصال بالسيرفر");
        } finally {
            setUpdatingDocs(prev => ({ ...prev, [docNo]: false }));
            updatingDocsRef.current[docNo] = false;
        }
    };

    const startPolling = async (docNo) => {
        try {
            const res = await fetch(`/api/memo/update-pdf/check?docNo=${docNo}&_t=${Date.now()}`);
            const json = await res.json();
            if (json.success) {
                let currentWordMtime = json.wordMtime;
                let currentPdfMtime = json.pdfMtime;

                if (pollingIntervals.current[docNo]) clearInterval(pollingIntervals.current[docNo]);

                pollingIntervals.current[docNo] = setInterval(async () => {
                    if (updatingDocsRef.current[docNo]) return;

                    try {
                        const checkRes = await fetch(`/api/memo/update-pdf/check?docNo=${docNo}&_t=${Date.now()}`);
                        const checkJson = await checkRes.json();

                        if (checkJson.success) {
                            if (checkJson.wordMtime > currentWordMtime) {
                                console.log(`Detected Word change in doc ${docNo}, updating PDF...`);
                                currentWordMtime = checkJson.wordMtime;
                                await handleUpdatePdf(docNo, true);

                                // مزامنة الـ PDF لتجنب التنبيه المزدوج
                                const syncRes = await fetch(`/api/memo/update-pdf/check?docNo=${docNo}`);
                                const syncJson = await syncRes.json();
                                if (syncJson.success) currentPdfMtime = syncJson.pdfMtime;
                            }
                            else if (checkJson.pdfMtime > currentPdfMtime) {
                                console.log(`Detected PDF change in doc ${docNo}, notifying...`);
                                currentPdfMtime = checkJson.pdfMtime;

                                await fetch("/api/memo/update-pdf", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ docNo, onlyNotify: true }),
                                });
                                toast.success(`✅ تم تحديث ملف الـ PDF للمكاتبة رقم ${docNo} وإخطار المستلمين`);
                            }
                        }
                    } catch (e) { console.error("Polling error:", e); }
                }, 4000);
            }
        } catch (e) { console.error("Start polling error:", e); }
    };

    const stopPolling = (docNo) => {
        if (pollingIntervals.current[docNo]) {
            clearInterval(pollingIntervals.current[docNo]);
            delete pollingIntervals.current[docNo];
        }
    };

    // تنظيف جميع الـ intervals عند إغلاق الصفحة
    useEffect(() => {
        return () => {
            Object.values(pollingIntervals.current).forEach(clearInterval);
        };
    }, []);

    const [showRecipientsDetail, setShowRecipientsDetail] = useState(false);

    const recipientsStats = data.reduce((acc, item) => {
        const recipient = item.GEHA_NAME || "جهة غير معروفة";
        const sector = item.GEHA_SEC || "بدون قطاع";
        if (!acc[recipient]) {
            acc[recipient] = { count: 1, sector: sector };
        } else {
            acc[recipient].count++;
        }
        return acc;
    }, {});
    const recipientsCount = Object.keys(recipientsStats).length;

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-slate-50/50 pb-12 rtl">
            <div className="bg-white border-b shadow-sm sticky top-[65px] z-30">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-600 rounded-xl shadow-lg shadow-emerald-200">
                                    <Send className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-slate-900 leading-tight"> الصادر</h1>
                                    <p className="text-slate-400 text-sm font-medium">{filterText}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setAllPending(!allPending);
                                    if (!allPending) {
                                        setIncoming(false); setInternal(false); setAnswered(false); setPending(false);
                                    }
                                }}
                                className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 border-2 ${allPending
                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-200 scale-105"
                                    : "bg-white border-slate-100 text-slate-600 hover:border-emerald-200 hover:bg-slate-50"
                                    }`}
                            >
                                <Clock className={`w-5 h-5 ${allPending ? "animate-pulse" : ""}`} />
                                <span className="font-bold whitespace-nowrap">كل الصادر الجاري الرد عليه</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
                            <div className="lg:col-span-4 flex flex-wrap gap-4">
                                <div className="flex flex-col gap-1.5 flex-1 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50 shadow-sm transition-all hover:shadow-md">
                                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mr-1">نوع المكاتبة</label>
                                    <div className="flex p-1 bg-emerald-200/30 rounded-xl gap-1">
                                        <button
                                            onClick={() => { setIncoming(!incoming); setInternal(false); setAllPending(false); }}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${incoming ? "bg-emerald-600 text-white shadow-sm scale-[1.02]" : "text-emerald-400 hover:text-emerald-600"}`}
                                        >خارجي</button>
                                        <button
                                            onClick={() => { setInternal(!internal); setIncoming(false); setAllPending(false); }}
                                            className={`flex-1 py-1 px-3 rounded-lg text-sm font-bold transition-all ${internal ? "bg-blue-600 text-white shadow-sm scale-[1.02]" : "text-emerald-400 hover:text-emerald-600"}`}
                                        >داخلي</button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 flex-1 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50 shadow-sm transition-all hover:shadow-md">
                                    <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mr-1">حالة الرد</label>
                                    <div className="flex p-1 bg-indigo-200/30 rounded-xl gap-1">
                                        <button
                                            onClick={() => { setPending(!pending); setAnswered(false); setAllPending(false); }}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${pending ? "bg-red-600 text-black shadow-sm scale-[1.02]" : "text-indigo-400 hover:text-indigo-600"}`}
                                        >جاري</button>
                                        <button
                                            onClick={() => { setAnswered(!answered); setPending(false); setAllPending(false); }}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${answered ? "bg-green-600 text-black shadow-sm scale-[1.02]" : "text-indigo-400 hover:text-indigo-600"}`}
                                        >تم</button>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-8 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                <form onSubmit={handleSearch} className="flex flex-wrap md:flex-nowrap gap-3 items-end">
                                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">من تاريخ</label>
                                        <Input
                                            type="date"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            disabled={allPending}
                                            className="h-11 pr-5 bg-white border-slate-200 rounded-xl disabled:opacity-50 text-sm font-bold shadow-sm"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">إلى تاريخ</label>
                                        <Input
                                            type="date"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            disabled={allPending}
                                            className="h-11 pr-5 bg-white border-slate-200 rounded-xl disabled:opacity-50 text-sm font-bold shadow-sm"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">بحث نصي</label>
                                        <div className="relative">
                                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                placeholder="رقم المكاتبة أو الموضوع..."
                                                className="h-11 pr-10 bg-white border-slate-200 rounded-xl text-sm font-bold shadow-sm"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        className="h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        <span className="font-bold">تطبيق</span>
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[80vw] mx-auto px-6 mt-8">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 mb-6">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <Card className="border-none shadow-2xl overflow-hidden bg-white/80 backdrop-blur-md rounded-3xl border border-white/20">
                    <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 py-6 px-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                                    <Send className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold text-white">نتائج الصادر</CardTitle>
                                    <p className="text-slate-400 text-sm mt-0.5">تم العثور على {data.length} مكاتبة صادرة</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <div
                                    onClick={() => setShowRecipientsDetail(!showRecipientsDetail)}
                                    className="flex items-center gap-3 bg-white/5 p-2 pr-4 rounded-2xl border border-white/10 backdrop-blur-sm cursor-pointer hover:bg-white/10 transition-all group"
                                >
                                    <span className="text-white/60 text-sm">إجمالي الجهات المستلمة:</span>
                                    <Badge className="bg-emerald-500 text-white border-none px-3 py-1 text-sm font-bold transition-transform">
                                        {recipientsCount} جهة
                                    </Badge>
                                    <div className={`transition-transform duration-300 ${showRecipientsDetail ? 'rotate-180' : ''}`}>
                                        <ChevronDown className="w-4 h-4 text-white/40" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {showRecipientsDetail && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                                {Object.entries(recipientsStats).map(([name, stats]) => (
                                    <div
                                        key={name}
                                        onClick={() => handleRecipientClick(name)}
                                        className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2 backdrop-blur-sm group hover:bg-white/10 transition-all cursor-pointer hover:border-emerald-500/50"
                                    >
                                        <div className="flex items-start justify-between">
                                            <h4 className="text-white font-bold text-sm leading-tight group-hover:text-emerald-400 transition-colors">{name}</h4>
                                            <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 font-black text-[10px]">
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
                                        <th className="px-6 py-5">المستلم</th>
                                        <th className="px-6 py-5">الحالة</th>
                                        <th className="px-6 py-5">المطلوب</th>
                                        <th className="px-6 py-5 text-center">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="py-24 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                                                    <span className="text-slate-400 font-bold">جاري استدعاء البيانات...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : data.length > 0 ? (
                                        data.map((item, index) => (
                                            <tr
                                                key={`${item.DOC_NO}-${index}`}
                                                className="hover:bg-emerald-50/50 transition-all duration-200 group cursor-pointer animate-in fade-in"
                                            >
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className={`font-black text-[9px] shrink-0 ${getMemoTypeInfo(item).color}`}>
                                                                {getMemoTypeInfo(item).icon}
                                                                <span className="mr-1">{getMemoTypeInfo(item).label}</span>
                                                            </Badge>
                                                            {item.FLAG === 2 && <Lock className="w-4 h-4 text-red-500" title="مغلق" />}
                                                            <span className="font-black text-slate-700 text-lg group-hover:text-emerald-600 transition-colors">{item.DOC_NO}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 text-right font-bold text-slate-600">
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
                                                    <p className="font-black text-slate-800 leading-relaxed line-clamp-2">{item.SUBJECT}</p>
                                                    <Badge variant="outline" className="mt-1 text-[10px] border-slate-200 text-slate-400">{item.DOC_DESC_A}</Badge>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex flex-col gap-2">
                                                        {item.GEHA_NAME?.split(' | ').map((name, i) => {
                                                            const seenFlag = item.GEHA_SEEN_FLAGS?.split(' | ')[i];
                                                            const seenDate = item.GEHA_SEEN_DATES?.split(' | ')[i];
                                                            return (
                                                                <div key={i} className="flex items-start justify-between border-b border-slate-50 last:border-0 pb-1.5 last:pb-0 gap-4">
                                                                    <div className="flex flex-col leading-tight min-w-0">
                                                                        <span className="font-bold text-slate-700 text-xs truncate">{name}</span>
                                                                        <span className="text-[9px] text-slate-400 truncate">{item.GEHA_SEC?.split(' | ')[i] || '-'}</span>
                                                                    </div>
                                                                    {seenFlag === "1" && seenDate !== "N/A" && (
                                                                        <div className="flex items-center gap-1 text-[9px] font-bold text-blue-500 bg-blue-50/50 px-1.5 py-0.5 rounded-md border border-blue-100/50 shrink-0 self-center">
                                                                            <Clock className="w-2.5 h-2.5" />
                                                                            <span>{seenDate}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        {!item.GEHA_NAME && <span className="text-slate-400">-</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex flex-col items-center gap-1.5 min-w-[100px]">
                                                        <Badge className={`font-black px-3 py-1 rounded-full text-[10px] w-full justify-center ${item.ANSERED === 1 ? "bg-emerald-50 text-emerald-600 border-none" : "bg-amber-50 text-amber-600 border-none"}`}>
                                                            {item.ANSERED_DESC}
                                                        </Badge>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className="text-xs font-bold text-slate-500">{item.SITUATION_DESC || '-'}</span>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {(() => {
                                                            const notifButton = (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-9 w-9 p-0 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors relative"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedDoc(item);

                                                                        // استخراج المستلمين الأصليين (GEHA_C قد يحتوي على أكثر من كود مفصولة بـ ' | ')
                                                                        let initialRecipients = [];
                                                                        if (item.GEHA_C) {
                                                                            const codes = String(item.GEHA_C).split(/[,|]/).map(c => c.trim()).filter(Boolean);
                                                                            initialRecipients = employees.filter(emp =>
                                                                                codes.includes(emp.EMP_NUM.toString())
                                                                            );
                                                                        }
                                                                        // كخطة بديلة: جلب من GEHA_NAME إذا لم يُعثر على أحد
                                                                        if (initialRecipients.length === 0 && item.GEHA_C) {
                                                                            const singleEmp = employees.find(emp =>
                                                                                emp.EMP_NUM.toString() === item.GEHA_C.toString()
                                                                            );
                                                                            if (singleEmp) initialRecipients = [singleEmp];
                                                                        }

                                                                        setNotifRecipients(initialRecipients);
                                                                        setIsNotifModalOpen(true);
                                                                        setNotifMessage(`بخصوص المكاتبة رقم: ${item.DOC_NO}`);
                                                                        setNotifEmpSearch("");
                                                                    }}
                                                                    title="إرسال تنبيه"
                                                                >
                                                                    <Bell className="w-4 h-4" />
                                                                    {(item.NOTIFS_SENT_STR || item.NOTIFS_RECEIVED_STR) && (
                                                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                                                                    )}
                                                                </Button>
                                                            );

                                                            if (item.NOTIFS_SENT_STR || item.NOTIFS_RECEIVED_STR) {
                                                                return (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            {notifButton}
                                                                        </TooltipTrigger>
                                                                        <TooltipContent className="bg-slate-900 text-white border-slate-800 p-4 rounded-3xl shadow-2xl max-w-xs z-[300]" side="top" sideOffset={10}>
                                                                            <div className="space-y-4 text-right" dir="rtl">
                                                                                {item.NOTIFS_RECEIVED_STR && (
                                                                                    <>
                                                                                        <div className="flex items-center gap-2 border-b border-indigo-500/30 pb-3">
                                                                                            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                                                                                                <Bell className="w-4 h-4 text-indigo-400" />
                                                                                            </div>
                                                                                            <span className="font-black text-sm text-indigo-100">رسائل تنبيه واردة</span>
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                                                                            {item.NOTIFS_RECEIVED_STR.split(' | ').filter(n => n.trim()).map((notif, rIdx) => {
                                                                                                const parts = notif.split(' : ');
                                                                                                const nameAndDate = parts[0];
                                                                                                const msg = parts[1] || '';
                                                                                                return (
                                                                                                    <div key={rIdx} className="flex flex-col gap-1 py-0.5 border-b border-slate-700/50 last:border-0 pb-2">
                                                                                                        <span className="text-xs font-bold tracking-tight text-indigo-300">
                                                                                                            {nameAndDate}
                                                                                                        </span>
                                                                                                        {msg && <span className="text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap">{msg}</span>}
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                                {item.NOTIFS_SENT_STR && (
                                                                                    <>
                                                                                        <div className="flex items-center gap-2 border-b border-rose-500/30 pb-3 pt-2">
                                                                                            <div className="p-1.5 bg-rose-500/20 rounded-lg">
                                                                                                <Send className="w-4 h-4 text-rose-400" />
                                                                                            </div>
                                                                                            <span className="font-black text-sm text-rose-100">رسائل تنبيه مرسلة مني</span>
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                                                                            {item.NOTIFS_SENT_STR.split(' | ').filter(n => n.trim()).map((notif, rIdx) => {
                                                                                                const parts = notif.split(' : ');
                                                                                                const nameAndDate = parts[0];
                                                                                                const msg = parts[1] || '';
                                                                                                return (
                                                                                                    <div key={rIdx} className="flex flex-col gap-1 py-0.5 border-b border-slate-700/50 last:border-0 pb-2">
                                                                                                        <span className="text-xs font-bold tracking-tight text-rose-300">
                                                                                                            {nameAndDate}
                                                                                                        </span>
                                                                                                        {msg && <span className="text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap">{msg}</span>}
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                );
                                                            }
                                                            return notifButton;
                                                        })()}
                                                        {item.FILE_NAME && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-9 w-9 p-0 rounded-xl text-amber-600 hover:bg-amber-50"
                                                                    onClick={(e) => { e.stopPropagation(); openFile(item.FILE_NAME, item.DOC_NO); }}
                                                                    title="عرض الملف"
                                                                >
                                                                    <FileText className="w-4 h-4" />
                                                                </Button>
                                                                {(item.TRANS_TYPE === 1 || item.TRANS_TYPE === 3) && (
                                                                    <div className="flex gap-1 border-x border-slate-100 px-2 mx-1">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className={`h-9 w-9 p-0 rounded-xl transition-all ${pollingIntervals.current[item.DOC_NO] ? 'bg-amber-100 text-amber-600 animate-pulse' : 'text-slate-500 hover:bg-slate-100'}`}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (!confirm("تنبيه: سيتم فقد أي إمضاءات أو توقيعات موجودة على المكاتبة بمجرد تعديل ملف الوورد وحفظه. هل تريد الاستمرار؟")) return;
                                                                                const rawPath = item.FILE_NAME.split('|')[0].trim();
                                                                                openFile(rawPath, item.DOC_NO, true);

                                                                                // بدء المراقبة الآلية
                                                                                startPolling(item.DOC_NO);
                                                                                toast.info("جاري مراقبة ملف الورد... سيتم تحديث الـ PDF فور قيامك بالحفظ في الوورد");
                                                                            }}
                                                                            title={pollingIntervals.current[item.DOC_NO] ? "جاري مراقبة التعديلات..." : "تعديل ملف الورد"}
                                                                        >
                                                                            {updatingDocs[item.DOC_NO] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                                                                        </Button>
                                                                        {/* {pollingIntervals.current[item.DOC_NO] && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-9 w-9 p-0 rounded-xl text-red-400 hover:bg-red-50"
                                                                                onClick={(e) => { e.stopPropagation(); stopPolling(item.DOC_NO); toast.info("تم إيقاف المراقبة الآلية"); }}
                                                                                title="إيقاف المراقبة الآلية"
                                                                            >
                                                                                <X className="w-4 h-4" />
                                                                            </Button>
                                                                        )} */}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                        {((item.ATTACHMENTS_LIST !== undefined ? item.ATTACHMENTS_LIST.length > 0 : !!item.FILE_ATTACH)) && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-9 w-9 p-0 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
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
                                                            className="h-9 w-9 p-0 rounded-xl text-amber-500 hover:bg-amber-50"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenManageModal(item); // ✅ الدالة الموحدة
                                                            }}
                                                            title="إدارة المكاتبة (تعديل/حذف)"
                                                        >
                                                            <RefreshCcw className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 w-9 p-0 rounded-xl text-blue-600 hover:bg-blue-50"
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
                                                            className="h-9 w-9 p-0 rounded-xl text-emerald-600 hover:bg-emerald-50"
                                                            onClick={(e) => { e.stopPropagation(); handleOpenResend(item); }}
                                                            title="إعادة إرسال"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 w-9 p-0 rounded-xl text-purple-600 hover:bg-purple-50 transition-colors"
                                                            onClick={(e) => { e.stopPropagation(); handleOpenReply(item); }}
                                                            title="إلحاق بالمكاتبة"
                                                        >
                                                            <ArrowUpDown className="w-4 h-4 rotate-90" />
                                                        </Button>
                                                        {/* <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 w-9 p-0 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteCheck(item.DOC_NO); }}
                                                            title="إلغاء وحذف التحويلات الصادرة"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button> */}
                                                        {/* {AUTHORIZED_LOCKERS.includes(String(user?.empNum || "")) && item.FLAG !== 2 && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
                                                                onClick={(e) => { e.stopPropagation(); handleLock(item.DOC_NO); }}
                                                                title="حماية الملف وإغلاقه"
                                                            >
                                                                <Unlock className="w-4 h-4" />
                                                            </Button>
                                                        )} */}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="py-32 text-center text-slate-400">
                                                <div className="flex flex-col items-center gap-4 bg-slate-50/50 p-12 rounded-[40px] border border-dashed border-slate-200 mx-6">
                                                    <Search className="w-12 h-12 opacity-10" />
                                                    <p className="text-lg font-black text-slate-800">لا توجد مكاتبات صادرة حالياً</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Resend Modal */}
            {isResendModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div onClick={() => setIsResendModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                    <div className="relative bg-white w-full max-w-7xl rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="bg-slate-900 p-6 text-white relative">
                            <button onClick={() => setIsResendModalOpen(false)} className="absolute left-6 top-6 p-2 rounded-full bg-white/10 hover:bg-white/20">
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
                                    <RotateCcw className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white">إعادة إرسال المكاتبة</h2>
                                    <p className="text-slate-400 text-sm font-medium">اختر الشخص الموجه إليه المكاتبة</p>
                                </div>
                            </div>
                            {selectedDoc && (
                                <div className="bg-white/5 p-4 rounded-[24px] border border-white/10 backdrop-blur-md">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-right" dir="rtl">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-emerald-400 font-black text-xs uppercase tracking-wider">رقم المكاتبة</span>
                                            <span className="text-xl font-black text-white">{selectedDoc.DOC_NO}</span>
                                        </div>
                                        <div className="flex-1 md:mx-6">
                                            <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider block mb-1">الموضوع</span>
                                            <p className="text-white font-bold text-sm line-clamp-2">{selectedDoc.SUBJECT}</p>
                                        </div>
                                        <div className="flex gap-2 self-end">
                                            {selectedDoc.FILE_NAME && (
                                                <Button size="sm" variant="outline" className="h-9 bg-emerald-600/20 border-emerald-600 text-emerald-300 hover:bg-emerald-600 hover:text-white rounded-xl font-bold gap-2"
                                                    onClick={() => openFile(selectedDoc.FILE_NAME, selectedDoc.DOC_NO)}>
                                                    <FileText className="w-4 h-4" /> عرض المكاتبة
                                                </Button>
                                            )}
                                            {selectedDoc.FILE_ATTACH && (
                                                <Button size="sm" variant="outline" className="h-9 bg-blue-600/20 border-blue-600 text-blue-300 hover:bg-blue-600 hover:text-white rounded-xl font-bold gap-2"
                                                    onClick={() => {
                                                        const atts = selectedDoc.FILE_ATTACH.split('|');
                                                        if (atts.length > 1) {
                                                            setAttachmentSelection({ docNo: selectedDoc.DOC_NO, attachments: atts });
                                                        } else {
                                                            openFile(selectedDoc.FILE_ATTACH, selectedDoc.DOC_NO);
                                                        }
                                                    }}>
                                                    <Paperclip className="w-4 h-4" /> المرفقات
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-col gap-3">
                                        <Input value={editableSubject} onChange={(e) => setEditableSubject(e.target.value)}
                                            className="bg-white/10 border-white/20 text-white h-10 rounded-xl text-right placeholder:text-white/30"
                                            placeholder="تعديل الموضوع لإعادة الإرسال..." />
                                        <div className="flex items-center gap-4 bg-white/10 p-2 rounded-xl border border-white/10 overflow-hidden">
                                            <div className="flex flex-col flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Paperclip className="w-4 h-4 text-emerald-400" />
                                                    <span className="text-[10px] font-black text-white/60">إضافة مرفقات جديدة (اختياري)</span>
                                                </div>
                                                <input
                                                    type="file"
                                                    multiple
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files || []);
                                                        setResendNewAttachments(prev => [
                                                            ...prev,
                                                            ...files.map(f => ({ file: f, desc: f.name }))
                                                        ]);
                                                        e.target.value = null;
                                                    }}
                                                    className="text-[10px] text-white/80 mt-1 file:bg-emerald-600 file:border-none file:text-white file:px-2 file:py-0.5 file:rounded-md file:mr-2 file:cursor-pointer hover:file:bg-emerald-700"
                                                />
                                            </div>
                                            {resendNewAttachments.length > 0 && (
                                                <div className="flex flex-col gap-2 w-full mt-2 bg-emerald-900/40 p-3 rounded-xl border border-white/5">
                                                    {resendNewAttachments.map((att, idx) => (
                                                        <div key={idx} className="flex flex-col gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] text-emerald-300 font-bold truncate max-w-[200px]">{att.file.name}</span>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                                    onClick={() => setResendNewAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                            <Input
                                                                placeholder="وصف المرفق..."
                                                                value={att.desc}
                                                                onChange={(e) => {
                                                                    const newAtts = [...resendNewAttachments];
                                                                    newAtts[idx].desc = e.target.value;
                                                                    setResendNewAttachments(newAtts);
                                                                }}
                                                                className="h-8 bg-black/40 border-white/10 text-white text-[10px] rounded-lg"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Body */}
                        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6 bg-slate-50/50" dir="rtl">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                                {/* ✅ الجزء الأيمن: المفضلة + البحث - تم إصلاح الـ Grid */}
                                <div className="lg:col-span-7 flex flex-col gap-4">

                                    {/* ✅ قسم المفضلة - داخل العمود الصحيح */}
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
                                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                                : "border-slate-100 bg-white hover:border-emerald-200"
                                                                }`}
                                                        >
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                                                                }`}>
                                                                {fav.EMP_NAME?.charAt(0)}
                                                            </div>
                                                            <span className="text-xs font-bold truncate max-w-[120px]">{fav.EMP_NAME}</span>
                                                            {isSelected && <Check className="w-3 h-3 text-emerald-600" />}
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
                                                <Users className="w-5 h-5 text-emerald-600" />
                                                البحث والاختيار
                                            </h3>
                                            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full">
                                                <span className="text-[10px] font-black text-emerald-600">الافتراضي:</span>
                                                <select
                                                    value={selectedSituation}
                                                    onChange={(e) => setSelectedSituation(e.target.value)}
                                                    className="bg-transparent border-none text-[10px] font-black text-emerald-700 focus:ring-0 outline-none cursor-pointer"
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
                                                    emp && String(emp.EMP_NUM) !== String(user?.empNum) &&
                                                    (emp.EMP_NAME?.includes(employeeSearch) || emp.EMP_NUM?.toString().includes(employeeSearch))
                                                )
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
                                                                ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                                                                : "border-slate-50 bg-white hover:border-slate-200"
                                                                }`}
                                                        >
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); toggleFavorite(emp); }}
                                                                className={`absolute left-3 top-3 p-1.5 rounded-lg transition-colors ${isFavorite
                                                                    ? "text-amber-500 bg-amber-50"
                                                                    : "text-slate-300 hover:text-amber-500 hover:bg-slate-50"
                                                                    }`}
                                                                title={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                                                            >
                                                                <Star className={`w-3.5 h-3.5 ${isFavorite ? "fill-amber-500" : ""}`} />
                                                            </button>
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs transition-colors ${isSelected
                                                                    ? "bg-emerald-600 text-white"
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
                                                            {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                </div>

                                {/* الجزء الأيسر: إدارة المختارين والغرض */}
                                <div className="lg:col-span-5 flex flex-col gap-4">
                                    <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                                                <MessageCircle className="w-5 h-5 text-blue-600" />
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

                        {/* Footer */}
                        <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between shrink-0" dir="rtl">
                            <Button variant="ghost" onClick={() => setIsResendModalOpen(false)} className="rounded-xl font-bold">إغلاق</Button>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold text-slate-400">إجمالي المختارين: <span className="text-emerald-600">{selectedEmps.length}</span></span>
                                <Button
                                    disabled={selectedEmps.length === 0 || isResending}
                                    onClick={() => setIsConfirmOpen(true)}
                                    className="h-12 px-10 rounded-2xl font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                                >
                                    تأكيد الإرسال
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isConfirmOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsConfirmOpen(false)} />
                    <div className="relative bg-white w-full max-w-md rounded-[32px] p-8 text-center space-y-6" dir="rtl">
                        <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center"><AlertTriangle className="w-10 h-10 text-emerald-600 animate-bounce" /></div>
                        <div><h3 className="text-2xl font-black text-slate-900">تأكيد الإرسال</h3><p className="text-slate-500">هل أنت متأكد من إعادة إرسال هذه المكاتبة للعدد المختار؟</p></div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" onClick={() => setIsConfirmOpen(false)} className="flex-1 h-12 rounded-2xl">تراجع</Button>
                            <Button
                                onClick={executeResend}
                                disabled={isResending}
                                className="flex-1 h-12 rounded-2xl bg-slate-900 text-white font-black"
                            >
                                {isResending ? <Loader2 className="w-5 h-5 animate-spin" /> : "نعم، قم بالإرسال"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reply Modal */}
            {
                isReplyModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsReplyModalOpen(false)} />
                        <div className="relative bg-white w-full max-w-7xl rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
                            {/* Header */}
                            <div className="bg-purple-900 p-8 text-white relative">
                                <button onClick={() => setIsReplyModalOpen(false)} className="absolute left-8 top-8 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-4 bg-purple-600 rounded-2xl shadow-lg">
                                        <ArrowUpDown className="w-8 h-8 text-white rotate-90" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white">إلحاق على مكاتبة</h2>
                                        <p className="text-purple-200 text-sm font-medium">سيتم إنشاء مكاتبة جديدة ملحقة بالمستند الأصلي</p>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-6 rounded-[24px] border border-white/10 backdrop-blur-md">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-right" dir="rtl">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-purple-300 font-black text-[10px] uppercase tracking-widest">المكاتبة الأصلية</span>
                                            <span className="text-2xl font-black text-white">{selectedDoc?.DOC_NO}</span>
                                        </div>
                                        <div className="flex-1 md:mx-12">
                                            <span className="text-purple-300 font-bold text-[10px] uppercase tracking-widest block mb-1">موضوع الإلحاق</span>
                                            <Input
                                                value={replySubject}
                                                onChange={(e) => setReplySubject(e.target.value)}
                                                className="bg-white/10 border-white/20 text-white placeholder:text-white/20 h-14 rounded-2xl focus:ring-purple-500 font-black text-lg text-right"
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
                                                <Badge className="bg-purple-100 text-purple-600 border-none">1</Badge>
                                                <h3 className="font-black text-slate-800">اختر قالب المكاتبة</h3>
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
                                                {docKinds.map((kind, idx) => (
                                                    <button
                                                        key={`${kind.id}-${idx}`}
                                                        onClick={() => setReplyDocType(kind.id.toString())}
                                                        className={`p-4 rounded-2xl border-2 transition-all text-right group ${replyDocType === kind.id.toString() ? "bg-purple-600 border-purple-600 text-white shadow-lg scale-[0.98]" : "bg-white border-slate-100 hover:border-purple-200 text-slate-600"}`}
                                                    >
                                                        <p className="font-black text-sm">{kind.DOC_DESC_A}</p>
                                                        <p className={`text-[10px] uppercase font-bold ${replyDocType === kind.id.toString() ? "text-purple-100" : "text-slate-400"}`}>{kind.DOC_DESC}</p>
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
                                                <Badge className="bg-purple-100 text-purple-600 border-none">2</Badge>
                                                <h3 className="font-black text-slate-800">توجيه الإلحاق إلى</h3>
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
                                                    {employees.filter(e => e.EMP_NAME?.includes(employeeSearch) || e.EMP_NUM?.toString().includes(employeeSearch)).map(emp => (
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
                                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${emp.customSituation === sit.SITUATION_C.toString() ? "bg-purple-600 text-white shadow-md shadow-purple-100" : "bg-white text-slate-500 border border-slate-200 hover:border-purple-200"}`}
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
                                                    <Paperclip className="w-5 h-5 text-purple-400" />
                                                    <h3 className="font-black">مرفقات الإلحاق</h3>
                                                </div>
                                                <Badge className="bg-purple-500/20 text-purple-300 border-none px-3 font-black">
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
                                                            <Files className="w-4 h-4 text-purple-400 shrink-0" />
                                                            <span className="text-xs font-bold truncate opacity-70" dir="ltr">{path.split('\\').pop()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Search className="w-3 h-3 text-white/20 group-hover:text-purple-400 transition-colors" />
                                                            <Badge variant="outline" className="text-[8px] border-white/20 text-white/40">ملف أصلي</Badge>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* New Files */}
                                                {replyNewAttachments.map((file, idx) => (
                                                    <div key={`new-${idx}`} className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl animate-in slide-in-from-right-2 duration-300">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <Paperclip className="w-4 h-4 text-emerald-400 shrink-0" />
                                                            <span className="text-xs font-black truncate text-purple-100">{file.name}</span>
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
                                            className="h-16 px-12 bg-slate-900 hover:bg-purple-600 text-white rounded-[24px] font-black text-lg transition-all shadow-xl shadow-slate-200"
                                        >
                                            {isCreatingReply ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <FileText className="ml-2 h-5 w-5" />}
                                            إنشاء الإلحاق (Word)
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <Button
                                                onClick={() => openFile(replySavedPath, null)}
                                                className="h-16 px-8 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-[24px] font-black border-2 border-purple-100"
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
                                                إرسال الإلحاق النهائي
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-slate-400">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span className="text-sm font-bold">سيتم إرفاق المكاتبة الأصلية تلقائياً مع هذا الإلحاق</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal اختيار المرفقات (عند وجود مرفقات متعددة) */}
            {attachmentSelection && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setAttachmentSelection(null)} />
                    <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 bg-emerald-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Paperclip className="w-6 h-6 text-emerald-400" />
                                <h2 className="text-xl font-black text-white">اختر المرفق للعرض</h2>
                            </div>
                            <button onClick={() => setAttachmentSelection(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto bg-slate-50" dir="ltr">
                            {attachmentSelection.attachments.map((att, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        openFile(att.FILE_PATH, attachmentSelection.docNo);
                                        setAttachmentSelection(null);
                                    }}
                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 hover:border-emerald-500 hover:bg-emerald-50 transition-all group shadow-sm text-left"
                                    dir="rtl"
                                >
                                    <div className="p-2 bg-slate-50 group-hover:bg-emerald-100 rounded-xl transition-colors">
                                        <Files className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                                    </div>
                                    <div className="flex-1 min-w-0 text-right">
                                        <p className="font-bold text-slate-700 truncate">{att.FILE_DESC || att.FILE_PATH.split('\\').pop()}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">مرفق رقم {idx + 1}</p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-emerald-500" />
                                </button>
                            ))}
                        </div>
                        <div className="p-4 bg-white border-t border-slate-100 text-center">
                            <Button variant="ghost" onClick={() => setAttachmentSelection(null)} className="font-bold text-slate-500">إلغاء</Button>
                        </div>
                    </div>
                </div>
            )}


            {/* Modal إرسال تنبيه سريع - متعدد المستلمين */}
            {isNotifModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsNotifModalOpen(false)} />
                    <Card className="relative w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border-none animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Bell className="w-6 h-6 text-blue-400" />
                                <h2 className="text-xl font-black">إرسال تنبيه عن مكاتبة</h2>
                            </div>
                            <button onClick={() => setIsNotifModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <CardContent className="p-8 space-y-5 text-right" dir="rtl">
                            {/* معلومات المكاتبة */}
                            <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 flex flex-col gap-1">
                                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">المكاتبة المختارة (صادر)</p>
                                <p className="font-black text-emerald-900 leading-tight text-sm">{selectedDoc?.DOC_NO} — {selectedDoc?.SUBJECT}</p>
                            </div>

                            {/* التنبيهات السابقة (إن وجدت) */}
                            {(selectedDoc?.NOTIFS_SENT_STR || selectedDoc?.NOTIFS_RECEIVED_STR) && (
                                <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 flex flex-col gap-2">
                                    {selectedDoc?.NOTIFS_RECEIVED_STR && (
                                        <div className="flex flex-col gap-1.5 pb-2 border-b border-blue-200/50 last:border-0 last:pb-0">
                                            <div className="flex items-center gap-2">
                                                <Bell className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="text-xs font-black text-blue-900">رسائل تنبيه واردة لك</span>
                                            </div>
                                            <div className="flex flex-col gap-2 pr-5">
                                                {selectedDoc.NOTIFS_RECEIVED_STR.split(' | ').filter(n => n.trim()).map((notif, rIdx) => {
                                                    const parts = notif.split(' : ');
                                                    const nameAndDate = parts[0];
                                                    const msg = parts[1] || '';
                                                    return (
                                                        <div key={rIdx} className="flex flex-col gap-0.5">
                                                            <span className="text-[11px] font-bold text-blue-800">{nameAndDate}</span>
                                                            {msg && <span className="text-[11px] text-slate-600 bg-white/50 px-2 py-1 rounded-lg w-fit whitespace-pre-wrap">{msg}</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {selectedDoc?.NOTIFS_SENT_STR && (
                                        <div className="flex flex-col gap-1.5 pt-2 border-t border-blue-200/50 first:border-0 first:pt-0">
                                            <div className="flex items-center gap-2">
                                                <Send className="w-3.5 h-3.5 text-indigo-500" />
                                                <span className="text-xs font-black text-indigo-900">رسائل تنبيه مرسلة منك</span>
                                            </div>
                                            <div className="flex flex-col gap-2 pr-5">
                                                {selectedDoc.NOTIFS_SENT_STR.split(' | ').filter(n => n.trim()).map((notif, rIdx) => {
                                                    const parts = notif.split(' : ');
                                                    const nameAndDate = parts[0];
                                                    const msg = parts[1] || '';
                                                    return (
                                                        <div key={rIdx} className="flex flex-col gap-0.5">
                                                            <span className="text-[11px] font-bold text-indigo-800">{nameAndDate}</span>
                                                            {msg && <span className="text-[11px] text-slate-600 bg-white/50 px-2 py-1 rounded-lg w-fit whitespace-pre-wrap">{msg}</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}


                            {/* اختيار المستلمين */}
                            <div className="space-y-3">
                                <label className="text-sm font-black text-slate-700">المستلمون <span className="text-slate-400 font-bold text-xs">( يمكنك اختيار أكثر من شخص)</span></label>

                                {/* حقل البحث */}
                                <div className="relative">
                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="ابحث باسم أو رقم موظف لإضافته..."
                                        value={notifEmpSearch}
                                        onChange={(e) => setNotifEmpSearch(e.target.value)}
                                        className="h-12 pr-11 rounded-2xl border-2 border-slate-100 font-bold bg-slate-50 focus:border-blue-400 focus:ring-0"
                                    />
                                </div>

                                {/* نتائج البحث */}
                                {notifEmpSearch.trim() && (
                                    <div className="bg-white rounded-2xl max-h-[180px] overflow-y-auto border border-slate-100 shadow-lg divide-y divide-slate-50">
                                        {employees
                                            .filter(emp =>
                                                !notifRecipients.some(r => r.EMP_NUM === emp.EMP_NUM) &&
                                                (emp.EMP_NAME.includes(notifEmpSearch) || emp.EMP_NUM.toString().includes(notifEmpSearch))
                                            )
                                            .slice(0, 8)
                                            .map(emp => (
                                                <button
                                                    key={emp.EMP_NUM}
                                                    onClick={() => {
                                                        setNotifRecipients(prev => [...prev, emp]);
                                                        setNotifEmpSearch("");
                                                    }}
                                                    className="w-full px-4 py-3 text-right hover:bg-blue-50 font-bold text-sm transition-colors flex items-center justify-between"
                                                >
                                                    <span className="font-black text-slate-900">{emp.EMP_NAME}</span>
                                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">{emp.SEC_N}</span>
                                                </button>
                                            ))}
                                        {employees.filter(emp =>
                                            !notifRecipients.some(r => r.EMP_NUM === emp.EMP_NUM) &&
                                            (emp.EMP_NAME.includes(notifEmpSearch) || emp.EMP_NUM.toString().includes(notifEmpSearch))
                                        ).length === 0 && (
                                                <p className="text-center text-slate-400 font-bold text-sm py-4">لا توجد نتائج</p>
                                            )}
                                    </div>
                                )}

                                {/* الأشخاص المختارون (كـ tags) */}
                                {notifRecipients.length > 0 && (
                                    <div className="flex flex-wrap gap-2 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                                        {notifRecipients.map(emp => (
                                            <div
                                                key={emp.EMP_NUM}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[11px] font-bold animate-in zoom-in-50 duration-150"
                                            >
                                                <span>{emp.EMP_NAME}</span>
                                                <button
                                                    onClick={() => setNotifRecipients(prev => prev.filter(r => r.EMP_NUM !== emp.EMP_NUM))}
                                                    className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {notifRecipients.length === 0 && !notifEmpSearch && (
                                    <p className="text-slate-400 text-xs font-bold text-center py-2">لم يتم اختيار أي مستلم بعد — ابحث لإضافة أشخاص</p>
                                )}
                            </div>

                            {/* نص الرسالة */}
                            <div className="space-y-2">
                                <label className="text-sm font-black text-slate-700">محتوى الرسالة</label>
                                <textarea
                                    placeholder="اكتب ملاحظاتك..."
                                    value={notifMessage}
                                    onChange={(e) => setNotifMessage(e.target.value)}
                                    className="w-full min-h-[100px] p-4 rounded-2xl border-2 border-slate-100 font-bold focus:border-emerald-500 focus:ring-0 outline-none transition-all resize-none bg-slate-50/50"
                                />
                            </div>

                            {/* زر الإرسال */}
                            <Button
                                onClick={async () => {
                                    if (notifRecipients.length === 0 || !notifMessage.trim()) {
                                        toast.error("برجاء اختيار مستلم واحد على الأقل وكتابة الرسالة");
                                        return;
                                    }
                                    setIsSendingNotif(true);
                                    try {
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
                                            if (!json.success) throw new Error(json.error || "فشل أحد الإرسالات");
                                        }
                                        toast.success(`✅ تم إرسال التنبيه إلى ${notifRecipients.length} مستلم بنجاح`);
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
                                className="w-full h-14 rounded-[24px] bg-slate-900 hover:bg-emerald-600 text-white font-black text-base shadow-xl transition-all active:scale-95"
                            >
                                {isSendingNotif ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 ml-2" />
                                        إرسال التنبيه ({notifRecipients.length})
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ✅ النافذة الموحدة لإدارة المكاتبة (تعديل وحذف) */}
            {isManageModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => !manageLoading && setIsManageModalOpen(false)} />
                    <Card className="relative w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden border-none animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                        {/* Header */}
                        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    <RefreshCcw className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black">إدارة المكاتبة</h2>
                                    <p className="text-slate-400 text-xs font-medium">{selectedDoc?.DOC_NO}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsManageModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex border-b border-slate-100 bg-slate-50 shrink-0">
                            <button
                                onClick={() => setManageTab('edit')}
                                className={`flex-1 py-4 text-sm font-black flex items-center justify-center gap-2 transition-all ${manageTab === 'edit' ? 'bg-white text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                <RefreshCcw className="w-4 h-4" />
                                تعديل البيانات والمرفقات
                            </button>
                            <button
                                onClick={() => setManageTab('delete')}
                                className={`flex-1 py-4 text-sm font-black flex items-center justify-center gap-2 transition-all ${manageTab === 'delete' ? 'bg-white text-red-600 border-b-2 border-red-600' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                <Trash2 className="w-4 h-4" />
                                إدارة التحويلات والحذف
                            </button>
                        </div>

                        {/* Content Body */}
                        <CardContent className="p-6 overflow-y-auto custom-scrollbar" dir="rtl">
                            {manageLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
                                    <p className="text-slate-500 font-bold">جاري تحميل البيانات...</p>
                                </div>
                            ) : (
                                <>
                                    {/* ✅ تبويب التعديل */}
                                    {manageTab === 'edit' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 flex flex-col gap-2">
                                                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">بيانات المكاتبة</p>
                                                <p className="font-black text-emerald-900 line-clamp-1">{purposeToUpdate?.SUBJECT}</p>
                                            </div>

                                            {/* الغرض */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-black text-slate-700 mr-1">الغرض الجديد</label>
                                                <Select value={newSituationId} onValueChange={setNewSituationId}>
                                                    <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-bold bg-black">
                                                        <SelectValue placeholder="اختر الغرض..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {SITUATION_OPTIONS.map(opt => (
                                                            <SelectItem key={opt.id} value={opt.id.toString()} className="font-bold">{opt.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* الموضوع */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-black text-slate-700 mr-1">الموضوع الجديد (اختياري)</label>
                                                <Input value={purposeSubject} onChange={(e) => setPurposeSubject(e.target.value)} className="h-12 rounded-2xl border-slate-200 font-bold" />
                                            </div>

                                            {/* المرفقات الحالية */}
                                            {existingAttachments.length > 0 && (
                                                <div className="space-y-3">
                                                    <label className="text-sm font-black text-slate-700 mr-1 flex items-center gap-2">
                                                        <Paperclip className="w-4 h-4 text-amber-600" /> المرفقات الحالية
                                                    </label>
                                                    <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto p-1">
                                                        {existingAttachments.map((att, idx) => (
                                                            <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <Files className="w-4 h-4 text-slate-400" />
                                                                    <span className="text-xs font-bold text-slate-600 truncate">{att.FILE_DESC || att.FILE_PATH.split('\\').pop()}</span>
                                                                </div>
                                                                <Button size="sm" variant="ghost" onClick={() => setExistingAttachments(prev => prev.filter((_, i) => i !== idx))} className="h-8 w-8 p-0 text-red-400 hover:bg-red-50">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* إضافة مرفقات جديدة */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-black text-slate-700 mr-1">إضافة مرفقات جديدة</label>
                                                <div className="flex gap-2">
                                                    <Input type="file" multiple id="manage-file-input" className="hidden" onChange={(e) => {
                                                        const files = Array.from(e.target.files || []);
                                                        setPurposeAttachments(prev => [...prev, ...files.map(f => ({ file: f, desc: f.name }))]);
                                                        e.target.value = null;
                                                    }} />
                                                    <Button type="button" variant="outline" className="w-full h-12 rounded-2xl border-dashed border-2" onClick={() => document.getElementById('manage-file-input').click()}>
                                                        <Paperclip className="w-4 h-4 ml-2" /> اختر ملفات...
                                                    </Button>
                                                </div>
                                                {purposeAttachments.length > 0 && (
                                                    <div className="space-y-2 mt-2">
                                                        {purposeAttachments.map((att, idx) => (
                                                            <div key={idx} className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl flex items-center justify-between">
                                                                <span className="text-xs font-bold text-amber-800 truncate max-w-[200px]">{att.file.name}</span>
                                                                <Button size="sm" variant="ghost" onClick={() => setPurposeAttachments(prev => prev.filter((_, i) => i !== idx))} className="h-6 w-6 p-0 text-red-500"><X className="w-3 h-3" /></Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                                                <Button variant="outline" onClick={() => setIsManageModalOpen(false)} className="flex-1 h-14 rounded-2xl font-bold">إلغاء</Button>
                                                <Button onClick={handleUpdatePurpose} disabled={isUpdatingPurpose} className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black">
                                                    {isUpdatingPurpose ? <Loader2 className="w-6 h-6 animate-spin" /> : "حفظ التعديلات"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* ✅ تبويب الحذف */}
                                    {manageTab === 'delete' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-5 flex flex-col gap-3">
                                                <div className="flex items-center gap-2 text-red-600 bg-white p-3 rounded-xl border border-red-100">
                                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                                    <p className="text-sm font-black leading-tight">تنبيه: الحذف سيقوم بإزالة المكاتبة من قائمة الصادر عند المستلمين المحددين.</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h3 className="text-sm font-black text-slate-700 flex items-center justify-between">
                                                    <span className="flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600" /> قائمة المستلمين ({deletionRecipients.length})</span>
                                                    {deletionRecipients.length > 0 && canDelete && (
                                                        <Button size="sm" variant="destructive" onClick={() => { executeDeletion(); setIsManageModalOpen(false); }} disabled={isDeleting} className="h-8 text-xs rounded-lg">
                                                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "حذف الكل"}
                                                        </Button>
                                                    )}
                                                </h3>

                                                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                    {deletionRecipients.map((rec, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group/item hover:bg-white transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-black shadow-sm text-slate-500 border border-slate-100">
                                                                    {rec.empName.charAt(0)}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-bold text-slate-700">{rec.empName}</span>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <Badge className={`w-fit text-[8px] font-black ${rec.ansered === 1 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                                                            {rec.ansered === 1 ? "تم الرد" : "جاري الرد"}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Button size="sm" variant="ghost" onClick={() => handleDeleteRecipient(rec.empNum)} disabled={isDeleting} className="h-8 w-8 p-0 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    {deletionRecipients.length === 0 && (
                                                        <p className="text-center text-slate-400 py-8 text-sm font-bold bg-slate-50 rounded-xl">لا يوجد تحويلات صادرة لحذفها.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    </TooltipProvider>
    );
}
