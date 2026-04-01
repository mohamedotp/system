"use client";

import { useEffect, useState } from "react";
import { X, BellRing, FileText, AlertCircle } from "lucide-react";

export default function MemoStatsNotification() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ todayMemos: 0, unrepliedPastMemos: 0 });

  const THIRTY_MINUTES = 30 * 60 * 1000;

  const fetchStats = async () => {
    try {
      // التحقق من متى تم عرض الرسالة آخر مرة
      const lastShown = localStorage.getItem("memo_stats_last_shown");
      const now = Date.now();

      if (lastShown && now - parseInt(lastShown) < THIRTY_MINUTES) {
        console.log("Notification throttled - less than 30 mins since last shown");
        return;
      }

      const res = await fetch("/api/notifications/stats");
      // If unauthorized (e.g. login page), don't show the error loudly
      if (res.status === 401) return;
      
      const data = await res.json();
      if (data.success && (data.data.todayMemos > 0 || data.data.unrepliedPastMemos > 0)) {
        setStats(data.data);
        setOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch memo stats", err);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // تحديث وقت العرض عند الإغلاق لمنع الظهور المتكرر
    localStorage.setItem("memo_stats_last_shown", Date.now().toString());
  };

  useEffect(() => {
    // 1. Initial fetch (runs shortly after the component mount / user login)
    fetchStats();

    // 2. Set interval for every 30 minutes
    const interval = setInterval(() => {
      fetchStats();
    }, THIRTY_MINUTES);

    return () => clearInterval(interval);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300 rtl" style={{ direction: 'rtl' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
        <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 animate-bounce" />
            <h2 className="text-lg font-bold">تنبيه المكاتبات</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white rounded-full p-1 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-4">
            
            <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100 min-h-[100px]">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mt-1">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">مكاتبات اليوم</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-blue-700">{stats.todayMemos}</span>
                  <span className="text-sm text-blue-600 font-medium">مكاتبة جديدة</span>
                </div>
              </div>
            </div>

            <div className={`flex items-start gap-4 p-4 rounded-xl border min-h-[100px] ${stats.unrepliedPastMemos > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
              <div className={`p-2 rounded-lg mt-1 ${stats.unrepliedPastMemos > 0 ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-500"}`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-1">مكاتبات سابقة لم يتم الرد عليها</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black ${stats.unrepliedPastMemos > 0 ? "text-amber-700" : "text-slate-700"}`}>{stats.unrepliedPastMemos}</span>
                  <span className={`text-sm font-medium ${stats.unrepliedPastMemos > 0 ? "text-amber-600" : "text-slate-500"}`}>مكاتبة معلقة</span>
                </div>
              </div>
            </div>

          </div>

          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 text-lg rounded-xl shadow-lg shadow-blue-200 transition-colors"
            onClick={handleClose}
          >
            حسناً، فهمت
          </button>
        </div>
      </div>
    </div>
  );
}
