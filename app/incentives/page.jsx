"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Award,
  Wallet,
  TrendingUp,
  ShieldCheck,
  Receipt,
  Eye,
  EyeOff,
  Printer,
  RotateCw,
  User,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  ArrowDownRight,
  Minus,
  Equal,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

export default function IncentivesPage() {
  const [data, setData] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // القيمة الافتراضية مغلقة (بلور) لحماية الخصوصية
  const [showValues, setShowValues] = useState(false);
  const router = useRouter();

  const fetchIncentives = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/incentives");
      const json = await res.json();

      if (!res.ok || !json.success) {
        if (res.status === 401) {
          router.push("/login?callbackUrl=/incentives");
          return;
        }
        setError(json.error || "تعذر جلب بيانات الحوافز حالياً");
        setLoading(false);
        return;
      }

      setEmployee(json.employee);
      setData(json.data);
    } catch (err) {
      console.error("Fetch Incentives Error:", err);
      setError("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncentives();
  }, []);

  const togglePrivacy = () => {
    setShowValues((prev) => {
      const next = !prev;
      if (next) {
        toast.success("  كشف الأرقام", { duration: 1800 });
      } else {
        toast.info("  إخفاء الأرقام", { duration: 1800 });
      }
      return next;
    });
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return "0.00";
    return Number(val).toLocaleString("ar-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "الشهر الحالي";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return String(dateStr);
    }
  };

  const getPercentage = (part, total) => {
    if (!total || total <= 0) return "0%";
    return `${((part / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 text-slate-800 rtl selection:bg-amber-100 selection:text-amber-900">
      {/* Header bar */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-16 z-30 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-sm">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    بيان الحوافز الشهرية
                  </h1>
                  
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <Link href="/employee">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs rounded-xl font-bold h-9"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">كشف المرتب</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Loading Skeleton */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-200/80 shadow-sm animate-pulse">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-600 font-medium">جاري تحميل بيان الحوافز...</p>
            {/* <p className="text-slate-400 text-xs mt-1">يتم جلب الحسابات مباشرة من قاعدة البيانات</p> */}
          </div>
        )}

        {/* Error Alert */}
        {error && !loading && (
          <div className="bg-red-50/90 border border-red-200 text-red-800 p-5 rounded-2xl flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-sm text-red-900">تعذر عرض بيانات الحافز</h3>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchIncentives}
                className="mt-3 text-xs bg-white text-red-700 border-red-300 hover:bg-red-50 rounded-lg"
              >
                إعادة المحاولة
              </Button>
            </div>
          </div>
        )}

        {/* Not Found state */}
        {!loading && !error && !data && (
          <Card className="border border-slate-200 shadow-sm text-center py-16 bg-white rounded-3xl">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">لا توجد بيانات حوافز متاحة</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                لم يوجد حوافز معتمدة لحسابك في آخر تحديث  لدينا
              </p>
              <Link href="/employee">
                <Button variant="outline" className="mt-2 text-xs rounded-xl">
                  الانتقال إلى كشف المرتبات
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {!loading && !error && data && (
          <>
            {/* Employee Banner */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 transition-all hover:shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      {employee?.empName || "اسم الموظف"}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                        رقم الملف: {employee?.empNum || "-"}
                      </span>
                      {employee?.sectorName && employee.sectorName !== "-" && (
                        <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          {employee.sectorName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Net Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
              {/* Background ambient glows */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 text-xs sm:text-sm font-bold tracking-wide uppercase">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    صافي الحافز المستحق 
                  </div>
                  <h3 className="text-slate-400 text-xs sm:text-sm mt-1">
                    المبلغ الفعلي بعد خصم كافة المعاشات والضرائب
                  </h3>

                  {/* Net Amount with clickable toggle & smooth unblur effect */}
                  <div
                    onClick={togglePrivacy}
                    className="group cursor-pointer inline-flex items-baseline gap-3 mt-4 select-none relative"
                    title={showValues ? "انقر للإخفاء" : "انقر لإظهار المبلغ"}
                  >
                    <div
                      className={`text-4xl sm:text-6xl font-black tracking-tight text-white font-mono transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
                        showValues
                          ? "blur-0 opacity-100 scale-100 drop-shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                          : "blur-xl opacity-30 scale-95 hover:opacity-50"
                      }`}
                    >
                      {formatCurrency(data.net)}
                    </div>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-400 transition-opacity duration-500">
                      ج.م
                    </span>

                    {/* Hint overlay on blur */}
                    {/* {!showValues && (
                      <span className="absolute -bottom-6 right-0 text-[11px] font-bold text-amber-400/90 flex items-center gap-1 group-hover:underline">
                        <Eye className="w-3 h-3" />
                        اضغط للكشف
                      </span>
                    )} */}
                  </div>
                </div>

                {/* Quick stats column with smooth unblur transition */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:border-r md:border-slate-800 md:pr-8 min-w-[240px]">
                  {/* Gross Incentive */}
                  <div
                    onClick={togglePrivacy}
                    className="bg-slate-800/60 hover:bg-slate-800/90 cursor-pointer backdrop-blur-sm border border-slate-700/50 rounded-2xl p-3.5 transition-all group"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      إجمالي الحافز
                    </div>
                    <p className="text-base sm:text-lg font-black text-white font-mono mt-1 overflow-hidden">
                      <span
                        className={`inline-block transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
                          showValues
                            ? "blur-0 opacity-100 scale-100"
                            : "blur-md opacity-30 scale-90"
                        }`}
                      >
                        {formatCurrency(data.gft)}
                      </span>{" "}
                      <span className="text-xs text-slate-400 font-normal">ج.م</span>
                    </p>
                  </div>

                  {/* Total Deductions */}
                  <div
                    onClick={togglePrivacy}
                    className="bg-slate-800/60 hover:bg-slate-800/90 cursor-pointer backdrop-blur-sm border border-slate-700/50 rounded-2xl p-3.5 transition-all group"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-bold">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      إجمالي الاستقطاعات
                    </div>
                    <p className="text-base sm:text-lg font-black text-white font-mono mt-1 overflow-hidden">
                      <span
                        className={`inline-block transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
                          showValues
                            ? "blur-0 opacity-100 scale-100"
                            : "blur-md opacity-30 scale-90"
                        }`}
                      >
                        {formatCurrency(data.totalDeductions)}
                      </span>{" "}
                      <span className="text-xs text-slate-400 font-normal">ج.م</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Formula Breadcrumb with animated numbers */}
              <div className="mt-8 pt-6 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold">
                    {/* GFT */}
                    <span
                      onClick={togglePrivacy}
                      className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-amber-500/20 transition-all"
                    >
                      قيمة الحافز (
                      <span
                        className={`font-mono inline-block transition-all duration-500 ${
                          showValues ? "blur-0 opacity-100" : "blur-xs opacity-40"
                        }`}
                      >
                        {formatCurrency(data.gft)}
                      </span>
                      )
                    </span>

                    <Minus className="w-3.5 h-3.5 text-slate-500" />

                    {/* Pensions */}
                    <span
                      onClick={togglePrivacy}
                      className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-indigo-500/20 transition-all"
                    >
                      المعاشات (
                      <span
                        className={`font-mono inline-block transition-all duration-500 ${
                          showValues ? "blur-0 opacity-100" : "blur-xs opacity-40"
                        }`}
                      >
                        {formatCurrency(data.pensions)}
                      </span>
                      )
                    </span>

                    <Minus className="w-3.5 h-3.5 text-slate-500" />

                    {/* Taxes */}
                    <span
                      onClick={togglePrivacy}
                      className="bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-rose-500/20 transition-all"
                    >
                      الضريبة (
                      <span
                        className={`font-mono inline-block transition-all duration-500 ${
                          showValues ? "blur-0 opacity-100" : "blur-xs opacity-40"
                        }`}
                      >
                        {formatCurrency(data.pTaxe)}
                      </span>
                      )
                    </span>

                    <Equal className="w-3.5 h-3.5 text-slate-500" />

                    {/* Net */}
                    <span
                      onClick={togglePrivacy}
                      className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-lg cursor-pointer hover:bg-emerald-500/30 transition-all"
                    >
                      الصافي (
                      <span
                        className={`font-mono inline-block transition-all duration-500 ${
                          showValues ? "blur-0 opacity-100 font-black" : "blur-xs opacity-40"
                        }`}
                      >
                        {formatCurrency(data.net)}
                      </span>
                      )
                    </span>
                  </div>

                  {/* <span className="text-[11px] text-slate-500 font-mono">
                    {showValues ? "وضع العرض النشط" : "وضع الخصوصية المحمي"}
                  </span> */}
                </div>
              </div>
            </div>

          
          </>
        )}
      </div>
    </div>
  );
}
