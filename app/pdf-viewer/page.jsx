"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    FileSignature,
    Download,
    Loader2,
    AlertCircle,
    CheckCircle2,
    X,
    Move,
    Trash2,
    Save,
    RotateCcw,
    Type,
    Plus,
    Minus,
    Search,
    ChevronRight,
    ChevronLeft,
    Maximize2,
    Layers,
    Factory,
    Landmark,
    Building2,
    Briefcase,
    Wrench,
    Folder,
    Eye,
    Shield,
    Building,
    Users,
    UserCheck
} from "lucide-react";
import { toast } from "sonner";
import Draggable from "react-draggable";

const DEPARTMENT_DEFINITIONS = [
    {
        id: '1',
        key: 'deputy',
        label: 'نائب ر.م.ا',
        shortLabel: 'نائب ر.م.ا',
        desc: 'أختام وتأشيرات نائب رئيس مجلس الإدارة',
        icon: Landmark,
        color: 'indigo',
        badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-200 font-bold',
        activeBtn: 'bg-indigo-700 text-white shadow-md shadow-indigo-600/25',
        cardBg: 'from-indigo-50/90 via-white to-purple-50/40 hover:border-indigo-400 border-indigo-200 ring-1 ring-indigo-400/20',
        iconBg: 'bg-indigo-700 text-white',
        keywords: ['نائب', 'نائب ر.م.ا', 'نائب رئيس', 'deputy']
    },
    {
        id: '2',
        key: 'contracts',
        label: 'مستشار ر.م.ا للتعاقدات',
        shortLabel: 'التعاقدات',
        desc: 'أختام وتأشيرات مستشار ر.م.ا للتعاقدات',
        icon: Briefcase,
        color: 'purple',
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
        activeBtn: 'bg-purple-600 text-white shadow-md shadow-purple-500/25',
        cardBg: 'from-purple-50/80 to-white hover:border-purple-300 border-purple-100',
        iconBg: 'bg-purple-600 text-white',
        keywords: ['تعاقد', 'تعاقدات', 'عقود', 'contracts']
    },
    {
        id: '3',
        key: 'cameras',
        label: 'مستشار ر.م.ا للكاميرات',
        shortLabel: 'الكاميرات',
        desc: 'أختام وتأشيرات مستشار ر.م.ا للكاميرات',
        icon: Eye,
        color: 'indigo',
        badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        activeBtn: 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25',
        cardBg: 'from-indigo-50/80 to-white hover:border-indigo-300 border-indigo-100',
        iconBg: 'bg-indigo-600 text-white',
        keywords: ['كامير', 'كاميرات', 'camera', 'cameras', 'مراقبة']
    },
    {
        id: '4',
        key: 'research',
        label: 'البحوث والمشروعات',
        shortLabel: 'البحوث والمشروعات',
        desc: 'أختام وتأشيرات إدارة البحوث والمشروعات',
        icon: Layers,
        color: 'teal',
        badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
        activeBtn: 'bg-teal-600 text-white shadow-md shadow-teal-500/25',
        cardBg: 'from-teal-50/80 to-white hover:border-teal-300 border-teal-100',
        iconBg: 'bg-teal-600 text-white',
        keywords: ['بحوث', 'مشروع', 'مشروعات', 'research']
    },
    {
        id: '5',
        key: 'production',
        label: 'قطاع الإنتاج',
        shortLabel: 'الإنتاج',
        desc: 'أختام وتأشيرات قطاع الإنتاج',
        icon: Factory,
        color: 'blue',
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
        activeBtn: 'bg-blue-600 text-white shadow-md shadow-blue-500/25',
        cardBg: 'from-blue-50/80 to-white hover:border-blue-300 border-blue-100',
        iconBg: 'bg-blue-600 text-white',
        keywords: ['انتاج', 'إنتاج', 'production']
    },
    {
        id: '6',
        key: 'quality',
        label: 'قطاع الجودة',
        shortLabel: 'الجودة',
        desc: 'أختام وتأشيرات إدارة وتوكيد الجودة',
        icon: CheckCircle2,
        color: 'emerald',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        activeBtn: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25',
        cardBg: 'from-emerald-50/80 to-white hover:border-emerald-300 border-emerald-100',
        iconBg: 'bg-emerald-600 text-white',
        keywords: ['جود', 'جودة', 'quality']
    },
    {
        id: '7',
        key: 'finance',
        label: '  القطاع المالى ',
        shortLabel: 'المالي',
        desc: 'أختام وتأشيرات قطاع الشئون المالية والحسابات',
        icon: Landmark,
        color: 'emerald',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        activeBtn: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25',
        cardBg: 'from-emerald-50/80 to-white hover:border-emerald-300 border-emerald-100',
        iconBg: 'bg-emerald-600 text-white',
        keywords: ['مالي', 'مالية', 'حسابات', 'finance']
    },
    {
        id: '8',
        key: 'commercial',
        label: ' القطاع التجارى',
        shortLabel: 'التجاري',
        desc: 'أختام وتأشيرات قطاع الشئون التجارية',
        icon: Building2,
        color: 'cyan',
        badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        activeBtn: 'bg-cyan-600 text-white shadow-md shadow-cyan-500/25',
        cardBg: 'from-cyan-50/80 to-white hover:border-cyan-300 border-cyan-100',
        iconBg: 'bg-cyan-600 text-white',
        keywords: ['تجار', 'تجاري', 'تجارية', 'commercial']
    },
    {
        id: '9',
        key: 'marketing',
        label: 'الادارة العامة التسويق',
        shortLabel: 'التسويق',
        desc: 'أختام وتأشيرات إدارة التسويق والمبيعات',
        icon: Layers,
        color: 'rose',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
        activeBtn: 'bg-rose-600 text-white shadow-md shadow-rose-500/25',
        cardBg: 'from-rose-50/80 to-white hover:border-rose-300 border-rose-100',
        iconBg: 'bg-rose-600 text-white',
        keywords: ['تسويق', 'مبيعات', 'marketing']
    },
    {
        id: '10',
        key: 'security',
        label: 'إدارة الأمن',
        shortLabel: 'الأمن',
        desc: 'أختام وتأشيرات إدارة الأمن والحراسة',
        icon: Shield,
        color: 'red',
        badgeBg: 'bg-red-100 text-red-800 border-red-200',
        activeBtn: 'bg-red-600 text-white shadow-md shadow-red-500/25',
        cardBg: 'from-red-50/80 to-white hover:border-red-300 border-red-100',
        iconBg: 'bg-red-600 text-white',
        keywords: ['أمن', 'امن', 'حراسة', 'security']
    },
    {
        id: '11',
        key: 'admin',
        label: ' الشئون الادارية',
        shortLabel: 'الشئون الإدارية',
        desc: 'أختام وتأشيرات قطاع الشئون الإدارية',
        icon: Building,
        color: 'amber',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
        activeBtn: 'bg-amber-600 text-white shadow-md shadow-amber-500/25',
        cardBg: 'from-amber-50/80 to-white hover:border-amber-300 border-amber-100',
        iconBg: 'bg-amber-600 text-white',
        keywords: ['اداري', 'إداري', 'ادارية', 'إدارية']
    },
    {
        id: '12',
        key: 'hr',
        label: ' الموارد البشرية',
        shortLabel: 'الموارد البشرية',
        desc: 'أختام وتأشيرات الموارد البشرية وشئون العاملين',
        icon: Users,
        color: 'sky',
        badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
        activeBtn: 'bg-sky-600 text-white shadow-md shadow-sky-500/25',
        cardBg: 'from-sky-50/80 to-white hover:border-sky-300 border-sky-100',
        iconBg: 'bg-sky-600 text-white',
        keywords: ['موارد', 'بشرية', 'عاملين', 'شئون عاملين', 'hr']
    },
    {
        id: '13',
        key: 'it',
        label: 'إدارة نظم المعلومات',
        shortLabel: 'نظم المعلومات',
        desc: 'أختام وتأشيرات تكنولوجيا ونظم المعلومات',
        icon: Folder,
        color: 'blue',
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
        activeBtn: 'bg-blue-600 text-white shadow-md shadow-blue-500/25',
        cardBg: 'from-blue-50/80 to-white hover:border-blue-300 border-blue-100',
        iconBg: 'bg-blue-600 text-white',
        keywords: ['نظم', 'معلومات', 'it', 'حاسب', 'تكنولوجيا']
    },
    {
        id: '14',
        key: 'legal',
        label: 'الإدارة القانونية',
        shortLabel: 'القانونية',
        desc: 'أختام وتأشيرات الإدارة القانونية والتحقيقات',
        icon: Briefcase,
        color: 'slate',
        badgeBg: 'bg-slate-200 text-slate-800 border-slate-300',
        activeBtn: 'bg-slate-800 text-white shadow-md shadow-slate-600/25',
        cardBg: 'from-slate-100 to-white hover:border-slate-300 border-slate-200',
        iconBg: 'bg-slate-800 text-white',
        keywords: ['قانون', 'قانوني', 'قانونية', 'تحقيقات', 'legal']
    },
    {
        id: '15',
        key: 'pr',
        label: 'إدارة العلاقات العامة',
        shortLabel: 'العلاقات العامة',
        desc: 'أختام وتأشيرات إدارة العلاقات العامة والإعلام',
        icon: Layers,
        color: 'violet',
        badgeBg: 'bg-violet-100 text-violet-800 border-violet-200',
        activeBtn: 'bg-violet-600 text-white shadow-md shadow-violet-500/25',
        cardBg: 'from-violet-50/80 to-white hover:border-violet-300 border-violet-100',
        iconBg: 'bg-violet-600 text-white',
        keywords: ['علاقات', 'علاقات عامة', 'pr', 'إعلام', 'اعلام']
    },
    {
        id: '22',
        key: 'tech_office',
        label: 'المكتب الفني /المتابعه',
        shortLabel: 'المكتب الفني /المتابعه',
        desc: 'أختام وتأشيرات المكتب الفني / المتابعة',
        icon: FileSignature,
        color: 'orange',
        badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',
        activeBtn: 'bg-orange-600 text-white shadow-md shadow-orange-500/25',
        cardBg: 'from-orange-50/80 to-white hover:border-orange-300 border-orange-100',
        iconBg: 'bg-orange-600 text-white',
        keywords: ['مكتب فني', 'مكتب فنى', 'فني', 'فنى']
    },
    {
        id: '23',
        key: 'ayman',
        label: 'م. أيمن رشدي',
        shortLabel: 'م. أيمن رشدي',
        desc: 'أختام وتأشيرات م. أيمن رشدي',
        icon: UserCheck,
        color: 'emerald',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        activeBtn: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25',
        cardBg: 'from-emerald-50/80 to-white hover:border-emerald-300 border-emerald-100',
        iconBg: 'bg-emerald-600 text-white',
        keywords: ['ايمن', 'أيمن', 'رشدي', 'رشدى', 'ayman']
    },
    {
        id: '18',
        key: 'ghada',
        label: 'م. غادة الجندي',
        shortLabel: 'م. غادة الجندي',
        desc: 'أختام وتأشيرات م. غادة الجندي',
        icon: UserCheck,
        color: 'teal',
        badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
        activeBtn: 'bg-teal-600 text-white shadow-md shadow-teal-500/25',
        cardBg: 'from-teal-50/80 to-white hover:border-teal-300 border-teal-100',
        iconBg: 'bg-teal-600 text-white',
        keywords: ['غادة', 'غاده', 'الجندي', 'الجندى', 'ghada']
    },
    {
        id: '19',
        key: 'nehal',
        label: 'م. نهال',
        shortLabel: 'م. نهال',
        desc: 'أختام وتأشيرات م. نهال',
        icon: UserCheck,
        color: 'pink',
        badgeBg: 'bg-pink-100 text-pink-800 border-pink-200',
        activeBtn: 'bg-pink-600 text-white shadow-md shadow-pink-500/25',
        cardBg: 'from-pink-50/80 to-white hover:border-pink-300 border-pink-100',
        iconBg: 'bg-pink-600 text-white',
        keywords: ['نهال', 'nehal']
    },
    {
        id: '20',
        key: 'zerotech',
        label: 'قطاع زيروتيك',
        shortLabel: 'زيروتيك',
        desc: 'أختام وتأشيرات زيروتيك',
        icon: Factory,
        color: 'cyan',
        badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        activeBtn: 'bg-cyan-600 text-white shadow-md shadow-cyan-500/25',
        cardBg: 'from-cyan-50/80 to-white hover:border-cyan-300 border-cyan-100',
        iconBg: 'bg-cyan-600 text-white',
        keywords: ['زيروتيك', 'زيرو', 'تيك', 'zerotech', 'zero']
    }
];

// قائمة الموظفين المصرح لهم حصرياً برؤية والوصول إلى أختام القطاعات
const ALLOWED_SECTOR_USERS = ['1712', '1714', '1716'];

const getGroupInfo = (groupId) => {
    const found = DEPARTMENT_DEFINITIONS.find(d => d.id === groupId || d.key === groupId);
    if (found) return found;

    return {
        id: groupId,
        key: groupId,
        label: isNaN(groupId) ? `إدارة ${groupId}` : `إدارة رقم ${groupId}`,
        shortLabel: `إدارة ${groupId}`,
        desc: `أختام وتواقيع إدارة ${groupId}`,
        icon: Folder,
        color: 'slate',
        badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
        activeBtn: 'bg-slate-800 text-white shadow-md shadow-slate-600/25',
        cardBg: 'from-slate-50 to-white hover:border-slate-300 border-slate-200',
        iconBg: 'bg-slate-700 text-white'
    };
};

// تعريف مسميات التأشيرات والأزرار بناءً على الرقم الفرعي أو الاسم
const ACTION_DEFINITIONS = {
    '1': {
        label: 'اتخاذ اللازم',
        fullLabel: 'لإتخاذ اللازم',
        desc: 'تأشيرة اتخاذ اللازم',
        icon: '⚡',
        badgeBg: 'bg-blue-100 text-blue-700 border-blue-200',
        activeBtn: 'bg-blue-600 text-white',
        keywords: ['اتخاذ', 'لازم', 'لإتخاذ', 'اللازم']
    },
    '2': {
        label: 'للعرض',
        fullLabel: 'للعرض  ',
        desc: 'تأشيرة للعرض',
        icon: '📋',
        badgeBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        activeBtn: 'bg-emerald-600 text-white',
        keywords: ['عرض', 'للعرض']
    },
    '3': {
        label: 'للدراسة والعرض',
        fullLabel: ' للدراسة',
        desc: 'تأشيرة للدراسة',
        icon: '⏳',
        badgeBg: 'bg-amber-100 text-amber-700 border-amber-200',
        activeBtn: 'bg-amber-600 text-white',
        keywords: ['متابعة', 'للمتابعة']
    },
    '4': {
        label: ' للاحاطة  ',
        fullLabel: 'للدراسة والعرض  ',
        desc: 'تأشيرة للدراسة  والعرض',
        icon: '🔍',
        badgeBg: 'bg-purple-100 text-purple-700 border-purple-200',
        activeBtn: 'bg-purple-600 text-white',
        keywords: ['دراسة', 'رأي', 'ابداء', 'إبداء']
    },
    '5': {
        label: 'للإفادة',
        fullLabel: 'للإفادة بالرأي',
        desc: 'تأشيرة للإفادة',
        icon: '💬',
        badgeBg: 'bg-cyan-100 text-cyan-700 border-cyan-200',
        activeBtn: 'bg-cyan-600 text-white',
        keywords: ['افادة', 'إفادة']
    },
    '6': {
        label: 'للحفظ',
        fullLabel: 'للحفظ بالملف',
        desc: 'تأشيرة للحفظ',
        icon: '📁',
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
        activeBtn: 'bg-slate-700 text-white',
        keywords: ['حفظ', 'للحفظ']
    },
    '7': {
        label: 'للعلم والإحاطة',
        fullLabel: 'للعلم والإحاطة',
        desc: 'تأشيرة للعلم والإحاطة',
        icon: '👁️',
        badgeBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        activeBtn: 'bg-indigo-600 text-white',
        keywords: ['احاطة', 'إحاطة', 'علم']
    },
    '16': {
        label: 'نظر مع الشكر',
        fullLabel: 'تأشيرة نَظَر',
        desc: 'ختم وتأشيرة نَظَر المعتمدة',
        icon: '👁️',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
        activeBtn: 'bg-amber-600 text-white',
        keywords: ['نظر', 'نَظَر', 'nazar']
    },
    '17': {
        label: 'تصدق',
        fullLabel: 'تأشيرة تُصُدّق',
        desc: 'ختم وتأشيرة تُصُدّق المعتمدة',
        icon: '✅',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        activeBtn: 'bg-emerald-600 text-white',
        keywords: ['تصدق', 'تُصُدّق', 'تصديق', 'يصدق', 'tasdiq']
    }
};

const getActionInfo = (actionId, fileName = '') => {
    const actStr = String(actionId || '').trim();

    // 1. فحص بالرقم المباشر (مثل 1 -> اتخاذ اللازم، 2 -> للعرض، 16 -> نظر، 17 -> تصدق)
    if (actStr && ACTION_DEFINITIONS[actStr]) {
        return ACTION_DEFINITIONS[actStr];
    }

    // 2. فحص صريح لـ نظر وتصدق
    const lower = (fileName || '').toLowerCase();
    if (actStr === '16' || lower.includes('نظر') || lower.includes('nazar')) {
        return ACTION_DEFINITIONS['16'];
    }
    if (actStr === '17' || lower.includes('تصدق') || lower.includes('تصديق') || lower.includes('tasdiq')) {
        return ACTION_DEFINITIONS['17'];
    }

    // 3. فحص بالكلمات الدلالية في اسم الملف
    for (const [id, def] of Object.entries(ACTION_DEFINITIONS)) {
        if (def.keywords.some(kw => lower.includes(kw))) {
            return def;
        }
    }

    // 4. إن لم يتطابق
    return {
        label: isNaN(actionId) && actionId ? actionId : `الامضاء ${actionId || 'الشخصية'}`,
        fullLabel: isNaN(actionId) && actionId ? actionId : `تأشيرة رقم ${actionId || '1'}`,
        desc: `تأشيرة ${actionId || ''}`,
        icon: '✍️',
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
        activeBtn: 'bg-blue-600 text-white',
        keywords: []
    };
};

// PDF Viewer components
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

// Import styles
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

function PDFViewerContent() {
    const searchParams = useSearchParams();
    const filePath = searchParams.get("file");
    const docNo = searchParams.get("docNo");

    const [user, setUser] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [signature, setSignature] = useState(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [isUnsigning, setIsUnsigning] = useState(false);
    const [availableSignatures, setAvailableSignatures] = useState({});
    const [generalSignatures, setGeneralSignatures] = useState([]);

    // Drag & Drop state للتوقيع
    const [isDragMode, setIsDragMode] = useState(false);
    const [sigPos, setSigPos] = useState({ x: 50, y: 50 });
    const [sigSize, setSigSize] = useState({ width: 150, height: 70 });

    // مربعات النص القابلة للسحب فوق الـ PDF
    const [textItems, setTextItems] = useState([]); // {id, pageIndex, x, y, text, fontSize, color, bold, width, height}
    const [savingTexts, setSavingTexts] = useState(false);
    const [editingTextId, setEditingTextId] = useState(null);
    const [isTextMode, setIsTextMode] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
    const [selectedTextId, setSelectedTextId] = useState(null);
    const [hoveredSig, setHoveredSig] = useState(null); // حالة الختم الذي يتم الوقوف عليه حالياً
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // حالة القطاع المختار والأختام
    const [selectedSector, setSelectedSector] = useState(null); // '1', '2', ..., 'all', or null
    const [sigSearchQuery, setSigSearchQuery] = useState("");
    const [isSigModalOpen, setIsSigModalOpen] = useState(false);

    const handleSelectSignature = (sig) => {
        setHoveredSig(null);
        setSignature(sig);
        const pageEl = document.querySelector(`[data-testid="core__page-layer-${currentPage}"]`);
        if (pageEl) {
            setPageSize({
                width: pageEl.clientWidth,
                height: pageEl.clientHeight
            });
        }
        setIsDragMode(true);
        setIsSigModalOpen(false);
        toast.success("تم اختيار الختم، اسحبه الآن وضعه في المكان المطلوب على المستند");
    };

    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const nodeRef = useRef(null);
    const textNodeRefs = useRef({}); // لكل مربع نص ref مستقل

    const defaultLayoutPluginInstance = defaultLayoutPlugin();

    useEffect(() => {
        fetchUser();
        if (docNo) {
            fetch("/api/import/markSeen", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ docNo }),
            }).catch(err => console.error("Error marking as seen:", err));
        }
    }, [docNo]);

    const fetchUser = async () => {
        try {
            const res = await fetch("/api/auth/me");
            const json = await res.json();
            if (json.success) {
                setUser(json.user);
                checkSignature(json.user.empNum);
                loadPDF();
            }
        } catch (error) {
            console.error("Error fetching user:", error);
            toast.error("خطأ في جلب بيانات المستخدم");
        }
    };

    const checkSignature = async (empNum) => {
        console.log("🔍 Checking signatures for employee:", empNum);
        try {
            const res = await fetch(`/api/signatures?empNum=${empNum}`);
            const json = await res.json();
            console.log("📦 Signature API Response:", json);

            if (json.success && json.signatures) {
                console.log("✅ Found signatures:", json.signatures.length);

                const empStr = String(empNum).trim();
                const isAllowedSectors = ALLOWED_SECTOR_USERS.includes(empStr);

                // للمستخدمين غير المصرح لهم برؤية القطاعات (أي موظف غير 1712، 1714، 1716):
                // يتم تحويل كافة تواقيعهم مباشرة إلى التوقيعات الشخصية بدون قطاعات
                if (!isAllowedSectors) {
                    const allPersonal = json.signatures.map(sig => {
                        const nameWithoutExt = sig.FILE_NAME.replace(/\.[^/.]+$/, "").trim();
                        return {
                            ...sig,
                            actionInfo: getActionInfo('', nameWithoutExt)
                        };
                    });
                    console.log(`👤 User ${empStr} is not in sector access list. Added ${allPersonal.length} signatures to personal signatures.`);
                    setGeneralSignatures(allPersonal);
                    setAvailableSignatures({});
                    if (allPersonal.length > 0) {
                        setSignature(allPersonal[0]);
                    }
                    return;
                }

                // للمستخدمين المصرح لهم (1712، 1714، 1716):
                const general = [];
                const deptSigs = [];
                let commonNazar = null;
                let commonTasdiq = null;

                json.signatures.forEach(sig => {
                    const nameWithoutExt = sig.FILE_NAME.replace(/\.[^/.]+$/, "").trim();

                    // معرفة الجزء الذي يلي كود الموظف (يدعم الفواصل سواء . أو _ أو -)
                    let afterEmp = "";
                    if (nameWithoutExt.startsWith(empStr)) {
                        afterEmp = nameWithoutExt.slice(empStr.length).trim();
                    } else {
                        afterEmp = nameWithoutExt;
                    }

                    // هل هو التوقيع العام للموظف؟
                    // إذا لم يكن هناك شيء بعد الكود (1712.png) أو ينتهي بـ 0 أو عام أو شخصي أو sig
                    const isGeneral = afterEmp === "" ||
                        afterEmp === ".0" || afterEmp === "_0" ||
                        afterEmp.includes("عام") || afterEmp.includes("شخصي") ||
                        afterEmp.toLowerCase().includes("sig");

                    if (isGeneral) {
                        general.push(sig);
                        return;
                    }

                    // إزالة الفاصل الأول (_ أو . أو -)
                    const cleanAfter = afterEmp.replace(/^[_.\-\s]+/, "");
                    const parts = cleanAfter.split(/[_.\-\s]+/);
                    const firstSeg = parts[0] || "";
                    const secondSeg = parts[1] || "";
                    const lowerName = nameWithoutExt.toLowerCase();

                    // هل هذا ختم "نظر" مستقل؟ (1712.16 أو 1712_16 أو يحتوي على نظر)
                    const isStandaloneNazar = (firstSeg === '16' && !secondSeg) ||
                        ((lowerName.includes('نظر') || lowerName.includes('nazar')) && parts.length <= 1);

                    // هل هذا ختم "تصدق" مستقل؟ (1712.17 أو 1712_17 أو يحتوي على تصدق/تصديق)
                    const isStandaloneTasdiq = (firstSeg === '17' && !secondSeg) ||
                        ((lowerName.includes('تصدق') || lowerName.includes('تصديق') || lowerName.includes('tasdiq')) && parts.length <= 1);

                    if (isStandaloneNazar) {
                        sig.actionId = '16';
                        sig.actionInfo = getActionInfo('16', nameWithoutExt);
                        commonNazar = sig;
                        return;
                    }

                    if (isStandaloneTasdiq) {
                        sig.actionId = '17';
                        sig.actionInfo = getActionInfo('17', nameWithoutExt);
                        commonTasdiq = sig;
                        return;
                    }

                    // توقيع تابع لقطاع محدد
                    let matchedDept = null;

                    // 1. أولاً: فحص الكلمات الدلالية لكل إدارة
                    for (const dept of DEPARTMENT_DEFINITIONS) {
                        if (dept.keywords && dept.keywords.some(kw => lowerName.includes(kw.toLowerCase()))) {
                            matchedDept = dept;
                            break;
                        }
                    }

                    // 2. ثانياً: فحص المعرف المباشر للإدارة (id أو key)
                    if (!matchedDept && firstSeg) {
                        matchedDept = DEPARTMENT_DEFINITIONS.find(d => d.id === firstSeg || d.key === firstSeg);
                    }

                    // 3. توافقات خاصة للأرقام القديمة
                    if (!matchedDept && firstSeg === '0') {
                        matchedDept = DEPARTMENT_DEFINITIONS.find(d => d.key === 'deputy');
                    } else if (!matchedDept && firstSeg === '1') {
                        matchedDept = DEPARTMENT_DEFINITIONS.find(d => d.key === 'contracts' || d.id === '1');
                    } else if (!matchedDept && firstSeg === '2') {
                        matchedDept = DEPARTMENT_DEFINITIONS.find(d => d.key === 'cameras' || d.id === '2');
                    }

                    const deptId = matchedDept ? matchedDept.id : (firstSeg || 'other');

                    // استخراج رقم التأشيرة
                    let actionId = secondSeg || '';
                    if (secondSeg === '16' || lowerName.includes('نظر') || lowerName.includes('nazar')) {
                        actionId = '16';
                    } else if (secondSeg === '17' || lowerName.includes('تصدق') || lowerName.includes('تصديق') || lowerName.includes('tasdiq')) {
                        actionId = '17';
                    } else if (!actionId && matchedDept) {
                        actionId = '1';
                    }

                    sig.deptId = deptId;
                    sig.actionId = actionId;
                    sig.actionInfo = getActionInfo(actionId, nameWithoutExt);

                    deptSigs.push(sig);
                });

                // نقل "نظر" و "تصدق" إلى التوقيعات الشخصية المعتمدة بالأسفل بدلاً من وضعهم داخل القطاعات
                if (commonNazar) {
                    general.push(commonNazar);
                }
                if (commonTasdiq) {
                    general.push(commonTasdiq);
                }

                console.log(`👤 Found ${general.length} general personal signature(s) (including common visas)`);
                setGeneralSignatures(general);

                // تجميع تواقيع الإدارات
                const grouped = deptSigs.reduce((acc, sig) => {
                    const deptId = sig.deptId || 'other';
                    if (!acc[deptId]) acc[deptId] = [];
                    acc[deptId].push(sig);
                    return acc;
                }, {});

                // إلغاء أي قطاعات مستقلة لـ نظر أو تصدق من قائمة الإدارات
                delete grouped['16'];
                delete grouped['17'];
                delete grouped['18'];
                delete grouped['nazar'];
                delete grouped['tasdiq'];

                // حذف أي إدارة فارغة لا تحتوي على أختام
                Object.keys(grouped).forEach(deptId => {
                    if (!grouped[deptId] || grouped[deptId].length === 0) {
                        delete grouped[deptId];
                    }
                });

                // ترتيب العناصر داخل كل إدارة بناءً على رقم التأشيرة
                Object.keys(grouped).forEach(groupId => {
                    grouped[groupId].sort((a, b) => {
                        const aAct = parseFloat(a.actionId);
                        const bAct = parseFloat(b.actionId);
                        if (!isNaN(aAct) && !isNaN(bAct)) return aAct - bAct;
                        return a.FILE_NAME.localeCompare(b.FILE_NAME, undefined, { numeric: true, sensitivity: 'base' });
                    });
                });

                console.log("📋 Grouped signatures by department:", grouped);
                setAvailableSignatures(grouped);

                // تعيين أول توقيع افتراضي (سواء التوقيع العام أو أول ختم إدارة متاح)
                if (general.length > 0) {
                    setSignature(general[0]);
                } else {
                    const firstGroupId = Object.keys(grouped)[0];
                    if (firstGroupId && grouped[firstGroupId].length > 0) {
                        setSignature(grouped[firstGroupId][0]);
                    }
                }
            } else {
                console.warn("⚠️ No signatures returned:", json.error || "Unknown error");
            }
        } catch (error) {
            console.error("❌ Error checking signature:", error);
        }
    };

    const loadPDF = async () => {
        setLoading(true);
        try {
            if (!filePath) {
                toast.error("لم يتم تحديد ملف");
                return;
            }
            // Add cache busting
            setPdfUrl(`/api/files/view?path=${encodeURIComponent(filePath)}&v=${Date.now()}`);
        } catch (error) {
            console.error("Error loading PDF:", error);
            toast.error("خطأ في تحميل الملف");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSignature = async () => {
        if (!signature || !isDragMode) return;

        // دقة متناهية: نعتمد على مقارنة مكان عنصر التوقيع بمكان عنصر الصفحة في الـ DOM
        const pageEl = document.querySelector(`[data-testid="core__page-layer-${currentPage}"]`);
        const sigEl = nodeRef.current;

        if (!pageEl || !sigEl) {
            toast.error("يرجى التأكد من ظهور التوقيع بوضوح فوق الصفحة");
            return;
        }

        const pageRect = pageEl.getBoundingClientRect();
        const sigRect = sigEl.getBoundingClientRect();

        // حساب الإحداثيات النسبية (Relative to page top-left)
        const relX = sigRect.left - pageRect.left;
        const relY = sigRect.top - pageRect.top;

        setSigning(true);
        try {
            // تحويل الإحداثيات لنظام الـ PDF (الذي يبدأ من الأسفل لليسار)
            // نرسل الأبعاد الحقيقية للعناصر كما هي في المتصفح
            const res = await fetch("/api/pdf/sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filePath: filePath,
                    empNum: user.empNum,
                    signaturePath: signature.SIGNATURE_PATH, // إرسال المسار المحدد
                    x: relX,
                    y: pageRect.height - relY - sigRect.height,
                    width: sigRect.width,
                    height: sigRect.height,
                    pageIndex: currentPage,
                    viewWidth: pageRect.width,
                    viewHeight: pageRect.height,
                    docNo: docNo
                })
            });

            const json = await res.json();

            if (json.success) {
                // التأشير كتم الرد للأشخاص المحددين في RESTRICTED_VIEW_USERS
                if (user && ["1714", "1716", "1712"].includes(user.empNum?.toString())) {
                    try {
                        await fetch("/api/import/updateAnswered", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ docNo }),
                        });
                    } catch (err) {
                        console.error("Error auto-marking as answered:", err);
                    }
                }
                toast.success("تم تثبيت التوقيع بنجاح");
                setIsDragMode(false);
                setPdfUrl(null);
                setTimeout(() => loadPDF(), 800);
            } else {
                toast.error(json.error || "فشل حفظ التوقيع");
            }
        } catch (error) {
            console.error("Error saving signature:", error);
            toast.error("خطأ في حفظ التوقيع");
        } finally {
            setSigning(false);
        }
    };

    const handleUnsign = async () => {
        if (!confirm("هل أنت متأكد من مسح التوقيع والعودة للنسخة الأصلية؟")) return;

        setIsUnsigning(true);
        try {
            const res = await fetch("/api/pdf/unsign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filePath, docNo })
            });
            const json = await res.json();
            if (json.success) {
                toast.success("تم استعادة النسخة الأصلية");
                loadPDF();
            } else {
                toast.error(json.error || "لا توجد نسخة احتياطية للمسح");
            }
        } catch (error) {
            toast.error("خطأ أثناء مسح التوقيع");
        } finally {
            setIsUnsigning(false);
        }
    };

    const handlePageDoubleClick = useCallback((e) => {
        if (!isTextMode) return;

        const pageEl = e.target?.closest('[data-testid^="core__page-layer-"]');
        if (!pageEl) return;

        const pageIndex = parseInt(pageEl.getAttribute('data-testid').split('-').pop());
        const pageRect = pageEl.getBoundingClientRect();

        const relX = e.clientX - pageRect.left;
        const relY = e.clientY - pageRect.top;

        // Position the editor floating above the double-click point so it doesn't block the view
        const editorX = Math.max(10, relX - 130);
        const editorY = Math.max(10, relY - 150);

        const newId = Date.now();
        setTextItems(prev => [...prev, {
            id: newId,
            pageIndex,
            x: editorX,
            y: editorY,
            saveX: relX,
            saveY: relY,
            viewWidth: pageRect.width,
            viewHeight: pageRect.height,
            text: "",
            fontSize: 18,
            color: '#000000',
            bold: false,
            width: 260,
            height: 120
        }]);
        setEditingTextId(newId);
        setSelectedTextId(newId);

        // Visual flash
        const flash = document.createElement('div');
        flash.style.cssText = `position:absolute;left:${relX - 20}px;top:${relY - 20}px;width:40px;height:40px;border-radius:50%;background:rgba(96,165,250,0.4);animation:ping 0.8s ease-out;pointer-events:none;z-index:9999`;
        pageEl.appendChild(flash);
        setTimeout(() => flash.remove(), 800);
    }, [isTextMode]);

    // Attach dblclick listener directly — avoids overlay blocking drag events
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !isTextMode) return;
        container.addEventListener('dblclick', handlePageDoubleClick);
        return () => container.removeEventListener('dblclick', handlePageDoubleClick);
    }, [isTextMode, handlePageDoubleClick]);

    // Click outside to deselect active text item
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (!e.target.closest('[id^="text-item-"]') &&
                !e.target.closest('[class*="pointer-events-auto"]') &&
                !e.target.closest('button') &&
                !e.target.closest('input') &&
                !e.target.closest('label')) {
                setSelectedTextId(null);
                setEditingTextId(null);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    // Manual drag handler for text boxes (works correctly inside portals)
    const startTextDrag = (e, itemId) => {
        e.preventDefault();
        e.stopPropagation();

        const el = document.getElementById(`text-item-${itemId}`);
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        const onMouseMove = (moveEvent) => {
            const parent = el.parentElement;
            if (!parent) return;
            const parentRect = parent.getBoundingClientRect();
            const newX = moveEvent.clientX - parentRect.left - offsetX;
            const newY = moveEvent.clientY - parentRect.top - offsetY;
            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;
        };

        const onMouseUp = (upEvent) => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            const finalX = parseFloat(el.style.left) || 0;
            const finalY = parseFloat(el.style.top) || 0;
            setTextItems(prev =>
                prev.map(t =>
                    t.id === itemId ? { ...t, x: finalX, y: finalY } : t
                )
            );
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Resize handler for text boxes
    const startTextResize = (e, itemId) => {
        e.preventDefault();
        e.stopPropagation();

        const el = document.getElementById(`text-item-${itemId}`);
        if (!el) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const item = textItems.find(t => t.id === itemId);
        if (!item) return;
        const startW = item.width || 260;
        const startH = item.height || 120;

        const onMouseMove = (moveEvent) => {
            const newW = Math.max(150, startW + (moveEvent.clientX - startX));
            const newH = Math.max(80, startH + (moveEvent.clientY - startY));
            el.style.width = `${newW}px`;
            el.style.height = `${newH}px`;
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            const finalW = parseFloat(el.style.width) || startW;
            const finalH = parseFloat(el.style.height) || startH;
            setTextItems(prev =>
                prev.map(t =>
                    t.id === itemId ? { ...t, width: finalW, height: finalH } : t
                )
            );
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleSaveTexts = async () => {
        if (!textItems.length) {
            toast.error("لا توجد نصوص لحفظها");
            return;
        }

        const textsPayload = textItems.map(item => {
            // Get the actual page layer dimensions at save time
            const pageEl = document.querySelector(`[data-testid="core__page-layer-${item.pageIndex}"]`);
            const currentViewH = pageEl ? pageEl.getBoundingClientRect().height : item.viewHeight;
            const currentViewW = pageEl ? pageEl.getBoundingClientRect().width : item.viewWidth;

            return {
                id: item.id,
                text: item.text,
                pageIndex: item.pageIndex,
                x: item.saveX,
                y: currentViewH - item.saveY,  // Convert browser top-origin → PDF bottom-origin
                width: item.width || 260,
                viewWidth: currentViewW,
                viewHeight: currentViewH,
                fontSize: item.fontSize || 18,
                color: item.color || '#000000',
                bold: item.bold || false
            };
        }).filter(t => t.text.trim() !== "");

        if (!textsPayload.length) {
            toast.error("يرجى كتابة نص أولاً قبل الحفظ");
            return;
        }

        try {
            setSavingTexts(true);
            const res = await fetch("/api/pdf/add-text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filePath,
                    empNum: user?.empNum,
                    docNo,
                    texts: textsPayload
                })
            });

            const json = await res.json();
            if (json.success) {
                // التأشير كتم الرد للأشخاص المحددين في RESTRICTED_VIEW_USERS
                if (user && ["1714", "1716", "1712"].includes(user.empNum?.toString())) {
                    try {
                        await fetch("/api/import/updateAnswered", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ docNo }),
                        });
                    } catch (err) {
                        console.error("Error auto-marking as answered:", err);
                    }
                }
                toast.success("تم حفظ النصوص بنجاح");
                setTextItems([]);
                setIsTextMode(false);
                setPdfUrl(null);
                // زيادة وقت الانتظار لضمان تحديث الملف على السيرفر
                setTimeout(() => loadPDF(), 1500);
            } else {
                toast.error(json.error || "فشل حفظ النصوص");
            }
        } catch (error) {
            console.error("Error saving texts:", error);
            toast.error("خطأ أثناء حفظ النصوص");
        } finally {
            setSavingTexts(false);
        }
    };

    const handlePageChange = (e) => {
        setCurrentPage(e.currentPage);
        // Try to get page size from the DOM to help with relative positioning
        const pageEl = document.querySelector(`[data-testid="core__page-layer-${e.currentPage}"]`);
        if (pageEl) {
            setPageSize({
                width: pageEl.clientWidth,
                height: pageEl.clientHeight
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">جاري تحميل الملف...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700 p-4 shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                // محاولة إغلاق النافذة، لو مش نافع نرجع للصفحة السابقة
                                if (window.opener) {
                                    window.close();
                                } else {
                                    window.history.back();
                                }
                            }}
                            className="text-white hover:bg-slate-700 font-bold "
                        >
                            <X className="w-5 h-5 ml-2" />
                            إغلاق
                        </Button>
                        <div className="border-r border-slate-700 pr-4">
                            {/* <h1 className="text-white font-black">عارض وموقع الملفات الذكي</h1> */}
                            {docNo && <p className="text-blue-400 text-lg font-bold">مكاتبة رقم: {docNo}</p>}
                            {/* Debug: Show signature count */}
                            <div className="mt-1">
                                {user && (
                                    <span className="text-xs text-slate-400">
                                        المستخدم: {user.empNum} |
                                        التوقيع: {Object.keys(availableSignatures).length > 0
                                            ? `${Object.values(availableSignatures).flat().length} متاح`
                                            : 'لا يوجد'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Action Buttons in Header */}
                <div className="flex items-center gap-3">
                    {signature && isDragMode && (
                        <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                            <Button
                                onClick={handleSaveSignature}
                                disabled={signing}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-500/20"
                            >
                                {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                                تثبيت في هذا المكان
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => setIsDragMode(false)}
                                className="font-black"
                            >
                                إلغاء
                            </Button>
                        </div>
                    )}

                    {signature && (
                        <Button
                            variant="outline"
                            onClick={handleUnsign}
                            disabled={isUnsigning}
                            className="border-red-500 text-red-500 hover:bg-red-500/10 font-black"
                        >
                            {isUnsigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 ml-2" />}
                            تراجع / مسح
                        </Button>
                    )}

                    {textItems.length > 0 && (
                        <>
                            <Button
                                onClick={handleSaveTexts}
                                disabled={savingTexts}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-black shadow-lg shadow-amber-500/20"
                            >
                                {savingTexts ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 ml-2" />
                                )}
                                حفظ النصوص
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    setTextItems([]);
                                    setIsTextMode(false);
                                }}
                                className="font-black"
                            >
                                إلغاء النصوص
                            </Button>
                        </>
                    )}

                    {/* <Button
                        variant="ghost"
                        className="text-white hover:bg-slate-700"
                        onClick={() => window.open(pdfUrl, '_blank')}
                    >
                        <Download className="w-4 h-4 ml-2" />
                        تحميل
                    </Button> */}
                </div>
            </div>

            {/* Main Content Area with Sidebar */}
            <div className="flex-1 flex overflow-hidden bg-slate-900" dir="rtl">
                {/* Sidebar for Signature Selection and Tools */}
                <div className="w-96 bg-slate-100 border-l border-slate-300 flex flex-col z-20 shadow-2xl overflow-hidden" dir="rtl">
                    <div className="p-3 bg-slate-200 border-b border-slate-300 flex items-center justify-between" dir="ltr">
                        <button onClick={() => { setIsDragMode(false); setIsTextMode(false); }} className="text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                        </button>
                        <h2 className="text-slate-700 font-bold text-xs uppercase tracking-tight">قائمة الأدوات</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar bg-white">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                                    أدوات إضافية
                                </span>
                                <div className="h-px bg-slate-200 flex-1" />
                            </div>
                            <Button
                                onClick={() => {
                                    setIsTextMode(!isTextMode);
                                    setIsDragMode(false);
                                }}
                                variant={isTextMode ? "default" : "outline"}
                                className={`w-full justify-start gap-3 h-14 rounded-2xl font-black transition-all ${isTextMode ? 'bg-blue-600 shadow-xl shadow-blue-500/20' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isTextMode ? 'bg-white/20' : 'bg-blue-50'}`}>
                                    <Type className={`w-5 h-5 ${isTextMode ? 'text-white' : 'text-blue-600'}`} />
                                </div>
                                <div className="flex flex-col items-start gap-0.5">
                                    <span className="text-sm">إضافة نص / ملاحظة</span>
                                    <span className={`text-[10px] ${isTextMode ? 'text-blue-100' : 'text-slate-400'}`}>أضف تعليقاً في أي مكان</span>
                                </div>
                            </Button>
                        </div>

                        {/* قطاعات وتواقيع */}
                        {(() => {
                            if (Object.keys(availableSignatures).length === 0) {
                                if (generalSignatures.length === 0) {
                                    return (
                                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                            <div className="p-4 bg-slate-50 rounded-full">
                                                <FileSignature className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-slate-400 text-sm font-bold">لا توجد أختام أو تواقيع متاحة لهذا المستخدم</p>
                                        </div>
                                    );
                                }
                                return null;
                            }

                            const sortedGroups = Object.entries(availableSignatures).sort(([aKey], [bKey]) => {
                                const aIdx = DEPARTMENT_DEFINITIONS.findIndex(d => d.id === aKey || d.key === aKey);
                                const bIdx = DEPARTMENT_DEFINITIONS.findIndex(d => d.id === bKey || d.key === bKey);
                                if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                                if (aIdx !== -1) return -1;
                                if (bIdx !== -1) return 1;
                                return aKey.localeCompare(bKey);
                            });

                            const totalCount = Object.values(availableSignatures).flat().length;

                            // في حالة عدم اختيار قطاع: عرض كروت القطاعات فقط
                            if (selectedSector === null) {
                                return (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                                    القطاعات المتاحة للتوقيع ({sortedGroups.length})
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setIsSigModalOpen(true)}
                                                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
                                                title="استعراض مكبر في نافذة"
                                            >
                                                <Maximize2 className="w-3.5 h-3.5" />
                                                نافذة مكبرة
                                            </button>
                                        </div>



                                        <div className="space-y-2.5">
                                            {sortedGroups.map(([groupId, stamps]) => {
                                                const groupInfo = getGroupInfo(groupId);
                                                const Icon = groupInfo.icon;
                                                return (
                                                    <div
                                                        key={groupId}
                                                        onClick={() => {
                                                            setSelectedSector(groupId);
                                                            setSigSearchQuery("");
                                                        }}
                                                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md bg-gradient-to-r ${groupInfo.cardBg} flex items-center justify-between group`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${groupInfo.iconBg} shadow-sm transition-transform group-hover:scale-105`}>
                                                                <Icon className="w-5 h-5 text-white" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-black text-xs text-slate-800 group-hover:text-blue-600 transition-colors">
                                                                    {groupInfo.label}
                                                                </h4>
                                                                <p className="text-[10px] text-slate-500 font-bold">
                                                                    {stamps.length} توقيع متاح
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg transition-all ${groupInfo.badgeBg} group-hover:bg-blue-600 group-hover:text-white`}>
                                                                فتح التأشرات  ➜
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="pt-2 flex flex-col gap-2">
                                            <button
                                                onClick={() => setSelectedSector('all')}
                                                className="w-full py-2.5 px-3 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <Layers className="w-4 h-4 text-slate-400" />
                                                <span>عرض جميع قطاعات التوقيع معاً ({totalCount} ختم)</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            // في حالة اختيار قطاع محدد: عرض تواقيع هذا القطاع فقط
                            const currentStamps = (() => {
                                let list = [];
                                if (selectedSector === 'all') {
                                    list = Object.values(availableSignatures).flat();
                                } else if (availableSignatures[selectedSector]) {
                                    list = availableSignatures[selectedSector];
                                }
                                if (!sigSearchQuery.trim()) return list;
                                return list.filter(sig =>
                                    sig.FILE_NAME.toLowerCase().includes(sigSearchQuery.toLowerCase())
                                );
                            })();

                            const activeInfo = selectedSector === 'all'
                                ? { label: 'جميع القطاعات', shortLabel: 'الكل', activeBtn: 'bg-slate-800 text-white' }
                                : getGroupInfo(selectedSector);

                            return (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    {/* شريط رأس القطاع وزر الرجوع */}
                                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-200">
                                        <button
                                            onClick={() => {
                                                setSelectedSector(null);
                                                setSigSearchQuery("");
                                            }}
                                            className="flex items-center gap-1 text-xs font-black text-slate-600 hover:text-blue-600 transition-colors bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-sm hover:shadow cursor-pointer"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                            <span>القطاعات</span>
                                        </button>

                                        <div className="flex items-center gap-1.5 px-1 truncate">
                                            <span className="text-xs font-black text-slate-800 truncate">
                                                {activeInfo.label}
                                            </span>
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 whitespace-nowrap">
                                                {currentStamps.length}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => setIsSigModalOpen(true)}
                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                                            title="تكبير واستعراض في شاشة كاملة"
                                        >
                                            <Maximize2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* أزرار التبديل السريع بين القطاعات */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar">
                                        {sortedGroups.map(([groupId, stamps]) => {
                                            const info = getGroupInfo(groupId);
                                            const isCurrent = selectedSector === groupId;
                                            return (
                                                <button
                                                    key={groupId}
                                                    onClick={() => {
                                                        setSelectedSector(groupId);
                                                        setSigSearchQuery("");
                                                    }}
                                                    className={`text-[11px] font-black px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer ${isCurrent
                                                            ? info.activeBtn
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <span>{info.shortLabel}</span>
                                                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${isCurrent ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                        {stamps.length}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        <button
                                            onClick={() => {
                                                setSelectedSector('all');
                                                setSigSearchQuery("");
                                            }}
                                            className={`text-[11px] font-black px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer ${selectedSector === 'all'
                                                    ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span>الكل</span>
                                        </button>
                                    </div>

                                    {/* حقل البحث السريع */}
                                    {/* <div className="relative">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={sigSearchQuery}
                                            onChange={(e) => setSigSearchQuery(e.target.value)}
                                            placeholder={`بحث في أختام ${activeInfo.shortLabel}...`}
                                            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                                        />
                                        {sigSearchQuery && (
                                            <button
                                                onClick={() => setSigSearchQuery("")}
                                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div> */}

                                    {/* شبكة أزرار التأشيرات (نصوص فقط بدون صور وبدون تكبير عائم) */}
                                    {currentStamps.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {currentStamps.map((sig) => {
                                                const action = sig.actionInfo || getActionInfo(sig.actionId, sig.FILE_NAME);
                                                const isSelected = signature?.FILE_NAME === sig.FILE_NAME && isDragMode;

                                                return (
                                                    <button
                                                        key={sig.FILE_NAME}
                                                        onClick={() => handleSelectSignature(sig)}
                                                        className={`py-3 px-2 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1 group cursor-pointer text-center relative overflow-hidden ${isSelected
                                                                ? 'border-blue-600 bg-blue-50/95 shadow-md ring-2 ring-blue-500/25 scale-[0.98]'
                                                                : 'border-slate-200 bg-white hover:border-blue-500 hover:bg-slate-50 hover:shadow-sm'
                                                            }`}
                                                    >
                                                        {/* أيقونة واسم التأشيرة فقط */}
                                                        <div className="flex items-center justify-center gap-1.5 w-full">
                                                            <span className="text-base">{action.icon}</span>
                                                            <span className="font-black text-xs text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                                                                {action.label}
                                                            </span>
                                                        </div>

                                                        {/* كود الملف الصغير أسفل التأشيرة */}
                                                        <span className="text-[10px] text-slate-400 font-bold truncate max-w-full">
                                                            {sig.FILE_NAME}
                                                        </span>

                                                        {/* مؤشر التحديد */}
                                                        {isSelected && (
                                                            <div className="w-full mt-0.5 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-md">
                                                                محدد للتوقيع ✍️
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                            <Search className="w-8 h-8 text-slate-300 mx-auto" />
                                            <p className="text-xs font-bold text-slate-500">لا توجد أختام مطابقة لبحثك</p>
                                            {sigSearchQuery && (
                                                <button
                                                    onClick={() => setSigSearchQuery("")}
                                                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                                                >
                                                    مسح البحث
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* التوقيعات الشخصية (بالكود والتأشيرات العامة نظَر وتُصدّق) */}
                        {generalSignatures.length > 0 && (
                            <div className="pt-4 border-t-2 border-slate-100 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                        التوقيعات الشخصية المعتمدة ({generalSignatures.length})
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold">كود: {user?.empNum}</span>
                                </div>
                                <div className="space-y-2">
                                    {generalSignatures.map((sig, idx) => {
                                        const action = sig.actionInfo || getActionInfo(sig.actionId, sig.FILE_NAME);
                                        const isSelected = signature?.FILE_NAME === sig.FILE_NAME && isDragMode;
                                        const label = action?.label || (idx === 0 ? "التوقيع الشخصي المعتمد" : sig.FILE_NAME);

                                        return (
                                            <button
                                                key={sig.FILE_NAME || idx}
                                                onClick={() => handleSelectSignature(sig)}
                                                onMouseEnter={() => setHoveredSig(sig)}
                                                onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                                                onMouseLeave={() => setHoveredSig(null)}
                                                className={`w-full p-2.5 border-2 rounded-2xl transition-all shadow-sm hover:shadow-md flex items-center justify-between group cursor-pointer ${isSelected
                                                        ? 'border-blue-600 bg-blue-50/90 ring-2 ring-blue-500/25'
                                                        : 'bg-gradient-to-r from-slate-50 to-white hover:from-blue-50/50 hover:to-white border-slate-200 hover:border-blue-500'
                                                    }`}
                                            >
                                                <div className="h-12 w-28 flex items-center justify-center bg-white rounded-xl border border-slate-100 p-1 group-hover:shadow-inner overflow-hidden">
                                                    <img
                                                        src={`/api/files/view?path=${encodeURIComponent(sig.SIGNATURE_PATH)}`}
                                                        alt={label}
                                                        className="max-h-full max-w-full object-contain pointer-events-none transition-transform group-hover:scale-105"
                                                    />
                                                </div>
                                                <div className="text-right flex-1 pr-3">
                                                    <p className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1.5 justify-end">
                                                        {action?.icon && <span>{action.icon}</span>}
                                                        <span>{label}</span>
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-bold truncate">
                                                        {sig.FILE_NAME}
                                                    </p>
                                                    <span className="text-[9px] font-black text-blue-600 mt-0.5 inline-block">
                                                        {isSelected ? "محدد للتوقيع ✍️" : "اضغط للسحب والتوقيع ✍️"}
                                                    </span>
                                                </div>

                                                {/* المعاينة المكبرة عند الوقوف على التوقيع */}
                                                {hoveredSig?.FILE_NAME === sig.FILE_NAME && (
                                                    <div
                                                        className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-200 shadow-2xl rounded-2xl border-4 border-white/50 backdrop-blur-xl bg-slate-900/70 p-6 flex items-center justify-center"
                                                        style={{
                                                            top: Math.max(20, Math.min(window.innerHeight - 380, mousePos.y - 180)),
                                                            right: Math.min(window.innerWidth - 480, (window.innerWidth - mousePos.x) + 40),
                                                            width: '450px',
                                                            height: '350px'
                                                        }}
                                                    >
                                                        <img
                                                            src={`/api/files/view?path=${encodeURIComponent(sig.SIGNATURE_PATH)}`}
                                                            alt="Preview"
                                                            className="max-w-full max-h-full object-contain drop-shadow-2xl"
                                                        />
                                                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs font-black px-4 py-2 rounded-full whitespace-nowrap border border-white/20">
                                                            🔎 معاينة: {label} ({sig.FILE_NAME})
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* PDF Viewer Area */}
                <div className="flex-1 relative overflow-hidden p-4 flex justify-center items-start">
                    <div
                        ref={containerRef}
                        className="relative w-full max-w-5xl h-full shadow-2xl rounded-xl overflow-hidden bg-white"
                    >
                        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                            {pdfUrl ? (
                                filePath?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp)$/) ? (
                                    <div className="flex items-center justify-center min-h-full bg-slate-100 p-4">
                                        <img
                                            src={pdfUrl}
                                            alt="Preview"
                                            className="max-w-full max-h-full shadow-lg rounded-sm object-contain"
                                        />
                                    </div>
                                ) : (
                                    <Viewer
                                        fileUrl={pdfUrl}
                                        plugins={[defaultLayoutPluginInstance]}
                                        onPageChange={handlePageChange}
                                        onDocumentLoad={(e) => {
                                            setTimeout(() => {
                                                const pageEl = document.querySelector(`[data-testid="core__page-layer-0"]`);
                                                if (pageEl) {
                                                    setPageSize({
                                                        width: pageEl.clientWidth,
                                                        height: pageEl.clientHeight
                                                    });
                                                }
                                            }, 500);
                                        }}
                                    />
                                )
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                                </div>
                            )}
                        </Worker>

                        {/* Draggable Signature Overlay */}
                        {isDragMode && signature && (
                            <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
                                <Draggable
                                    nodeRef={nodeRef}
                                    onStop={(e, data) => setSigPos({ x: data.x, y: data.y })}
                                    defaultPosition={{ x: 100, y: 100 }}
                                    cancel=".no-drag"
                                >
                                    <div ref={nodeRef} className="pointer-events-auto cursor-move group w-fit absolute">
                                        <div className="relative p-2 bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-lg shadow-2xl backdrop-blur-sm">
                                            <img
                                                src={`/api/files/view?path=${encodeURIComponent(signature.SIGNATURE_PATH)}`}
                                                alt="Signature"
                                                style={{ width: `${sigSize.width}px`, height: `${sigSize.height}px` }}
                                                className="pointer-events-none select-none object-contain"
                                            />

                                            {/* مقبض التحكم في الحجم (Resize Handle) */}
                                            <div
                                                className="absolute -bottom-2 -right-2 w-5 h-5 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-10 hover:scale-125 transition-transform shadow-md no-drag flex items-center justify-center"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    const startX = e.clientX;
                                                    const startY = e.clientY;
                                                    const startWidth = sigSize.width;
                                                    const startHeight = sigSize.height;

                                                    const onMouseMove = (moveEvent) => {
                                                        const deltaX = moveEvent.clientX - startX;
                                                        const deltaY = moveEvent.clientY - startY;
                                                        // الحفاظ على الحد الأدنى للحجم 40x40
                                                        setSigSize({
                                                            width: Math.max(40, startWidth + deltaX),
                                                            height: Math.max(40, startHeight + deltaY)
                                                        });
                                                    };

                                                    const onMouseUp = () => {
                                                        window.removeEventListener('mousemove', onMouseMove);
                                                        window.removeEventListener('mouseup', onMouseUp);
                                                    };

                                                    window.addEventListener('mousemove', onMouseMove);
                                                    window.addEventListener('mouseup', onMouseUp);
                                                }}
                                            >
                                                <div className="w-2 h-2 border-r-2 border-b-2 border-blue-600" />
                                            </div>

                                            {/* أزرار تحكم سريعة */}
                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 p-1 rounded-xl shadow-lg border border-blue-200 no-drag">
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:bg-blue-100" onClick={() => setSigSize(s => ({ width: s.width * 1.1, height: s.height * 1.1 }))}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                                <span className="text-[10px] font-bold text-slate-500 px-1">الحجم</span>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:bg-blue-100" onClick={() => setSigSize(s => ({ width: s.width * 0.9, height: s.height * 0.9 }))}>
                                                    <Minus className="w-4 h-4" />
                                                </Button>
                                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => setSigSize({ width: 150, height: 70 })}>
                                                    <RotateCcw className="w-3 h-3" />
                                                </Button>
                                            </div>

                                            <div className="absolute -top-3 -right-3 bg-blue-600 text-white p-2 rounded-full shadow-lg">
                                                <Move className="w-5 h-5 font-black" />
                                            </div>
                                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-blue-600 text-[10px] text-white px-2 py-0.5 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                                اسحب للتحريك أو استخدم الزاوية لتغيير الحجم
                                            </div>
                                        </div>
                                    </div>
                                </Draggable>
                            </div>
                        )}


                        {/* Rendering Text Items using Portals directly into Page Layers */}
                        {textItems.map((item) => {
                            const pageLayer = document.querySelector(`[data-testid="core__page-layer-${item.pageIndex}"]`);
                            if (!pageLayer) return null;

                            const isSelected = selectedTextId === item.id;
                            const isEditing = editingTextId === item.id;
                            const itemW = item.width || 260;
                            const itemH = item.height || 120;
                            const fontSize = item.fontSize || 18;
                            const color = item.color || '#000000';

                            return createPortal(
                                <>
                                    {/* ── المعاينة الفعلية للنص في نقطة الضغط (ثابتة لا تتحرك مع تحريك الصندوق) ── */}
                                    <div
                                        id={`text-preview-${item.id}`}
                                        className="absolute pointer-events-auto cursor-pointer whitespace-nowrap select-none"
                                        style={{
                                            right: `${pageLayer.getBoundingClientRect().width - item.saveX}px`,
                                            top: `${item.saveY}px`,
                                            fontSize: `${fontSize}px`,
                                            color: color,
                                            fontWeight: item.bold ? 'bold' : 'normal',
                                            direction: 'rtl',
                                            fontFamily: 'Cairo, sans-serif',
                                            zIndex: 4999
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedTextId(item.id);
                                            setEditingTextId(item.id);
                                        }}
                                    >
                                        {item.text || <span className="opacity-50 text-xs border border-dashed border-blue-400 bg-white/95 px-1.5 py-0.5 rounded shadow-md">[اكتب هنا]</span>}
                                    </div>

                                    {/* ── صندوق التحرير العائم (يظهر فقط عند التحديد/الكتابة) ── */}
                                    {isSelected && (
                                        <div
                                            id={`text-item-${item.id}`}
                                            className="absolute z-[5000] pointer-events-auto shadow-2xl rounded-xl"
                                            style={{ left: `${item.x}px`, top: `${item.y}px`, width: `${itemW}px` }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {/* ── شريط التحكم العلوي ── */}
                                            <div
                                                className="w-full bg-blue-600 text-white flex items-center justify-between px-2 py-1 rounded-t-xl cursor-move shadow-lg select-none"
                                                onMouseDown={(e) => startTextDrag(e, item.id)}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <Move className="w-3 h-3 opacity-80" />
                                                    <span className="text-[9px] font-black opacity-80">اسحب المحرر</span>
                                                </div>

                                                {/* أدوات التحكم */}
                                                <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
                                                    {/* حجم الخط */}
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setTextItems(p => p.map(t => t.id === item.id ? { ...t, fontSize: Math.max(8, (t.fontSize || 18) - 2) } : t)); }}
                                                        className="bg-white/20 hover:bg-white/40 rounded px-1 py-0.5 text-[10px] font-black transition-colors"
                                                        title="تصغير الخط"
                                                    >A-</button>
                                                    <span className="text-[9px] font-bold bg-white/10 px-1 rounded min-w-[22px] text-center">{fontSize}</span>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setTextItems(p => p.map(t => t.id === item.id ? { ...t, fontSize: Math.min(72, (t.fontSize || 18) + 2) } : t)); }}
                                                        className="bg-white/20 hover:bg-white/40 rounded px-1 py-0.5 text-[10px] font-black transition-colors"
                                                        title="تكبير الخط"
                                                    >A+</button>

                                                    <div className="w-px h-3 bg-white/30 mx-0.5" />

                                                    {/* عريض */}
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setTextItems(p => p.map(t => t.id === item.id ? { ...t, bold: !t.bold } : t)); }}
                                                        className={`rounded px-1 py-0.5 text-[10px] font-black transition-colors ${item.bold ? 'bg-white text-blue-700' : 'bg-white/20 hover:bg-white/40'}`}
                                                        title="عريض"
                                                    ><b>B</b></button>

                                                    <div className="w-px h-3 bg-white/30 mx-0.5" />

                                                    {/* لون النص */}
                                                    <label title="لون النص" className="cursor-pointer flex items-center" onMouseDown={e => e.stopPropagation()}>
                                                        <div className="w-4 h-4 rounded-full border-2 border-white shadow-inner" style={{ background: color }} />
                                                        <input
                                                            type="color"
                                                            value={color}
                                                            className="absolute opacity-0 w-0 h-0 pointer-events-none"
                                                            onChange={e => setTextItems(p => p.map(t => t.id === item.id ? { ...t, color: e.target.value } : t))}
                                                            onClick={e => e.stopPropagation()}
                                                            ref={el => { if (el) el.addEventListener('click', ev => ev.stopPropagation()); }}
                                                            style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px' }}
                                                            id={`color-${item.id}`}
                                                        />
                                                        <span
                                                            className="text-[9px] font-black opacity-80 mr-0.5 cursor-pointer"
                                                            onClick={e => { e.stopPropagation(); document.getElementById(`color-${item.id}`)?.click(); }}
                                                        >لون</span>
                                                    </label>

                                                    <div className="w-px h-3 bg-white/30 mx-0.5" />

                                                    {/* إغلاق المحرر */}
                                                    <button
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedTextId(null); setEditingTextId(null); }}
                                                        className="bg-white/20 hover:bg-emerald-500 rounded px-1.5 py-0.5 text-[9px] font-black transition-colors"
                                                        title="إغلاق المحرر"
                                                    >تم</button>

                                                    <div className="w-px h-3 bg-white/30 mx-0.5" />

                                                    {/* حذف */}
                                                    <button
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        onClick={(e) => { e.stopPropagation(); setTextItems(prev => prev.filter(t => t.id !== item.id)); if (selectedTextId === item.id) setSelectedTextId(null); }}
                                                        className="bg-white/10 hover:bg-red-500 rounded p-0.5 transition-colors"
                                                        title="حذف"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* ── منطقة النص ── */}
                                            <div
                                                className="relative bg-white border-2 border-blue-500 rounded-b-xl shadow-2xl overflow-hidden"
                                                style={{ height: `${itemH}px` }}
                                            >
                                                <textarea
                                                    className="w-full h-full bg-transparent outline-none resize-none p-3"
                                                    style={{
                                                        fontSize: `${fontSize}px`,
                                                        color: color,
                                                        fontWeight: item.bold ? 'bold' : 'normal',
                                                        direction: 'rtl',
                                                        fontFamily: 'Cairo, sans-serif'
                                                    }}
                                                    autoFocus
                                                    value={item.text}
                                                    placeholder="اكتب هنا..."
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setTextItems(prev => prev.map(t => t.id === item.id ? { ...t, text: value } : t));
                                                    }}
                                                    onKeyDown={(e) => { if (e.key === 'Escape' || (e.key === 'Enter' && e.ctrlKey)) { setEditingTextId(null); setSelectedTextId(null); } }}
                                                    onClick={e => e.stopPropagation()}
                                                    onMouseDown={e => e.stopPropagation()}
                                                />

                                                {/* ── مقبض resize الزاوية ── */}
                                                <div
                                                    className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-10 flex items-end justify-end pb-0.5 pr-0.5"
                                                    onMouseDown={(e) => startTextResize(e, item.id)}
                                                    title="اسحب لتغيير الحجم"
                                                >
                                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                        <path d="M9 1L1 9M9 5L5 9M9 9" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>,
                                pageLayer
                            );
                        })}
                    </div>

                    {/* Floating Instructions */}
                    {isDragMode && (
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-800/90 text-white px-6 py-3 rounded-full border border-slate-700 shadow-2xl backdrop-blur-md z-[70] flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                            <AlertCircle className="w-5 h-5 text-blue-400" />
                            <span className="font-bold text-sm">قم بسحب التوقيع للمكان المطلوب في الصفحة الحالية ثم اضغط "تثبيت"</span>
                        </div>
                    )}

                    {isTextMode && (
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full border border-blue-400 shadow-2xl z-[70] flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                            <Type className="w-5 h-5 text-white animate-pulse" />
                            <span className="font-bold text-sm">اضغط مرتين (Double Click) في أي مكان على الصفحة لإضافة نص</span>
                            <div className="h-4 w-px bg-white/30 mx-1" />
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs hover:bg-white/10"
                                onClick={() => setIsTextMode(false)}
                            >
                                إنهاء
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* نافذة مكبرة لاختيار التواقيع والأختام */}
            {isSigModalOpen && (
                <div
                    className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
                    dir="rtl"
                    onClick={() => setIsSigModalOpen(false)}
                >
                    <div
                        className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* رأس النافذة */}
                        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                                    <FileSignature className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-slate-800">
                                        استعراض   التوقيعات
                                    </h3>

                                </div>
                            </div>
                            <button
                                onClick={() => setIsSigModalOpen(false)}
                                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* شريط التحكم: التبديل بين القطاعات والبحث */}
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
                            {/* أزرار القطاعات */}
                            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                                {Object.entries(availableSignatures)
                                    .sort(([aKey], [bKey]) => {
                                        const aIdx = DEPARTMENT_DEFINITIONS.findIndex(d => d.id === aKey || d.key === aKey);
                                        const bIdx = DEPARTMENT_DEFINITIONS.findIndex(d => d.id === bKey || d.key === bKey);
                                        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                                        if (aIdx !== -1) return -1;
                                        if (bIdx !== -1) return 1;
                                        return aKey.localeCompare(bKey);
                                    })
                                    .map(([groupId, stamps]) => {
                                        const info = getGroupInfo(groupId);
                                        const isCurrent = (selectedSector === groupId) || (!selectedSector && groupId === Object.keys(availableSignatures)[0]);
                                        return (
                                            <button
                                                key={groupId}
                                                onClick={() => setSelectedSector(groupId)}
                                                className={`text-xs font-black px-4 py-2 rounded-xl whitespace-nowrap transition-all border flex items-center gap-2 cursor-pointer ${isCurrent
                                                        ? info.activeBtn
                                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <span>{info.label}</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isCurrent ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                    {stamps.length}
                                                </span>
                                            </button>
                                        );
                                    })}
                                {generalSignatures.length > 0 && (
                                    <button
                                        onClick={() => setSelectedSector('general')}
                                        className={`text-xs font-black px-4 py-2 rounded-xl whitespace-nowrap transition-all border flex items-center gap-2 cursor-pointer ${selectedSector === 'general'
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        <span>التوقيع العام (الشخصي)</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedSector === 'general' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            {generalSignatures.length}
                                        </span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedSector('all')}
                                    className={`text-xs font-black px-4 py-2 rounded-xl whitespace-nowrap transition-all border flex items-center gap-2 cursor-pointer ${selectedSector === 'all'
                                            ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    <span>جميع التواقيع والأختام</span>
                                </button>
                            </div>

                            {/* حقل البحث داخل المودال */}
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={sigSearchQuery}
                                    onChange={(e) => setSigSearchQuery(e.target.value)}
                                    placeholder="ابحث عن ختم بالاسم أو الرقم..."
                                    className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                                />
                                {sigSearchQuery && (
                                    <button
                                        onClick={() => setSigSearchQuery("")}
                                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* شبكة الأختام المكبرة */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-100/60">
                            {(() => {
                                let modalStampsList = [];
                                if (selectedSector === 'general') {
                                    modalStampsList = generalSignatures;
                                } else if (selectedSector === 'all') {
                                    modalStampsList = [...generalSignatures, ...Object.values(availableSignatures).flat()];
                                } else if (selectedSector && availableSignatures[selectedSector]) {
                                    modalStampsList = availableSignatures[selectedSector];
                                } else {
                                    const firstKey = Object.keys(availableSignatures)[0];
                                    modalStampsList = firstKey ? availableSignatures[firstKey] : generalSignatures;
                                }

                                if (sigSearchQuery.trim()) {
                                    modalStampsList = modalStampsList.filter(sig =>
                                        sig.FILE_NAME.toLowerCase().includes(sigSearchQuery.toLowerCase())
                                    );
                                }

                                if (modalStampsList.length === 0) {
                                    return (
                                        <div className="text-center py-20">
                                            <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                            <h4 className="text-base font-black text-slate-700">لا توجد أختام مطابقة</h4>
                                            <p className="text-xs text-slate-400 font-bold mt-1">جرب البحث بكلمات أخرى أو اختر قطاعاً آخر</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {modalStampsList.map((sig) => (
                                            <div
                                                key={sig.FILE_NAME}
                                                onClick={() => handleSelectSignature(sig)}
                                                className="group bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-500 p-3 flex flex-col items-center justify-between gap-3 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1"
                                            >
                                                <div className="w-full h-28 flex items-center justify-center p-2 bg-slate-50 rounded-xl group-hover:bg-blue-50/30 transition-colors">
                                                    <img
                                                        src={`/api/files/view?path=${encodeURIComponent(sig.SIGNATURE_PATH)}`}
                                                        alt={sig.FILE_NAME}
                                                        className="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-300 group-hover:scale-110"
                                                    />
                                                </div>
                                                <div className="w-full flex items-center justify-between pt-2 border-t border-slate-100">
                                                    <div className="flex flex-col truncate pr-1">
                                                        <span className="text-xs font-black text-slate-800 truncate flex items-center gap-1">
                                                            <span>{sig.actionInfo?.icon || '✍️'}</span>
                                                            <span>{sig.actionInfo?.label || sig.FILE_NAME}</span>
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold truncate">
                                                            {sig.FILE_NAME}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors whitespace-nowrap">
                                                        اختيار ✍️
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* تذييل النافذة */}
                        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-bold">
                            <span>اضغط على أي ختم لتحديده وسحبه على المستند</span>
                            <Button
                                variant="outline"
                                onClick={() => setIsSigModalOpen(false)}
                                className="rounded-xl px-5 text-xs font-bold cursor-pointer"
                            >
                                إغلاق
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PDFViewerPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">جاري تجهيز العارض...</p>
                </div>
            </div>
        }>
            <PDFViewerContent />
        </Suspense>
    );
}
