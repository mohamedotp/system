"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowRight,
    Clock,
    FileText,
    Send,
    CheckCircle2,
    AlertCircle,
    Printer,
    History,
    Users,
    UserCircle2,
    FileCheck2,
    Eye,
    Paperclip
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function TrackingPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [treeData, setTreeData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            fetchTracking(params.id);
        }
    }, [params.id]);

    const TYPE_CONFIG = {
        1: {
            color: 'from-blue-600 to-indigo-700',
            borderColor: 'border-blue-200 hover:border-blue-400',
            hoverBg: 'hover:bg-blue-600/5',
            icon: FileText,
            label: 'مكاتبة أصلية',
            badgeColor: 'bg-blue-100 text-blue-700'
        },
        2: {
            color: 'from-slate-600 to-slate-800',
            borderColor: 'border-slate-200 hover:border-slate-400',
            hoverBg: 'hover:bg-slate-600/5',
            icon: Send,
            label: 'تحويل',
            badgeColor: 'bg-slate-100 text-slate-700'
        },
        3: {
            color: 'from-emerald-600 to-teal-700',
            borderColor: 'border-emerald-200 hover:border-emerald-400',
            hoverBg: 'hover:bg-emerald-600/5',
            icon: CheckCircle2,
            label: 'رد رسمي',
            badgeColor: 'bg-emerald-100 text-emerald-700'
        }
    };

    const getTypeConfig = (node) => {
        return TYPE_CONFIG[node.TRANS_TYPE] || TYPE_CONFIG[2];
    };

    const buildTree = (items) => {
        if (!items || items.length === 0) return [];

        const groups = new Map();

        // 1. تجميع التحويلات/المكاتبات حسب (رقم المكاتبة + الراسل + النوع)
        items.forEach((item) => {
            const cleanReceiverId = String(item.RECEIVER_ID)?.trim();
            const cleanSenderId = String(item.SENDER_ID)?.trim();
            const cleanDocNo = String(item.DOC_NO)?.trim();
            const cleanParentDocNo = item.PARENT_DOC_NO ? String(item.PARENT_DOC_NO).trim() : null;

            const groupKey = `${cleanDocNo}_${cleanSenderId}_${item.TRANS_TYPE}`;

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    ...item,
                    receivers: [],
                    id: `GRP_${groupKey}`.replace(/\s+/g, '_'),
                    children: [],
                    _cleanSenderId: cleanSenderId,
                    _cleanDocNo: cleanDocNo,
                    _cleanParentDocNo: cleanParentDocNo,
                    _sendDate: new Date(item.SEND_DATE_STR || 0)
                });
            }

            const group = groups.get(groupKey);
            const exists = group.receivers.some(r => r.RECEIVER_ID === cleanReceiverId);
            if (!exists) {
                group.receivers.push({
                    RECEIVER_ID: cleanReceiverId,
                    RECEIVER_NAME: item.RECEIVER_NAME?.trim(),
                    RECEIVER_SEC: item.RECEIVER_SEC?.trim(),
                    SITUATION_DESC: item.SITUATION_DESC,
                    ANSERED_DESC: item.ANSERED_DESC,
                    SEEN_FLAG: item.SEEN_FLAG,
                    SEEN_DATE_STR: item.SEEN_DATE_STR
                });
            }
        });

        const allGroups = Array.from(groups.values());
        const roots = [];

        // 2. ربط المجموعات ببعضها البعض لبناء مسار الحركة
        allGroups.forEach(node => {
            let potentialParent = null;

            const candidates = allGroups.filter(p => {
                if (p.id === node.id) return false;

                // يجب أن يكون الأب قد أرسل المكاتبة قبل الحركة الحالية أو في نفس التوقيت
                if (p._sendDate > node._sendDate) return false;

                const wasReceiverInP = p.receivers?.some(r =>
                    String(r.RECEIVER_ID).trim() === String(node._cleanSenderId)
                );
                if (!wasReceiverInP) return false;

                // الربط يكون عبر PARENT_DOC_NO أو نفس المستند أو أي استلام سابق صادر من الشخص
                if (node._cleanParentDocNo) {
                    return String(p._cleanDocNo) === String(node._cleanParentDocNo)
                        || String(p._cleanDocNo) === String(node._cleanDocNo);
                } else {
                    // الأولوية دائماً لآخر استلام وصل لهذا الشخص قبل أن يقوم بالحركة الحالية
                    return String(p._cleanDocNo) === String(node._cleanDocNo)
                        || node.TRANS_TYPE === 2
                        || node.TRANS_TYPE === 3;
                }
            });

            if (candidates.length > 0) {
                // ترتيب المُرشحين من الأحدث إلى الأقدم (بالنسبة لتاريخ إرسال الأب)
                candidates.sort((a, b) => b._sendDate - a._sendDate);

                // نختار "أحدث استلام" وصل للشخص قبل قيامه بالتحويل/الرد الحالي
                potentialParent = candidates[0];

                // لو وجدنا مكاتبة لها نفس الرقم وParentDocNo، نأخذها للتأكيد
                const docMatch = candidates.find(c =>
                    String(c._cleanDocNo) === String(node._cleanDocNo || node._cleanParentDocNo)
                );
                if (docMatch && (candidates[0]._sendDate - docMatch._sendDate < 1000 * 60)) {
                    potentialParent = docMatch;
                }
            }

            if (potentialParent) {
                if (!potentialParent.children.some(c => c.id === node.id)) {
                    potentialParent.children.push(node);
                }
            } else {
                roots.push(node);
            }
        });

        return roots;
    };

    const openFile = async (fileName, docNo) => {
        if (!fileName) {
            toast.error("لا يوجد مسار ملف لهذه المكاتبة");
            return;
        }

        let rawPath = fileName.split('|').filter(p => !!p)[0];
        if (!rawPath) return;

        let finalPath = rawPath.trim().replace(/\//g, "\\");
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
                if (json.isRemote) window.location.href = `aoi-open:${finalPath}`;
                else toast.success("تم فتح الملف بنجاح");
            } else {
                window.location.href = `aoi-open:${finalPath}`;
            }
        } catch (e) {
            window.location.href = `aoi-open:${finalPath}`;
        }
    };

    const fetchTracking = async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/tracking?docNo=${id}`);
            const json = await res.json();
            if (json.success) {
                setData(json);
                const tree = buildTree(json.history);
                setTreeData(tree);
            } else {
                toast.error(json.error || "فشل جلب البيانات");
            }
        } catch (err) {
            toast.error("خطأ في الاتصال بالسيرفر");
        } finally {
            setLoading(false);
        }
    };

    const TreeNode = ({ node, isLast, level = 0 }) => {
        const hasChildren = node.children && node.children.length > 0;
        const config = getTypeConfig(node);

        return (
            <div className="flex items-start relative group/tree">
                {/* 1. Node Card Container */}
                <div className={`relative z-10 p-2 rounded-[38px] transition-all duration-500`}>
                    <div className={`relative p-5 rounded-[30px] border-2 transition-all duration-500 shadow-lg min-w-[320px] max-w-md
                    group scale-90 origin-right opacity-90
                    hover:scale-105 hover:-translate-y-2 hover:shadow-[0_25px_60px_rgba(0,0,0,0.15)] hover:p-8 hover:rounded-[40px] hover:opacity-100
                    bg-white ${config.borderColor} font-cairo`}>

                        {/* الشريط الملون الجانبي */}
                        <div className={`absolute right-0 top-10 bottom-10 w-2 rounded-r-[28px] bg-gradient-to-b ${config.color} shadow-lg`} />
                        <div className={`absolute inset-0 rounded-[40px] bg-gradient-to-br ${config.color} opacity-[0.02] pointer-events-none`} />

                        {/* Header */}
                        <div className="flex items-center justify-between mb-4 group-hover:mb-6 transition-all">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 group-hover:w-14 group-hover:h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all group-hover:rotate-12 bg-gradient-to-br ${config.color}`}>
                                    {(() => {
                                        const Icon = config.icon;
                                        return <Icon className="w-6 h-6 group-hover:w-7 group-hover:h-7 transition-all" />;
                                    })()}
                                </div>
                                <div className="space-y-0.5">
                                    <Badge variant="outline" className="text-[10px] font-black border-slate-200 text-slate-500 h-5 px-2">
                                        #{node.DOC_NO}
                                    </Badge>
                                    <Badge className={`${config.badgeColor} border-none text-[11px] font-black px-2 py-0.5 shadow-sm`}>
                                        {config.label}
                                    </Badge>
                                </div>
                            </div>
                            <div className="text-left">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">تاريخ الصدور</p>
                                <p className="text-[12px] font-black text-slate-700 mt-1">{node.DOC_DATE_STR}</p>
                            </div>
                        </div>

                        {/* Subject */}
                        <div className="mb-4 group-hover:mb-6 pr-1 transition-all">
                            <div className="flex items-center gap-2 mb-2 group-hover:mb-3">
                                <FileCheck2 className="w-4 h-4 text-slate-400" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الموضوع</p>
                            </div>
                            <h3 className="font-extrabold text-slate-900 text-[15px] group-hover:text-[17px] leading-relaxed line-clamp-2 transition-all group-hover:line-clamp-none bg-slate-50/80 p-3 group-hover:p-4 rounded-xl group-hover:rounded-2xl border border-slate-100 shadow-inner">
                                {node.SUBJECT}
                            </h3>
                        </div>

                        {/* Attachments Section */}


                        {/* Sender & Receivers */}
                        <div className="space-y-4">
                            {/* Sender Info */}
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className={`w-12 h-12 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center text-lg font-black text-slate-700 shrink-0 shadow-sm`}>
                                    {node.SENDER_NAME?.trim().charAt(0)}
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <p className="text-[15px] font-black text-slate-800 truncate mb-0.5">{node.SENDER_NAME}</p>
                                    <p className="text-[11px] font-bold text-slate-500 truncate">{node.SENDER_SEC}</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-slate-400 rotate-180 shrink-0" />
                            </div>

                            {/* Recipients Section */}
                            <div className="pr-2">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-4 h-4 text-slate-400" />
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">المستلمين لهذا الإجراء</p>
                                </div>

                                {/* Summary View (Default) */}
                                <div className="flex flex-wrap gap-2 group-hover/tree:hidden group-hover:hidden">
                                    {node.receivers?.slice(0, 3).map((r, i) => (
                                        <Badge key={i} className={`${config.badgeColor} border-none text-[11px] font-bold px-3 py-1.5 shadow-sm`}>
                                            {r.RECEIVER_NAME?.trim().split(' ')[0]}
                                        </Badge>
                                    ))}
                                    {node.receivers?.length > 3 && (
                                        <Badge variant="outline" className="text-[11px] font-bold text-slate-500 px-3 py-1.5 border-slate-200 bg-white">
                                            +{node.receivers.length - 3} آخرين
                                        </Badge>
                                    )}
                                </div>

                                {/* Expanded List (Hover) */}
                                <div className="hidden group-hover:block animate-in fade-in slide-in-from-top-3 duration-300">
                                    <div className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl border-2 border-slate-100 space-y-3.5 shadow-inner">
                                        {node.receivers?.map((receiver, idx) => (
                                            <div key={idx} className={`${idx > 0 ? 'pt-3.5 border-t border-slate-100' : ''}`}>
                                                <div className="flex items-start gap-4 mb-2.5">
                                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-white shrink-0 shadow-md`}>
                                                        <UserCircle2 className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[14px] font-black text-slate-900 leading-tight">{receiver.RECEIVER_NAME}</p>
                                                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">{receiver.RECEIVER_SEC}</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2.5 mr-13">
                                                    {receiver.SEEN_FLAG === 1 ? (
                                                        <Badge className="bg-blue-100/80 text-blue-800 border-none text-[11px] font-black px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                                                            <Eye className="w-3.5 h-3.5" />
                                                            تمت المشاهدة
                                                            {receiver.SEEN_DATE_STR && (
                                                                <span className="text-[10px] opacity-70 border-r border-blue-200 pr-1.5 mr-1.5">
                                                                    {receiver.SEEN_DATE_STR}
                                                                </span>
                                                            )}
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-slate-100/80 text-slate-500 border-none text-[11px] font-black px-3 py-1.5 shadow-sm">
                                                            <Clock className="w-3.5 h-3.5 ml-1.5 inline" />
                                                            لم تتم المشاهدة بعد
                                                        </Badge>
                                                    )}

                                                    {receiver.SITUATION_DESC && (
                                                        <Badge className="bg-amber-100/80 text-amber-700 border-none text-[11px] font-black px-3 py-1.5">
                                                            <Clock className="w-3.5 h-3.5 ml-1.5 inline" />
                                                            {receiver.SITUATION_DESC}
                                                        </Badge>
                                                    )}
                                                    {receiver.ANSERED_DESC && receiver.ANSERED_DESC !== 'لم يتم الرد' && (
                                                        <Badge className="bg-emerald-100/80 text-emerald-800 border-none text-[11px] font-black px-3 py-1.5">
                                                            <CheckCircle2 className="w-3.5 h-3.5 ml-1.5 inline" />
                                                            {receiver.ANSERED_DESC}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer - Date and Count */}
                        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 text-slate-500">
                                <Clock className="w-4.5 h-4.5" />
                                <span className="text-[12px] font-black">{node.SEND_DATE_STR}</span>
                            </div>
                            {hasChildren && (
                                <Badge className="bg-slate-900 text-white border-none text-[10px] font-black h-7 px-4 rounded-full shadow-lg">
                                    {node.children.length} مَسار تالي
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Connection Line (Animated) */}
                    {hasChildren && (
                        <div className="absolute left-[-100px] top-1/2 -translate-y-1/2 w-[100px] h-[5px] z-0">
                            <div className="w-full h-full bg-gradient-to-r from-slate-200 via-slate-400 to-slate-500 opacity-80 rounded-full shadow-sm" />
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-xl bg-gradient-to-br ${config.color} animate-pulse`} />
                        </div>
                    )}
                </div>

                {/* 2. Horizontal Connector Arrow */}
                {hasChildren && (
                    <div className="w-[100px] h-[5px] bg-gradient-to-r from-slate-300 via-slate-500 to-slate-300 relative flex-shrink-0 rounded-full shadow-md">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 border-y-[10px] border-y-transparent border-l-[12px] border-l-slate-600 drop-shadow-md" />
                    </div>
                )}

                {/* 3. Children Stack */}
                {hasChildren && (
                    <div className="flex flex-col gap-16 relative">
                        {/* الخط الرأسي الرئيسي الواصل بين الأبناء */}
                        <div className="absolute right-[48px] top-0 bottom-0 w-[3px] bg-gradient-to-b from-slate-200 via-slate-400 to-slate-200 rounded-full shadow-inner" />

                        {node.children.map((child, idx) => {
                            const isFirst = idx === 0;
                            const isLast = idx === node.children.length - 1;

                            return (
                                <div key={child.id} className="relative flex items-center">
                                    {/* خط الربط المنحني L-Shape Connector */}
                                    <div
                                        className={`absolute right-[48px] w-[52px] border-slate-400 ${node.children.length === 1
                                            ? 'h-[3px] top-1/2 border-t-[3px]'
                                            : isFirst
                                                ? 'h-1/2 bottom-0 border-r-[3px] border-t-[3px] rounded-tr-3xl'
                                                : isLast
                                                    ? 'h-1/2 top-0 border-r-[3px] border-b-[3px] rounded-br-3xl'
                                                    : 'h-full border-r-[3px] border-t-[3px]'
                                            }`}
                                    />

                                    {/* سهم صغير عند نهاية الخط قبل الكارت مباشرة */}
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-500 border-2 border-white shadow-md ring-4 ring-slate-100/50" />

                                    <div className="mr-12">
                                        <TreeNode
                                            node={child}
                                            level={level + 1}
                                            isLast={isLast}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-cairo">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <History className="w-16 h-16 text-blue-500 animate-spin opacity-20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Clock className="w-8 h-8 text-blue-600 animate-bounce" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-black text-slate-900">جاري بناء  خريطة التتبع</p>
                        <p className="text-slate-500 font-bold text-sm mt-2">يتم الآن تجميع كافة التحويلات والردود وتنسيق المسارات...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!data || !data.history.length) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-cairo">
                <Card className="max-w-md w-full p-12 text-center space-y-8 rounded-[48px] border-none shadow-2xl relative overflow-hidden bg-white">
                    <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
                    <AlertCircle className="w-24 h-24 text-slate-100 mx-auto" />
                    <div>
                        <h2 className="text-3xl font-black text-slate-800">لم يتم العثور على أي حركة</h2>
                        <p className="text-slate-500 font-bold mt-4 leading-relaxed">عفواً، لا توجد أي بيانات تتبع مسجلة لهذه المكاتبة حالياً.</p>
                    </div>
                    <Button
                        onClick={() => router.back()}
                        className="w-full h-16 rounded-[24px] bg-slate-900 text-white font-black hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95 text-lg"
                    >
                        العودة للخلف
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-24 rtl select-none font-cairo" dir="rtl">
            {/* Header Section */}
            <div className="bg-slate-950 pt-20 pb-56 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] -mr-80 -mt-80" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] -ml-40 -mb-40" />

                <div className="max-w-[1500px] mx-auto px-10 relative z-10">
                    <div className="flex items-center justify-between mb-20">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-4 text-slate-400 hover:text-white transition-all group bg-white/5 border border-white/5 px-8 py-3.5 rounded-2xl hover:bg-white/10 shadow-lg"
                        >
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            <span className="font-extrabold text-base">العـودة للمنظومـة</span>
                        </button>

                        <div className="flex gap-5">
                            <Button
                                onClick={() => window.print()}
                                className="bg-white/5 border border-white/10 hover:bg-white/20 text-white rounded-2xl gap-3.5 h-14 px-10 font-black shadow-2xl transition-all"
                            >
                                <Printer className="w-6 h-6 text-blue-400" />
                                طباعـة التقرير
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
                        <div className="flex items-start gap-10">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-blue-500 rounded-[35%] blur-3xl opacity-30 group-hover:opacity-50 transition-opacity" />
                                <div className="w-28 h-28 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-800 rounded-[35%] flex items-center justify-center shadow-3xl transform rotate-12 transition-all hover:rotate-0 hover:scale-110 relative z-10">
                                    <History className="w-14 h-14 text-white transform -rotate-12 group-hover:rotate-0" />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <h1 className="text-6xl font-black tracking-tight leading-tight">خريطة تتبع المكاتبة</h1>
                                <div className="flex items-center gap-5">
                                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 pr-2.5 pl-5 py-2.5 rounded-2xl flex items-center gap-4 shadow-2xl">
                                        <div className="bg-blue-500 text-white text-[11px] font-black px-4 py-1.5 rounded-xl shadow-lg uppercase">رقم الملف</div>
                                        <span className="text-xl font-black text-white">#{data.mainDoc}</span>
                                    </div>
                                    <div className="h-6 w-px bg-white/20" />
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <FileText className="w-5 h-5" />
                                        <span className="text-[17px] font-bold truncate max-w-xl">{data.history[0].SUBJECT}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Summary */}
                        <div className="flex flex-col items-end gap-4 bg-white/5 backdrop-blur-2xl p-8 rounded-[40px] border border-white/10 shadow-3xl">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">إحصائيات مسار الوثيقة</p>
                            <div className="flex gap-10">
                                <div className="text-center">
                                    <p className="text-3xl font-black text-white">{data.history.length}</p>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">إجمالي الحركات</p>
                                </div>
                                <div className="w-px h-12 bg-white/10" />
                                <div className="text-center">
                                    <p className="text-3xl font-black text-emerald-400">{data.history.filter(i => i.TRANS_TYPE === 3).length}</p>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">تم الرد رسمياً</p>
                                </div>
                                <div className="w-px h-12 bg-white/10" />
                                <div className="text-center">
                                    <p className="text-3xl font-black text-blue-400">{treeData.length > 0 ? treeData[0].children.length : 0}</p>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">تفريعات مباشرة</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tree Section */}
            <div className="max-w-[1700px] mx-auto px-10 -mt-32 relative z-20">

                {/* Legend - Floating Bar at Top */}
                <div className="flex justify-center mb-8">
                    <div className="bg-white/80 backdrop-blur-2xl border border-white px-10 py-5 rounded-[30px] shadow-2xl flex flex-wrap gap-12 items-center animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="flex items-center gap-3 border-l border-slate-200 pl-8 ml-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <History className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-sm font-black text-slate-800 tracking-tight">دليل الرموز للألوان</span>
                        </div>
                        {Object.entries(TYPE_CONFIG).map(([type, config]) => (
                            <div key={type} className="group cursor-default flex items-center gap-4 transition-all hover:scale-110">
                                <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${config.color} shadow-lg ring-4 ring-white transition-transform group-hover:scale-125`} />
                                <span className="text-sm font-black text-slate-600 group-hover:text-slate-900 transition-colors">{config.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tree Section - Native Scrollbar at Top (using rotateX trick) */}
                <div className="overflow-x-auto custom-scrollbar-h pt-10 pb-0" style={{ transform: 'rotateX(180deg)' }}>
                    <div className="inline-block min-w-full" style={{ transform: 'rotateX(180deg)' }}>
                        <div className="bg-white/90 backdrop-blur-2xl border border-white rounded-[70px] p-24 shadow-[0_60px_120px_rgba(0,0,0,0.08)] relative overflow-hidden">
                            {/* Dynamic Background Elements */}
                            <div className="absolute top-12 left-12 flex items-center gap-3 animate-pulse">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">تحرك للعرض الأفقي وشاهد التفاصيل بالوقوف على الحركة</p>
                                <Eye className="w-5 h-5 text-slate-300" />
                            </div>
                            <div className="absolute bottom-20 right-20 text-[220px] font-black text-slate-50/40 select-none pointer-events-none -z-10 leading-none tracking-tighter">
                                TRACK
                            </div>



                            {/* Render Tree */}
                            <div className="relative py-12 flex justify-start" dir="rtl">
                                {treeData.map((root, idx) => (
                                    <TreeNode
                                        key={root.id}
                                        node={root}
                                        isLast={idx === treeData.length - 1}
                                    />
                                ))}
                            </div>


                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-16 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.5em] opacity-40 pb-16">
                نظام الأرشفة المتقدم - جميع الحقوق محفوظة لهيئة التصنيع
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500;600;700;800;900;1000&display=swap');
                
                .font-cairo {
                    font-family: 'Cairo', sans-serif !important;
                }

                @media print {
                    nav, button, aside, .no-print { display: none !important; }
                    .bg-slate-950 { background: white !important; color: black !important; padding-top: 3rem !important; }
                    .text-white, .text-slate-400, .text-slate-500 { color: black !important; }
                    .shadow-3xl, .shadow-2xl, .shadow-xl, .shadow-lg { box-shadow: none !important; }
                    .border { border: 1px solid #eee !important; }
                    body { background: white !important; }
                    .-mt-32 { margin-top: 0 !important; }
                    .rounded-[70px], .rounded-[40px] { border-radius: 30px !important; }
                    .overflow-x-auto { overflow: visible !important; }
                    .max-w-[1700px] { max-width: 100% !important; border: none !important; }
                }

                .custom-scrollbar-h::-webkit-scrollbar { height: 10px; }
                .custom-scrollbar-h::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 20px; }
                .custom-scrollbar-h::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; border: 3px solid #f1f5f9; }
                .custom-scrollbar-h::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                
                .overflow-x-auto {
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                }
            `}</style>
        </div>
    );
}