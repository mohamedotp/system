"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  HelpCircle,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Equal,
  Sparkles,
  ChevronLeft
} from "lucide-react";
import { toast } from "sonner";

export default function IncentivesPage() {
  const [data, setData] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showValues, setShowValues] = useState(true);
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
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowValues(!showValues)}
                className="gap-2 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100 text-xs rounded-xl"
                title={showValues ? "إخفاء الأرقام للخصوصية" : "إظهار الأرقام"}
              >
                {showValues ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-amber-600" />}
                <span>{showValues ? "إخفاء القيم" : "إظهار القيم"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchIncentives}
                disabled={loading}
                className="gap-1.5 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100 text-xs rounded-xl"
                title="تحديث البيانات"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">تحديث</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-100 text-xs rounded-xl"
                title="طباعة البيان"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">طباعة</span>
              </Button>

              <Link href="/employee">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs rounded-xl font-bold"
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

                <div className="flex items-center gap-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl px-4 py-3 self-start md:self-auto">
                  <Calendar className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-amber-800/80">تاريخ آخر احتساب</p>
                    <p className="text-xs font-black text-amber-950">
                      {formatDate(data.upDate)}
                    </p>
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
                    صافي الحافز المستحق للصرف
                  </div>
                  <h3 className="text-slate-400 text-xs sm:text-sm mt-1">
                    المبلغ الفعلي القابل للتحويل بعد خصم كافة المعاشات والضرائب
                  </h3>

                  <div className="flex items-baseline gap-3 mt-4">
                    <div
                      className={`text-4xl sm:text-6xl font-black tracking-tight text-white transition-all duration-300 font-mono ${
                        showValues ? "" : "blur-lg select-none"
                      }`}
                    >
                      {formatCurrency(data.net)}
                    </div>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-400">
                      ج.م
                    </span>
                  </div>
                </div>

                {/* Quick stats column */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:border-r md:border-slate-800 md:pr-8 min-w-[240px]">
                  <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      إجمالي الحافز
                    </div>
                    <p
                      className={`text-base sm:text-lg font-black text-white font-mono mt-1 ${
                        showValues ? "" : "blur-sm select-none"
                      }`}
                    >
                      {formatCurrency(data.gft)} <span className="text-xs text-slate-400 font-normal">ج.م</span>
                    </p>
                  </div>

                  <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-bold">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      إجمالي الاستقطاعات
                    </div>
                    <p
                      className={`text-base sm:text-lg font-black text-white font-mono mt-1 ${
                        showValues ? "" : "blur-sm select-none"
                      }`}
                    >
                      {formatCurrency(data.totalDeductions)} <span className="text-xs text-slate-400 font-normal">ج.م</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Formula Breadcrumb */}
              <div className="mt-8 pt-6 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-400 font-bold">معادلة الاحتساب:</span>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold">
                    <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                      قيمة الحافز ({showValues ? formatCurrency(data.gft) : "••••"})
                    </span>
                    <Minus className="w-3.5 h-3.5 text-slate-500" />
                    <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                      المعاشات ({showValues ? formatCurrency(data.pensions) : "••••"})
                    </span>
                    <Minus className="w-3.5 h-3.5 text-slate-500" />
                    <span className="bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                      الضريبة ({showValues ? formatCurrency(data.pTaxe) : "••••"})
                    </span>
                    <Equal className="w-3.5 h-3.5 text-slate-500" />
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-lg">
                      الصافي ({showValues ? formatCurrency(data.net) : "••••"})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Core Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: قيمة الحافز */}
              <Card className="border border-slate-200/90 shadow-sm bg-white rounded-3xl overflow-hidden hover:shadow-md transition-all">
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
                    المسمى البرمجي في النظام: <code className="text-amber-700 font-mono text-[11px]">gft</code>
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <p className="text-[11px] text-slate-400 font-bold mb-1">المبلغ الإجمالي المعتمد</p>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-2xl sm:text-3xl font-black text-slate-900 font-mono ${
                          showValues ? "" : "blur-sm select-none"
                        }`}
                      >
                        {formatCurrency(data.gft)}
                      </span>
                      <span className="text-sm font-bold text-slate-500">ج.م</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/40 rounded-xl p-3 border border-amber-100/60">
                    يمثل هذا الحقل القيمة الإجمالية للحافز المستحق للعامل قبل خصم اشتراكات التأمينات والضرائب المقررة.
                  </p>
                </CardContent>
              </Card>

              {/* Card 2: المعاشات */}
              <Card className="border border-slate-200/90 shadow-sm bg-white rounded-3xl overflow-hidden hover:shadow-md transition-all">
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
                        className={`text-2xl sm:text-3xl font-black text-rose-600 font-mono ${
                          showValues ? "" : "blur-sm select-none"
                        }`}
                      >
                        {formatCurrency(data.pensions)}
                      </span>
                      <span className="text-sm font-bold text-slate-500">ج.م</span>
                    </div>
                  </div>

                  {/* Sub-breakdown if available */}
                  <div className="space-y-1.5 bg-slate-50/80 rounded-xl p-2.5 text-xs border border-slate-100">
                    <div className="flex justify-between items-center text-slate-600 py-1 border-b border-slate-200/60">
                      <span className="text-[11px]">حصة المعاش الأساسي:</span>
                      <span className={`font-mono font-bold text-slate-800 ${showValues ? "" : "blur-sm"}`}>
                        {formatCurrency(data.gPrsBasIns)} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 py-1">
                      <span className="text-[11px]">مكافأة نهاية الخدمة (1%):</span>
                      <span className={`font-mono font-bold text-slate-800 ${showValues ? "" : "blur-sm"}`}>
                        {formatCurrency(data.gPrsEndPnft)} ج.م
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: الضريبة */}
              <Card className="border border-slate-200/90 shadow-sm bg-white rounded-3xl overflow-hidden hover:shadow-md transition-all">
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
                    المسمى البرمجي في النظام: <code className="text-rose-700 font-mono text-[11px]">p_taxe</code>
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
                        className={`text-2xl sm:text-3xl font-black text-rose-600 font-mono ${
                          showValues ? "" : "blur-sm select-none"
                        }`}
                      >
                        {formatCurrency(data.pTaxe)}
                      </span>
                      <span className="text-sm font-bold text-slate-500">ج.م</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/40 rounded-xl p-3 border border-rose-100/60">
                    الضريبة القانونية المستقطعة من وعاء الحافز وفقاً للشرائح الضريبية المقررة وقانون الضرائب المعمول به.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Table for Print and Quick Review */}
            <Card className="border border-slate-200/90 shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg font-black text-slate-900">
                      جدول بنود احتساب الحافز
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      توضيح شامل لكل بند من البنود الواردة في استعلام قاعدة البيانات
                    </p>
                  </div>
                  <Badge variant="outline" className="text-slate-600 border-slate-200">
                    رقم الحافز: {data.pnfNumber || 1}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-3 px-4">البند والمسمى</th>
                      <th className="py-3 px-4">الحقل في القاعدة</th>
                      <th className="py-3 px-4">النوع</th>
                      <th className="py-3 px-4 text-center">النسبة</th>
                      <th className="py-3 px-4 text-left">المبلغ المستحق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* GFT */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>قيمة الحافز (إجمالي الاستحقاق)</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">gft</td>
                      <td className="py-3.5 px-4">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          + إضافة
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-500">100%</td>
                      <td className="py-3.5 px-4 text-left font-mono font-bold text-emerald-600">
                        <span className={showValues ? "" : "blur-sm select-none"}>
                          {formatCurrency(data.gft)}
                        </span>{" "}
                        ج.م
                      </td>
                    </tr>

                    {/* Pensions */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span>المعاشات (تأمينات اجتماعية ونهاية خدمة)</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                        g_prs_bas_ins + g_prs_end_pnft
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                          - استقطاع
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                        {getPercentage(data.pensions, data.gft)}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono font-bold text-rose-600">
                        <span className={showValues ? "" : "blur-sm select-none"}>
                          {formatCurrency(data.pensions)}
                        </span>{" "}
                        ج.م
                      </td>
                    </tr>

                    {/* Tax */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>الضريبة (ضريبة كسب العمل)</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">p_taxe</td>
                      <td className="py-3.5 px-4">
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                          - استقطاع
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                        {getPercentage(data.pTaxe, data.gft)}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono font-bold text-rose-600">
                        <span className={showValues ? "" : "blur-sm select-none"}>
                          {formatCurrency(data.pTaxe)}
                        </span>{" "}
                        ج.م
                      </td>
                    </tr>

                    {/* Net */}
                    <tr className="bg-emerald-50/40 font-bold">
                      <td className="py-4 px-4 font-black text-slate-950">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                          <span>صافي الحافز (المبلغ المستحق للصرف)</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-emerald-800">net</td>
                      <td className="py-4 px-4">
                        <Badge className="bg-emerald-600 text-white border-none text-[10px]">
                          صافي
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-emerald-800">
                        {getPercentage(data.net, data.gft)}
                      </td>
                      <td className="py-4 px-4 text-left font-mono font-black text-emerald-700 text-base">
                        <span className={showValues ? "" : "blur-sm select-none"}>
                          {formatCurrency(data.net)}
                        </span>{" "}
                        ج.م
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
              <CardFooter className="bg-slate-50/50 py-3 px-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  يتم تطبيق الاستقطاعات آلياً بناءً على اللوائح الإدارية والقوانين المالية المنظمة.
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")}
                </span>
              </CardFooter>
            </Card>

            {/* Terms Explanations (راحة المستخدم وفهم المصطلحات) */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                دليل توضيح المصطلحات المالية للحافز
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100/80">
                  <span className="font-bold text-amber-800 block mb-1">
                    1. قيمة الحافز (gft):
                  </span>
                  إجمالي المبلغ التقديري المخصص للحافز طبقاً لمعدلات الإنتاج أو تقييم الأداء المعتمد قبل إجراء أي خصومات.
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100/80">
                  <span className="font-bold text-indigo-800 block mb-1">
                    2. المعاشات (g_prs_bas_ins + g_prs_end_pnft):
                  </span>
                  حصة العامل المستقطعة لحساب التأمينات الاجتماعية عن الحافز، مضافاً إليها نسبة مكافأة نهاية الخدمة (1%).
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100/80">
                  <span className="font-bold text-rose-800 block mb-1">
                    3. الضريبة (p_taxe):
                  </span>
                  ضريبة المرتبات المقررة قانوناً على المبالغ الإضافية والتي يتم توريدها لمصلحة الضرائب المصرية.
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100/80">
                  <span className="font-bold text-emerald-800 block mb-1">
                    4. صافي الحافز (net):
                  </span>
                  المبلغ الصافي النهائي المودع في الحساب البنكي للموظف، وهو ناتج طرح (المعاشات + الضريبة) من قيمة الحافز.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
