"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Bell,
    Send,
    Search,
    Loader2,
    User,
    MessageSquare,
    Clock,
    CheckCheck,
    Reply,
    UserPlus,
    Link2,
    Trash2,
    X,
    MessageCircle,
    FileText,
    ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [user, setUser] = useState(null);
    const [isDeletingAll, setIsDeletingAll] = useState(false);

    // ارسال لرسالة جديدة
    const [showSendModal, setShowSendModal] = useState(false);
    const [searchEmp, setSearchEmp] = useState("");
    const [selectedReceiver, setSelectedReceiver] = useState(null);
    const [messageText, setMessageText] = useState("");

    // ربط مكاتبة
    const [searchDocTerm, setSearchDocTerm] = useState("");
    const [foundDocs, setFoundDocs] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [isSearchingDoc, setIsSearchingDoc] = useState(false);

    useEffect(() => {
        fetchData();
        fetchEmployees();
        fetchUser();
    }, []);

    const fetchUser = async () => {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (json.success) setUser(json.user);
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch("/api/import/transfer/employees");
            const json = await res.json();
            if (json.success) setEmployees(json.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/notifications");
            const json = await res.json();
            if (json.success) {
                // ترتيب الرسائل من الأحدث إلى الأقدم بناءً على الوقت
                const sortedData = [...json.data].sort((a, b) => {
                    return new Date(b.TIME_STR) - new Date(a.TIME_STR);
                });
                setNotifications(sortedData);
                
                if (json.data.some(n => n.READ_FLAG === 0)) {
                    await fetch("/api/notifications/read", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ all: true })
                    });
                }
            }
        } catch (err) {
            toast.error("فشل تحميل التنبيهات");
        } finally {
            setLoading(false);
        }
    };

    const searchDocs = async (term) => {
        if (!term || term.length < 2) {
            setFoundDocs([]);
            return;
        }
        setIsSearchingDoc(true);
        try {
            const res = await fetch(`/api/notifications/search-doc?search=${encodeURIComponent(term)}`);
            const json = await res.json();
            if (json.success) setFoundDocs(json.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearchingDoc(false);
        }
    };

    const handleSend = async () => {
        if (!selectedReceiver || !messageText.trim()) {
            toast.error("برجاء اختيار المستلم وكتابة الرسالة");
            return;
        }

        setSending(true);
        try {
            const res = await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receiverId: selectedReceiver.EMP_NUM,
                    message: messageText,
                    docNo: selectedDoc ? selectedDoc.DOC_NO : null
                })
            });
            const json = await res.json();
            if (json.success) {
                toast.success("تم إرسال التنبيه بنجاح");
                setShowSendModal(false);
                resetForm();
                fetchData();
            }
        } catch (err) {
            toast.error("فشل الإرسال");
        } finally {
            setSending(false);
        }
    };

    const handleClearAll = async () => {
        if (!confirm("هل أنت متأكد من حذف جميع التنبيهات؟ لا يمكن التراجع عن هذا الإجراء.")) return;

        setIsDeletingAll(true);
        try {
            const res = await fetch("/api/notifications", {
                method: "DELETE"
            });
            const json = await res.json();
            if (json.success) {
                toast.success("تم حذف جميع التنبيهات بنجاح");
                setNotifications([]);
            } else {
                toast.error(json.error || "فشل حذف التنبيهات");
            }
        } catch (err) {
            toast.error("خطأ في الاتصال بالسيرفر");
        } finally {
            setIsDeletingAll(false);
        }
    };

    const resetForm = () => {
        setMessageText("");
        setSelectedReceiver(null);
        setSelectedDoc(null);
        setSearchDocTerm("");
        setFoundDocs([]);
    };

    const handleOpenFile = async (path, docNo, docDate) => {
        if (!path && !docNo) {
            toast.error("بيانات المكاتبة غير متوفرة");
            return;
        }

        // 1. التوجه مباشرة لصفحة الوارد مع البحث عن رقم المكاتبة (بشكل دقيق)
        if (docNo) {
            let url = `/import?search=${docNo}&isExact=true`;
            if (docDate) url += `&date=${docDate}`;
            router.push(url);
            return;
        }

        // 2. إذا لم يكن هناك رقم مكاتبة (حالة نادرة)، نفتح الملف مباشرة
        let finalPath = path.trim().replace(/\//g, "\\");
        if (finalPath.match(/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/) || (finalPath.split('\\')[0].includes('-') && !finalPath.startsWith("\\"))) {
            finalPath = "\\\\" + finalPath;
        } else if (finalPath.startsWith("\\") && !finalPath.startsWith("\\\\")) {
            finalPath = "\\" + finalPath;
        }

        const lowerPath = finalPath.toLowerCase();
        const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp"];
        const docExtensions = [".pdf", ".docx", ".docm", ".xlsx", ".xls", ".doc"];
        let isPdf = lowerPath.endsWith(".pdf");
        const isImage = imageExtensions.some(ext => lowerPath.endsWith(ext));
        const hasExtension = docExtensions.some(ext => lowerPath.endsWith(ext)) || isImage;

        if (!hasExtension && !lowerPath.endsWith(".pdf")) {
            isPdf = true;
            finalPath += ".pdf";
        }

        if (isPdf || isImage) {
            window.open(`/pdf-viewer?file=${encodeURIComponent(finalPath)}`, '_blank');
            return;
        }

        // استخدام النظام الهجين للملفات الأخرى
        try {
            const res = await fetch("/api/memo/open-local", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: finalPath })
            });
            const json = await res.json();
            if (!json.success || json.isRemote) {
                window.location.href = `aoi-open:${finalPath}`;
            } else {
                toast.success("تم فتح الملف بنجاح");
            }
        } catch {
            window.location.href = `aoi-open:${finalPath}`;
        }
    };

    const filteredEmps = useMemo(() => {
        if (!searchEmp) return [];
        return employees.filter(e =>
            e.EMP_NAME.includes(searchEmp) ||
            e.EMP_NUM.toString().includes(searchEmp)
        ).slice(0, 5);
    }, [searchEmp, employees]);

    const handleReply = (notif) => {
        setSelectedReceiver({
            EMP_NUM: notif.SENDER_ID,
            EMP_NAME: notif.SENDER_NAME
        });
        setShowSendModal(true);
        setMessageText(`ردا على رسالتك: `);
    };

    const handleDeleteNotification = async (notifId) => {
        if (!confirm("هل أنت متأكد من حذف هذا التنبيه؟")) return;

        try {
            const res = await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId: notifId })
            });
            const json = await res.json();

            if (json.success) {
                toast.success("تم حذف التنبيه");
                // شيل التنبيه من الـ state
                setNotifications(prev => prev.filter(n => n.ID !== notifId));
            } else {
                toast.error(json.error || "فشل الحذف");
            }
        } catch (err) {
            toast.error("خطأ في الاتصال");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 rtl">
            {/* Header Area */}
            <div className="bg-slate-900 pt-16 pb-24 text-white">
                <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 text-right">
                        <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20">
                            <Bell className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black">مركز التنبيهات</h1>
                            <p className="text-slate-400 font-medium font-bold">تواصل وتابع المهام المطلوبة مع زملائك</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        {notifications.length > 0 && (
                            <Button
                                onClick={handleClearAll}
                                disabled={isDeletingAll}
                                variant="outline"
                                className="h-14 px-8 bg-red-600/10 border-red-500/50 hover:bg-red-600 text-red-400 hover:text-white rounded-2xl gap-3 font-black transition-all"
                            >
                                {isDeletingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                مسح الكل
                            </Button>
                        )}
                        {/* <Button
                        onClick={() => { setShowSendModal(true); resetForm(); }}
                        className="h-14 px-8 bg-blue-600 hover:bg-blue-500 rounded-2xl gap-2 font-black shadow-lg shadow-blue-900/50"
                    >
                        <UserPlus className="w-5 h-5" />
                        إرسال رسالة جديدة
                    </Button> */}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 -mt-12">
                {loading ? (
                    <div className="py-20 text-center bg-white rounded-[32px] shadow-xl">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
                        <p className="mt-4 text-slate-500 font-bold">جاري تحميل الرسائل...</p>
                    </div>
                ) : notifications.length > 0 ? (
                    <div className="space-y-4">
                        {notifications.map((notif, idx) => (
                            <Card key={notif.ID || `notif-${idx}`} className={`border-none shadow-lg rounded-3xl overflow-hidden transition-all hover:scale-[1.01] ${notif.READ_FLAG === 0 ? 'bg-blue-50/50 border-r-4 border-blue-500' : 'bg-white'}`}>
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${notif.READ_FLAG === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            {notif.SENDER_NAME?.charAt(0)}
                                        </div>
                                        <div className="flex-1 text-right">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="font-black text-slate-900">{notif.SENDER_NAME}</h3>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold">
                                                        <Clock className="w-3 h-3" />
                                                        {notif.TIME_STR}
                                                    </div>
                                                    <button 
                                                        onClick={() => handleDeleteNotification(notif.ID)}
                                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                        title="حذف هذا التنبيه"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-slate-600 font-medium leading-relaxed mb-4">{notif.MESSAGE}</p>

                                            {notif.DOC_NO && (
                                                <div className="mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="w-5 h-5 text-blue-500" />
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 font-black">مكاتبة مرتبطة</p>
                                                            <p className="text-xs font-bold text-slate-700">{notif.DOC_NO}</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleOpenFile(notif.DOC_PATH, notif.DOC_NO, notif.DOC_DATE)}
                                                        className="bg-white text-blue-600 border border-blue-100 hover:bg-blue-50 font-bold rounded-xl h-9"
                                                    >
                                                        <ExternalLink className="w-4 h-4 ml-2" />
                                                        فتح المكاتبة
                                                    </Button>


                                                </div>
                                            )}

                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                                {/* <Button
                                                    onClick={() => handleReply(notif)}
                                                    variant="ghost"
                                                    className="h-9 gap-2 text-blue-600 hover:bg-blue-50 font-black rounded-xl"
                                                >
                                                    <Reply className="w-4 h-4" />
                                                    رد سريع
                                                </Button> */}

                                                {notif.READ_FLAG === 1 && (
                                                    <div className="flex items-center gap-1 text-emerald-500">
                                                        <CheckCheck className="w-4 h-4" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">تم المشاهدة
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="py-32 text-center bg-white rounded-[32px] shadow-xl border border-dashed border-slate-200">
                        <MessageSquare className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <h2 className="text-xl font-black text-slate-800">لا توجد رسائل حالياً</h2>
                        <p className="text-slate-400 font-bold">رسائلك وتنبيهاتك ستظهر هنا فور وصولها</p>
                    </div>
                )}
            </div>

            {/* SEND MODAL */}
            {showSendModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowSendModal(false)} />
                    <Card className="relative w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border-none animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <MessageCircle className="w-6 h-6 text-blue-400" />
                                <h2 className="text-xl font-black">إرسال تنبيه جديد</h2>
                            </div>
                            <button onClick={() => setShowSendModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <CardContent className="p-8 space-y-6 text-right overflow-y-auto max-h-[80vh] custom-scrollbar" dir="rtl">
                            {!selectedReceiver ? (
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-slate-700 mr-1">ابحث عن الموظف</label>
                                    <div className="relative">
                                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="اكتب اسم الزميل..."
                                            value={searchEmp}
                                            onChange={(e) => setSearchEmp(e.target.value)}
                                            className="h-14 pr-12 rounded-2xl border-slate-200 font-bold"
                                            autoFocus
                                        />
                                    </div>

                                    {searchEmp && (
                                        <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-inner">
                                            {filteredEmps.map(emp => (
                                                <div
                                                    key={emp.EMP_NUM}
                                                    onClick={() => { setSelectedReceiver(emp); setSearchEmp(""); }}
                                                    className="p-4 hover:bg-blue-600 hover:text-white cursor-pointer transition-all flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black group-hover:bg-white">
                                                            {emp.EMP_NAME.charAt(0)}
                                                        </div>
                                                        <span className="font-bold">{emp.EMP_NAME}</span>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] opacity-50 group-hover:text-white group-hover:border-white">{emp.SEC_N}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="animate-in slide-in-from-right-4 duration-300 space-y-6">
                                    <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-black">
                                                {selectedReceiver.EMP_NAME.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">مستقبل الرسالة</p>
                                                <p className="font-black text-blue-900">{selectedReceiver.EMP_NAME}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedReceiver(null)} className="p-2 hover:bg-blue-200 rounded-xl text-blue-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* ربط مكاتبة */}
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <label className="text-sm font-black text-slate-700 mr-1 flex items-center gap-2">
                                            <Link2 className="w-4 h-4 text-blue-500" />
                                            ربط مكاتبة (اختياري)
                                        </label>

                                        {!selectedDoc ? (
                                            <div className="relative">
                                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    placeholder="بحث برقم المكاتبة أو الموضوع..."
                                                    value={searchDocTerm}
                                                    onChange={(e) => {
                                                        setSearchDocTerm(e.target.value);
                                                        searchDocs(e.target.value);
                                                    }}
                                                    className="h-12 pr-12 rounded-xl border-slate-200 font-bold bg-slate-50/50"
                                                />
                                                {isSearchingDoc && <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-600" />}

                                                {foundDocs.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                                                        {foundDocs.map(doc => (
                                                            <div
                                                                key={doc.DOC_NO}
                                                                onClick={() => { setSelectedDoc(doc); setFoundDocs([]); }}
                                                                className="p-3 hover:bg-blue-50 cursor-pointer transition-all border-b border-slate-50 last:border-0"
                                                            >
                                                                <p className="text-[10px] font-black text-blue-600 mb-1">{doc.DOC_NO}</p>
                                                                <p className="text-xs font-bold text-slate-700 truncate">{doc.SUBJECT}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-black">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div className="truncate max-w-[200px]">
                                                        <p className="text-[10px] text-emerald-600 font-black mb-0.5">مكاتبة مرتبطة مختارة</p>
                                                        <p className="text-xs font-bold text-emerald-900 truncate">{selectedDoc.DOC_NO}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-emerald-200 rounded-lg text-emerald-600">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <label className="text-sm font-black text-slate-700 mr-1">محتوى الرسالة</label>
                                        <textarea
                                            placeholder="اكتب ما تود إبلاغه لزميلك..."
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            className="w-full min-h-[120px] p-4 rounded-2xl border-2 border-slate-100 font-bold focus:border-blue-500 focus:ring-0 outline-none transition-all resize-none shadow-inner bg-slate-50/20"
                                        />

                                        <Button
                                            onClick={handleSend}
                                            disabled={sending || !messageText.trim()}
                                            className="w-full h-16 rounded-[24px] bg-slate-900 hover:bg-blue-600 text-white font-black text-lg shadow-xl shadow-blue-100 transition-all group active:scale-95"
                                        >
                                            {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                                <>
                                                    <Send className="w-5 h-5 ml-2 group-hover:-rotate-12 transition-transform" />
                                                    إرسال التنبيه الآن
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
