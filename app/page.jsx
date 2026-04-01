"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Users,
  ChevronRight,
  Database,
  ShieldCheck,
  BarChart3,
  Clock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex flex-col items-center justify-center p-6 rtl">
      <div className="max-w-4xl w-full space-y-12">

        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-bold border border-blue-100 mb-4 animate-bounce">
            <ShieldCheck className="w-4 h-4" />
            AOI
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-950 tracking-tight leading-tight">
            مرحباً بك في نظام <br />
            <span className="text-blue-600">مصنع الإلكترونيات <br /></span>
            <span className="text-blue-700">الهيئة العربية للتصنيع</span>
          </h1>
          {/* <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            الحل الأمثل لمتابعة الرواتب، البيانات الإدارية، والتقارير المالية المباشرة المرتبطة بقواعد بيانات أوراكل.
          </p> */}
        </div>

        {/* Action Cards */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/employee" className="group">
            <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-2 overflow-hidden bg-white">
              <CardContent className="p-8 flex items-center gap-6">
                <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-lg shadow-blue-200 group-hover:rotate-6 transition-transform">
                  <Users className="w-8 h-8" />
                </div>
                <div className="flex-1 space-y-1 text-right">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600">بوابة الموظفين</h3>
                  <p className="text-slate-500 text-sm">استعلام عن الرواتب والبيانات الشخصية</p>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="#" className="group">
            <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-2 overflow-hidden bg-slate-900 border-slate-800">
              <CardContent className="p-8 flex items-center gap-6">
                <div className="bg-slate-800 text-blue-400 p-5 rounded-2xl shadow-lg group-hover:-rotate-6 transition-transform">
                  <BarChart3 className="w-8 h-8" />
                </div>
                <div className="flex-1 space-y-1 text-right">
                  <h3 className="text-xl font-bold text-white">التقارير المالية</h3>
                  <p className="text-slate-400 text-sm">تحليل شامل للميزانية والرواتب</p>
                </div>
                <ChevronRight className="text-slate-600 group-hover:text-blue-500 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div> */}

        {/* Stats / Footer info */}
        {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
          <StatItem icon={<Database className="w-4 h-4" />} label="قاعدة البيانات" value="Oracle 11g" />
          <StatItem icon={<Clock className="w-4 h-4" />} label="آخر مزامنة" value="الآن" />
          <StatItem icon={<ShieldCheck className="w-4 h-4" />} label="التشفير" value="نشط (SSL)" />
          <StatItem icon={<Users className="w-4 h-4" />} label="المستخدمين" value="+500 موظف" />
        </div> */}

      </div>
    </div>
    // <div>

    // </div>
  );
}

function StatItem({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center gap-1 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="text-blue-500 p-2 bg-blue-50 rounded-lg">{icon}</div>
      <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">{label}</span>
      <span className="text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}
