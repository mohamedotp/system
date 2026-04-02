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
} from "lucide-react";
import { toast } from "sonner";
import Draggable from "react-draggable";

const STAMP_GROUPS = {
    '1': { label: ' اختام للعرض', color: 'blue', bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200' },
    '2': { label: 'اختام اتخاذ اللازم ', color: 'emerald', bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-200' },
    '3': { label: 'اختام اخرى', color: 'slate', bg: 'bg-slate-700', text: 'text-slate-700', border: 'border-slate-200' },
    'other': { label: 'أختام أخرى', color: 'slate', bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-200' }
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

    // Drag & Drop state للتوقيع
    const [isDragMode, setIsDragMode] = useState(false);
    const [sigPos, setSigPos] = useState({ x: 50, y: 50 });
    const [sigSize, setSigSize] = useState({ width: 150, height: 70 });

    // مربعات النص القابلة للسحب فوق الـ PDF
    const [textItems, setTextItems] = useState([]); // {id, pageIndex, x, y, text}
    const [savingTexts, setSavingTexts] = useState(false);
    const [editingTextId, setEditingTextId] = useState(null);
    const [isTextMode, setIsTextMode] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
    const [hoveredSig, setHoveredSig] = useState(null); // حالة الختم الذي يتم الوقوف عليه حالياً
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

                // تجميع التواقيع بناءً على الجزء الموجود بعد الشرطة السفلية (مثلاً 1714_1.1 -> المجموعة 1)
                const grouped = json.signatures.reduce((acc, sig) => {
                    const parts = sig.FILE_NAME.split('_');
                    let groupId = 'other';
                    if (parts.length > 1) {
                        groupId = parts[1].split('.')[0]; // يأخذ الرقم قبل النقطة
                    }
                    if (!acc[groupId]) acc[groupId] = [];
                    acc[groupId].push(sig);
                    return acc;
                }, {});

                // ترتيب العناصر داخل كل مجموعة ترتيباً طبيعياً (1.1, 1.2, ..., 1.10)
                Object.keys(grouped).forEach(groupId => {
                    grouped[groupId].sort((a, b) =>
                        a.FILE_NAME.localeCompare(b.FILE_NAME, undefined, { numeric: true, sensitivity: 'base' })
                    );
                });

                console.log("📋 Grouped & sorted signatures:", grouped);
                setAvailableSignatures(grouped);

                // اختيار أول توقيع افتراضي من أول مجموعة متاحة
                const firstGroupId = Object.keys(grouped)[0];
                if (firstGroupId && grouped[firstGroupId].length > 0) {
                    console.log("✨ Setting default signature:", grouped[firstGroupId][0]);
                    setSignature(grouped[firstGroupId][0]);
                } else {
                    console.warn("⚠️ No signatures found in groups");
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

        const newId = Date.now();
        setTextItems(prev => [...prev, {
            id: newId,
            pageIndex,
            x: relX,
            y: relY,
            saveX: relX,    // موقع الحفظ الثابت (لا يتغير عند السحب)
            saveY: relY,    // موقع الحفظ الثابت (لا يتغير عند السحب)
            viewWidth: pageRect.width,
            viewHeight: pageRect.height,
            text: ""
        }]);
        setEditingTextId(newId);

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
            // Only update VISUAL position (x, y) - saveX/saveY stay unchanged
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

    const handleSaveTexts = async () => {
        if (!textItems.length) {
            toast.error("لا توجد نصوص لحفظها");
            return;
        }

        const textsPayload = textItems.map(item => {
            // Use saveX/saveY (original dblclick position) for PDF coordinate — drag only affects visual
            const sx = item.saveX ?? item.x;
            const sy = item.saveY ?? item.y;
            return {
                id: item.id,
                text: item.text,
                pageIndex: item.pageIndex,
                x: sx,
                y: item.viewHeight - sy,  // Convert browser top-origin → PDF bottom-origin
                viewWidth: item.viewWidth,
                viewHeight: item.viewHeight
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
                                        التوقيعات: {Object.keys(availableSignatures).length > 0
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

                        {Object.keys(availableSignatures).length > 0 ? (
                            <div className="space-y-6">
                                {Object.entries(availableSignatures)
                                    .sort(([aKey], [bKey]) => {
                                        const aNum = parseFloat(aKey);
                                        const bNum = parseFloat(bKey);
                                        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                                        if (!isNaN(aNum)) return -1;
                                        if (!isNaN(bNum)) return 1;
                                        return aKey.localeCompare(bKey);
                                    })
                                    .map(([groupId, stamps]) => {
                                        const sortedStamps = [...stamps].sort((a, b) =>
                                            a.FILE_NAME.localeCompare(b.FILE_NAME, undefined, { numeric: true, sensitivity: 'base' })
                                        );
                                        const groupInfo = STAMP_GROUPS[groupId] || STAMP_GROUPS['other'];
                                        return (
                                            <div key={groupId} className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                                                        {groupInfo.label}
                                                    </span>
                                                    <div className="h-px bg-slate-200 flex-1" />
                                                </div>

                                                {/* ... باقي الكود كما هو ... */}

                                                <div className="grid grid-cols-2 gap-2">
                                                    {Array.isArray(sortedStamps) && sortedStamps.map((sig) => (
                                                        <button
                                                            key={sig.FILE_NAME}
                                                            onMouseEnter={() => setHoveredSig(sig)}
                                                            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                                                            onMouseLeave={() => setHoveredSig(null)}
                                                            onClick={() => {
                                                                setHoveredSig(null); // أخفي المعاينة عند الاختيار لعدم التداخل
                                                                setSignature(sig);
                                                                // تفعيل وضع السحب مباشرة عند اختيار التوقيع
                                                                const pageEl = document.querySelector(`[data-testid="core__page-layer-${currentPage}"]`);
                                                                if (pageEl) {
                                                                    setPageSize({
                                                                        width: pageEl.clientWidth,
                                                                        height: pageEl.clientHeight
                                                                    });
                                                                }
                                                                setIsDragMode(true);
                                                            }}
                                                            // ✅ تم تعديل الـ className لإزالة الـ Styling الخاص بالـ Selected
                                                            className={`group relative transition-all duration-200 rounded-sm overflow-hidden p-1 border-2 flex flex-col items-center gap-1 cursor-pointer bg-slate-50 border-transparent hover:border-slate-300 hover:bg-white hover:shadow-md`}
                                                        >
                                                            <div className="w-full h-16 flex items-center justify-center p-1 bg-white border border-slate-100 rounded-sm group-hover:shadow-inner transition-all">
                                                                <img
                                                                    src={`/api/files/view?path=${encodeURIComponent(sig.SIGNATURE_PATH)}`}
                                                                    alt={sig.FILE_NAME}
                                                                    className="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-300 group-hover:scale-105"
                                                                />
                                                            </div>
                                                            <div className="w-full flex items-center justify-center py-0.5 px-1 bg-slate-100/50 group-hover:bg-slate-100 rounded-sm">
                                                                <span className={`text-[9px] font-bold truncate text-slate-500`}>
                                                                    {sig.FILE_NAME.split('_')[1] || sig.FILE_NAME}
                                                                </span>
                                                            </div>

                                                            {/* ✅ تم إزالة مؤشر الاختيار الأخضر (كان هنا) */}
                                                            {/* {signature?.FILE_NAME === sig.FILE_NAME && (
        <div className={`pointer-events-none absolute top-0 right-0 w-3 h-3 ${groupInfo.bg} flex items-center justify-center rounded-bl-sm`}>
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
        </div>
      )} */}

                                                            {/* Hint للمستخدم */}
                                                            <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-all pointer-events-none flex items-center justify-center">
                                                                <span className="text-[8px] font-black text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-1 py-0.5 rounded">
                                                                    اضغط للسحب
                                                                </span>
                                                            </div>

                                                            {/* 🔥 النافذة المنبثقة الشفافة للمعاينة */}
                                                            {hoveredSig?.FILE_NAME === sig.FILE_NAME && (
                                                                <div
                                                                    className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-200 shadow-2xl rounded-2xl border-4 border-white/50 backdrop-blur-xl bg-slate-900/40 p-6 flex items-center justify-center"
                                                                    style={{
                                                                        top: mousePos.y - 200,
                                                                        right: (window.innerWidth - mousePos.x) + 30,
                                                                        width: '450px',
                                                                        height: '350px'
                                                                    }}
                                                                >
                                                                    <img
                                                                        src={`/api/files/view?path=${encodeURIComponent(sig.SIGNATURE_PATH)}`}
                                                                        alt="Preview"
                                                                        className="max-w-full max-h-full object-contain drop-shadow-2xl"
                                                                    />
                                                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white text-xs font-black px-4 py-2 rounded-full whitespace-nowrap border border-white/20">
                                                                        🔎 معاينة مكبرة للختم: {sig.FILE_NAME.split('_')[1]}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* ... باقي الكود كما هو ... */}
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="p-4 bg-slate-50 rounded-full">
                                    <FileSignature className="w-8 h-8 text-slate-300" />
                                </div>
                                <p className="text-slate-400 text-sm font-bold">لا توجد أختام أو تواقيع متاحة لهذا المستخدم</p>
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

                            if (!textNodeRefs.current[item.id]) {
                                textNodeRefs.current[item.id] = { current: null };
                            }

                            return createPortal(
                                <div
                                    key={item.id}
                                    id={`text-item-${item.id}`}
                                    className="absolute z-[5000] pointer-events-auto"
                                    style={{ left: `${item.x}px`, top: `${item.y}px`, width: 'max-content' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Move Handle Bar - امسك منه وحرك */}
                                    <div
                                        className="w-full bg-blue-600 text-white flex items-center justify-between px-3 py-1.5 rounded-t-xl cursor-move shadow-lg select-none"
                                        onMouseDown={(e) => startTextDrag(e, item.id)}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <Move className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black">اسحب للتحريك</span>
                                        </div>
                                        <button
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTextItems(prev => prev.filter(t => t.id !== item.id));
                                            }}
                                            className="bg-white/10 hover:bg-red-500 rounded p-0.5 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="relative px-5 py-4 bg-black border-2 border-blue-600 rounded-b-xl shadow-2xl min-w-[200px]">
                                        {editingTextId === item.id ? (
                                            <div className="flex flex-col gap-2">
                                                <textarea
                                                    className="w-full bg-white border-2 border-amber-500 rounded p-3 outline-none resize-none text-xl font-black text-black shadow-inner min-h-[100px]"
                                                    autoFocus
                                                    value={item.text}
                                                    placeholder="اكتب ملاحظتك هنا..."
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setTextItems(prev =>
                                                            prev.map(t =>
                                                                t.id === item.id ? { ...t, text: value } : t
                                                            )
                                                        );
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && e.ctrlKey) {
                                                            setEditingTextId(null);
                                                        }
                                                    }}
                                                />
                                                <div className="text-[10px] text-slate-400 text-left">Ctrl+Enter للحفظ</div>
                                            </div>
                                        ) : (
                                            <div
                                                className="flex flex-col gap-1 pr-4 cursor-text"
                                                onDoubleClick={() => setEditingTextId(item.id)}
                                            >
                                                <div className="flex items-center gap-1.5 mb-1 opacity-70">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-sm" />
                                                    <span className="text-[10px] font-black text-white/50 tracking-wider">ملاحظة</span>
                                                </div>
                                                <span className="block text-xl font-black text-white leading-tight font-cairo whitespace-pre-wrap">
                                                    {item.text || "اضغط مرتين للكتابة..."}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>,
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
