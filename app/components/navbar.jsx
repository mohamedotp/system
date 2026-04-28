// app/components/navbar.jsx
"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  ChevronDown,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  File,
  LogIn,
  FolderOpen,
  FileText,
  Send,
  Sparkles,
  Bell,
  MessageSquare,
  Volume2,
  FileSignature,
  Monitor,
  Layers
} from "lucide-react";
import { useNotificationSound } from "@/lib/sounds";

const SOUND_LABELS = {
  samsung: "نغمة سامسونج",
  crystal: "نغمة كريستال",
  marimba: "ماريمبا",
  bubbles: "فقاعات"
};

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedSound, setSelectedSound] = useState("samsung");
  const [notifPermission, setNotifPermission] = useState("default");
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);

  const { playSound } = useNotificationSound();
  const userDropdownRef = useRef(null);
  const hasShownWelcome = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  // تحميل الصوت المفضل عند بداية التشغيل
  useEffect(() => {
    const saved = localStorage.getItem("user_notif_sound");
    if (saved) setSelectedSound(saved);
  }, []);

  // جلب بيانات المستخدم
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          if (!hasShownWelcome.current) {
            toast.success(`مرحباً بك، ${data.user.empName}`);
            hasShownWelcome.current = true;
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      }
    };
    fetchUser();
  }, [pathname]);

  // جلب التنبيهات
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      // إضافة timestamp لمنع الكاش نهائياً وضمان جلب البيانات اللحظية
      const res = await fetch(`/api/notifications?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      const json = await res.json();
      if (json.success) {
        // التحقق من أن READ_FLAG هو 0 (سواء كان رقماً أو نصاً)
        const unreadRows = json.data.filter(n => String(n.READ_FLAG) === "0");
        const newUnreadCount = unreadRows.length;

        // التنبيه فقط إذا زاد عدد الرسائل غير المقروءة
        setUnreadCount(prev => {
          if (newUnreadCount > prev) {
            playSound(selectedSound);
            const latest = unreadRows[0];
            if (latest) {
              toast.info(`رسالة من ${latest.SENDER_NAME}: ${latest.MESSAGE}`, {
                action: { label: "عرض", onClick: () => router.push("/notifications") }
              });

              // تأكيد القراءة فوراً حتى لا يضطر المستخدم للذهاب لصفحة التنبيهات
              fetch("/api/notifications/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notifId: latest.NOTIF_ID || latest.ID })
              }).catch(e => console.error("Mark read error:", e));
            }
          }
          return newUnreadCount;
        });
        setNotifications(json.data);
      }
    } catch (err) {
      console.error("Fetch Notif Error:", err);
    }
  };

  // --- نظام التنبيهات الخارجية (Push Notifications) ---
  const registerPushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn("Notifications are not supported in this browser.");
      return;
    }

    try {
      setNotifPermission(Notification.permission);
      if (Notification.permission !== 'granted') return;

      const registration = await navigator.serviceWorker.register('/sw.js');
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        setIsPushSubscribed(true);
        // تحديث السيرفر دائماً للتأكد
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        setIsPushSubscribed(false);
      }
    } catch (err) {
      console.error("Push registration error:", err);
    }
  };

  const handleManualSubscription = async () => {
    try {
      if (!window.isSecureContext) {
        toast.error("التنبيهات تتطلب اتصالاً آمناً (HTTPS) أو العمل على localhost أو تفعيل ميزة Origin Secure في المتصفح");
        return;
      }

      // 1. طلب الإذن
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);

      if (permission === 'granted') {
        console.log("Permission granted. Registering Service Worker...");
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none'
        });

        // الانتظار حتى يصبح الـ Service Worker جاهزاً تماماً
        const swReady = await navigator.serviceWorker.ready;
        console.log("Service Worker ready.");

        // تأمين وجود controller
        if (!navigator.serviceWorker.controller) {
          console.log("Waiting for controller claim...");
          await new Promise(resolve => {
            if (navigator.serviceWorker.controller) return resolve();
            navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
            // Fallback timeout
            setTimeout(resolve, 1000);
          });
        }

        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) {
          toast.error("خطأ: مفتاح التنبيهات VAPID غير موجود");
          return;
        }

        // 2. محاولة الاشتراك
        try {
          // مسح أي اشتراك قديم عالق لنفس العامل
          const existingSub = await swReady.pushManager.getSubscription();
          if (existingSub) {
            console.log("Unsubscribing from existing subscription...");
            await existingSub.unsubscribe();
          }

          console.log("Subscribing with key...");
          const subscription = await swReady.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });

          console.log("Push Subscription successful. Saving to server...");
          const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            body: JSON.stringify(subscription),
            headers: { 'Content-Type': 'application/json' }
          });

          const resJson = await response.json();
          if (resJson.success) {
            setIsPushSubscribed(true);
            toast.success("تم تفعيل تنبيهات سطح المكتب بنجاح");
          } else {
            toast.error("فشل حفظ الاشتراك على السيرفر: " + resJson.error);
          }
        } catch (subErr) {
          console.error("Subscription phase error:", subErr);
          if (subErr.name === 'AbortError' || subErr.message.includes("push service error")) {
            toast.error("حدث خطأ في خدمة المتصفح (Push Service Error). برجاء الضغط على 'إعادة ضبط' ثم المحاولة مرة أخرى.");
          } else {
            toast.error("فشل الاشتراك: " + subErr.message);
          }
        }
      } else {
        toast.error("تم رفض إذن التنبيهات من قبل المستخدم");
      }
    } catch (err) {
      console.error("Manual subscription error:", err);
      toast.error(`خطأ فني: ${err.message || "فشل غير معروف"}`);
    }
  };

  const resetNotifications = async () => {
    try {
      // 1. مسح الاشتراكات برمجياً
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        await reg.unregister();
        console.log("Unregistered a Service Worker.");
      }

      // 2. مسح الكاش (إن وجد)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      setIsPushSubscribed(false);
      setNotifPermission(Notification.permission);
      toast.success("تم تنظيف التنبيهات بنجاح. يمكنك المحاولة الآن.");
    } catch (err) {
      console.error("Reset error:", err);
      toast.error("فشل إعادة الضبط بالكامل");
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      registerPushNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]); // التحديث فقط عند تغيير المستخدم

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    hasShownWelcome.current = false;
    router.push("/login");
    router.refresh();
  };

  return (
    <TooltipProvider>
      <nav className="flex items-center justify-between px-4 md:px-8 py-3 bg-slate-950 border-b border-slate-800 shadow-xl sticky top-0 z-50">
        <div className="flex items-center gap-4 md:gap-8">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-10 h-10 md:w-12 md:h-12 bg-white/90 rounded-lg p-1 shadow-lg">
                <Image
                  src="/logo.png"
                  alt="شعار المنشأة"
                  fill
                  sizes="(max-width: 768px) 40px, 48px"
                  className="object-contain"
                  priority
                />
            </div>
          </Link>

          <ul className="hidden md:flex items-center gap-1">
            <li className="relative group">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800 gap-2 font-medium h-10">
                <Users className="w-4 h-4" />
                الموظفين
                <ChevronDown className="w-3 h-3 text-slate-500 group-hover:rotate-180 transition-transform duration-300" />
              </Button>
              <div className="absolute top-full right-0 mt-1 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 z-50 overflow-hidden text-right">
                <Link href="/employee" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-blue-600/20 transition-colors">
                  <Wallet className="w-4 h-4 text-blue-500" />
                  <span>كشوف المرتبات</span>
                </Link>
              </div>
            </li>
          </ul>

          <ul className="hidden md:flex items-center gap-1">
            <li className="relative group">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800 gap-2 font-medium h-10">
                <FolderOpen className="w-4 h-4" />
                سجل المكاتبات
                <ChevronDown className="w-3 h-3 text-slate-500 group-hover:rotate-180 transition-transform duration-300" />
              </Button>
              <div className="absolute top-full right-0 mt-1 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 z-50 overflow-hidden text-right">
                <Link href="/import" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-blue-600/20 transition-colors">
                  <File className="w-4 h-4 text-blue-500" />
                  <span>الوارد</span>
                </Link>
                <Link href="/export" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-emerald-600/20 transition-colors border-t border-slate-800/50">
                  <Send className="w-4 h-4 text-emerald-500" />
                  <span>الصادر</span>
                </Link>
                <Link href="/memo/create" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-blue-600/20 transition-colors border-t border-slate-800/50">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>إنشاء مذكرة جديدة</span>
                </Link>
                <Link href="/memo/templates" className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors border-t border-slate-800/50 font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>اضافة قالب جديد</span>
                </Link>
              </div>
            </li>
          </ul>

          {/* Product System Link - Restricted to authorized users */}
          {user && ["1714", "1732"].includes(String(user.empNum)) && (
            <ul className="hidden md:flex items-center gap-1">
              <li className="relative group">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800 gap-2 font-medium h-10">
                  <Monitor className="w-4 h-4" />
                  نظام المنتجات
                  <ChevronDown className="w-3 h-3 text-slate-500 group-hover:rotate-180 transition-transform duration-300" />
                </Button>
                <div className="absolute top-full right-0 mt-1 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 z-50 overflow-hidden text-right">
                  <Link href="/products" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-blue-600/20 transition-colors">
                    <Monitor className="w-4 h-4 text-blue-500" />
                    <span>عرض المنتجات</span>
                  </Link>
                  <Link href="/products/manage" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-emerald-600/20 transition-colors border-t border-slate-800/50">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <span>إدارة البيانات</span>
                  </Link>
                </div>
              </li>
            </ul>
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {user && (
            <>


              <Link href="/notifications" className="relative p-2 rounded-xl hover:bg-slate-800 transition-all group">
                <Bell className={`w-6 h-6 transition-colors ${unreadCount > 0 ? "text-blue-500 animate-pulse" : "text-slate-400 group-hover:text-blue-400"}`} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-red-900/50 border-2 border-slate-950">
                    {unreadCount}
                  </span>
                )}
              </Link>

              {/* {(!isPushSubscribed || notifPermission !== 'granted') ? (
                <button
                  onClick={handleManualSubscription}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 text-blue-400 border border-blue-600/20 rounded-xl hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black group"
                  title="تفعيل تنبيهات سطح المكتب"
                >
                  <Monitor className="w-3.5 h-3.5 group-hover:animate-bounce" />
                  <span>تفعيل التنبيهات</span>
                </button>
              ) : (
                <button
                  onClick={resetNotifications}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl hover:bg-red-900/20 hover:text-red-400 transition-all text-[10px] font-black"
                  title="إعادة ضبط التنبيهات"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>إعادة ضبط</span>
                </button>
              )} */}

              <button
                onClick={() => {
                  playSound(selectedSound);
                  toast.success(`تم تجربة نغمة: ${SOUND_LABELS[selectedSound]}`);
                }}
                className="p-2 rounded-xl hover:bg-slate-800 transition-all text-slate-400 hover:text-amber-400"
                title="تجربة الصوت"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </>
          )}

          {user ? (
            <div className="relative" ref={userDropdownRef}>
              <button onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} className="flex items-center gap-3 p-1 rounded-full hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700">
                <div className="hidden sm:flex flex-col items-end text-right mr-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">الحساب الشخصي</span>
                  <span className="text-sm font-bold text-white leading-tight">{user.empName}</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center border-2 border-slate-900 shadow-lg text-white">
                  <User className="w-5 h-5" />
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isUserDropdownOpen && (
                <div className="absolute top-full left-0 mt-3 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-[60] text-right overflow-hidden">
                  <Link href="/change-password" title="تغيير كلمة المرور" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-blue-600/20 transition-colors">
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>تغيير كلمة المرور</span>
                  </Link>

                  {/* قسم اختيار النغمة */}
                  <div className="px-4 py-3 border-t border-slate-800 space-y-3">
                    {/* <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">نغمة التنبيهات</p> */}
                    <div className="flex flex-col gap-1">
                      {Object.entries(SOUND_LABELS).map(([id, label]) => (
                        <button
                          key={id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSound(id);
                            localStorage.setItem("user_notif_sound", id);
                            playSound(id);
                          }}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedSound === id
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`}
                        >
                          <span>{label}</span>
                          {selectedSound === id && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/10 transition-colors border-t border-slate-800">
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login"><Button variant="outline" className="border-slate-700 bg-transparent text-slate-300 hover:text-white gap-2 h-10 px-6 rounded-xl"><LogIn className="w-5 h-5" /><span>دخول</span></Button></Link>
          )}
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 shadow-lg z-40 p-4 space-y-2 text-right">
          {user && <div className="text-white font-bold p-3 bg-slate-800 rounded-lg mb-4 text-center">{user.empName}</div>}
          <Link href="/notifications" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between p-3 text-slate-300 hover:bg-blue-600/20 rounded-lg">
            <div className="flex items-center gap-3 flex-row-reverse"><MessageSquare className="w-5 h-5" /><span>التنبيهات</span></div>
            {unreadCount > 0 && <span className="bg-red-600 px-2 rounded-full text-xs font-bold text-white">{unreadCount}</span>}
          </Link>
          <Link href="/import" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 text-slate-300 hover:bg-blue-600/20 rounded-lg flex-row-reverse"><File className="w-5 h-5" /><span>الوارد</span></Link>
          <Link href="/export" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 text-slate-300 hover:bg-emerald-600/20 rounded-lg flex-row-reverse"><Send className="w-5 h-5" /><span>الصادر</span></Link>
          <Link href="/memo/templates" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 text-amber-500 font-bold hover:bg-amber-600/10 rounded-lg flex-row-reverse"><Sparkles className="w-5 h-5" /><span>اضافة قالب جديد</span></Link>
          
          {user && ["1714", "1732"].includes(String(user.empNum)) && (
            <Link href="/products" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 text-blue-400 font-bold hover:bg-blue-600/10 rounded-lg flex-row-reverse">
              <Monitor className="w-5 h-5" />
              <span>نظام المنتجات</span>
            </Link>
          )}
          {user ? (
            <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-900/10 rounded-lg flex-row-reverse"><LogOut className="w-5 h-5" /><span>تسجيل الخروج</span></button>
          ) : (
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 text-blue-400 hover:bg-blue-900/10 rounded-lg flex-row-reverse"><LogIn className="w-5 h-5" /><span>دخول</span></Link>
          )}
        </div>
      )}
    </>
  );
}
