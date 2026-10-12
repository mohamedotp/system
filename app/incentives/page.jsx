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
        toast.success("تم كشف الأرقام بنجاح", { duration: 1800 });
      } else {
        toast.info("تم تفعيل حماية الخصوصية وإخفاء الأرقام", { duration: 1800 });
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
                  <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-300/40 text-xs font-bold">
                    حافز الإنتاج
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  تفاصيل الاستحقاقات والاستقطاعات لصافي الحافز المعتمد
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              {/* Privacy Toggle Button with animated effect */}
              <Button
                variant={showValues ? "outline" : "default"}
                size="sm"
                onClick={togglePrivacy}
                className={`relative overflow-hidden gap-2 font-bold transition-all duration-300 rounded-xl text-xs px-3.5 h-9 ${
                  showValues
                    ? "border-slate-300 bg-slate-100/80 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                    : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/20 border-none"
                }`}
                title={showValues ? "إخفاء الأرقام للخصوصية" : "إظهار الأرقام"}
              >
                <span className="relative z-10 flex items-center gap-1.5">
                  {showValues ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-rose-500 transition-transform duration-300 hover:scale-110" />
                      <span>إخفاء الأرقام</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-white animate-pulse" />
                      <span>كشف الأرقام</span>
                    </>
                  )}
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchIncentives}
                disabled={loading}
                className="gap-1.5 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100 text-xs rounded-xl h-9"
                title="تحديث البيانات"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">تحديث</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-100 text-xs rounded-xl h-9"
                title="طباعة البيان"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">طباعة</span>
              </Button>

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
            <p className="text-slate-400 text-xs mt-1">يتم جلب الحسابات مباشرة من قاعدة البيانات</p>
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
                لم يتم إدراج بيانات حوافز معتمدة لحسابك في آخر تحديث لقاعدة البيانات.
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
                      {employee?.empDeg && employee.empDeg !== "-" && (
                        <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50">
                          {employee.empDeg}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Privacy Badge / Status Indicator */}
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <button
                    onClick={togglePrivacy}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      showValues
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {showValues ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>الأرقام مرئية</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>الأرقام مخفية (محمية)</span>
                      </>
                    )}
                  </button>
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
                    صافي الحافز المستحق للصرف
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
                    {!showValues && (
                      <span className="absolute -bottom-6 right-0 text-[11px] font-bold text-amber-400/90 flex items-center gap-1 group-hover:underline">
                        <Eye className="w-3 h-3" />
                        اضغط للكشف
                      </span>
                    )}
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

                  <span className="text-[11px] text-slate-500 font-mono">
                    {showValues ? "وضع العرض النشط" : "وضع الخصوصية المحمي"}
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Clean Modern Cards for the Terms (المصطلحات بوضوح مع البلور التفاعلي) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: قيمة الحافز */}
              <Card
                onClick={togglePrivacy}
                className="border border-slate-200/90 shadow-sm bg-white rounded-3xl overflow-hidden hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="h-1.5 bg-gradient-to-r from-amber-400 to-amber-500" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] font-bold">
                      استحقاق
                    </Badge>
                    <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>
                  <CardTitle className="text-base font-black text-slate-900 mt-2">
                    قيمة الحافز
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    المسمى في القاعدة: <code className="text-amber-700 font-mono text-[11px]">gft</code>
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <p className="text-[11px] text-slate-400 font-bold mb-1">المبلغ الإجمالي المعتمد</p>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-2xl sm:text-3xl font-black text-slate-900 font-mono transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
                          showValues ? "blur-0 opacity-100 scale-100" : "blur-md opacity-30 scale-95"
                        }`}
                      >
                        {formatCurrency(data.gft)}
                      </span>
                      <span className="text-sm font-bold text-slate-500">ج.م</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/40 rounded-xl p-3 border border-amber-100/60">
                    يمثل القيمة الإجمالية للحافز المستحق قبل خصم اشتراكات التأمينات والضرائب المقررة.
                  </p>
                </CardContent>
              </Card>

              {/* Card 2: المعاشات */}
              <Card
                onClick={togglePrivacy}
                className="border border-slate-200/90 shadow-sm bg-white rounded-3xl overflow-hidden hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-blue-500" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px] font-bold">
                      استقطاع تأميني
                    </Badge>
                    <div className="w-9 h-9 rounded-xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>
                  <CardTitle className="text-base font-black text-slate-900 mt-2">
                    المعاشات
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    المعادلة: <code className="text-indigo-700 font-mono text-[11px]">g_prs_bas_ins + g_prs_end_pnft</code>
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] text-slate-400 font-bold">إجمالي استقطاع المعاشات</p>
                      <span className="text-[11px] text-indigo-600 font-bold font-mono">
                        {getPercentage(data.pensions, data.gft)}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-2xl sm:text-3xl font-black text-rose-600 font-mono transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
                          showValues ? "blur-0 opacity-100 scale-100" : "blur-md opacity-30 scale-95"
                        }`}
                      >
                        {formatCurrency(data.pensions)}
                      </span>
                      <span className="text-sm font-bold text-slate-500">ج.م</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-slate-50/80 rounded-xl p-2.5 text-xs border border-slate-100">
                    <div className="flex justify-between items-center text-slate-600 py-1 border-b border-slate-200/60">
                      <span className="text-[11px]">حصة المعاش الأساسي:</span>
                      <span
                        className={`font-mono font-bold text-slate-800 transition-all duration-500 ${
                          showValues ? "blur-0 opacity-100" : "blur-xs opacity-40"
                        }`}
                      >
                        {formatCurrency(data.gPrsBasIns)} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 py-1">
                      <span className="text-[11px]">مكافأة نهاية الخدمة (1%):</span>
                      <span
                        className={`font-mono font-bold text-slate-800 transition-all duration-500 ${
                          showValues ? "blur-0 opacity-100" : "blur-xs opacity-40"
                        }`}
                      >
                        {formatCurrency(data.gPrsEndPnft)} ج.م
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: الضريبة */}
              <Card
                onClick={togglePrivacy}
                className="border border-slate-200/90 shadow-sm bg-white rounded-3xl overflow-hidden hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="h-1.5 bg-gradient-to-r from-rose-500 to-red-500" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[11px] font-bold">
                      استقطاع ضريبي
                    </Badge>
                    <div className="w-9 h-9 rounded-xl bg-rose-100/70 text-rose-600 flex items-center justify-center">
                      <Receipt className="w-5 h-5" />
                    </div>
                  </div>
                  <CardTitle className="text-base font-black text-slate-900 mt-2">
                    الضريبة
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    المسمى في القاعدة: <code className="text-rose-700 font-mono text-[11px]">p_taxe</code>
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] text-slate-400 font-bold">قيمة ضريبة الحافز</p>
                      <span className="text-[11px] text-rose-600 font-bold font-mono">
                        {getPercentage(data.pTaxe, data.gft)}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-2xl sm:text-3xl font-black text-rose-600 font-mono transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
                          showValues ? "blur-0 opacity-100 scale-100" : "blur-md opacity-30 scale-95"
                        }`}
                      >
                        {formatCurrency(data.pTaxe)}
                      </span>
                      <span className="text-sm font-bold text-slate-500">ج.م</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/40 rounded-xl p-3 border border-rose-100/60">
                    الضريبة القانونية المستقطعة من وعاء الحافز وفقاً للشرائح الضريبية المقررة بقانون الضرائب.
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
