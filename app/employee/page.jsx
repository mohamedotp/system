"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import IncomeModal from "./components/income";
import DeductionModal from "./components/Deduction";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Search,
  User,
  Users,
  CreditCard,
  Wallet,
  Calendar,
  Banknote,
  AlertCircle,
  Clock,
  Printer,
  ChevronLeft,
  LogOut
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const translations = {
  "EMP_NUM": "كود الموظف",
  "EMP_NAME": "اسم الموظف",
  "BAS_SAL": "الراتب الأساسي",
  "G_SP_ADV_03": "العلاوة المضمومة",
  "BAS_SAL + G_SP_ADV_03": "الاجر المعدل",
  "G_PAY_DAYS": "اساسي الاحتساب",
  "G_PAY_SAL": "الأجر المستحق",
  "G_PAY_VA": "طبيعة العمل",
  "G_REPRSNT": "بدل التمثيل",
  "G_CAR": "مصاريف انتقال",
  "G_TOT_ADV": "الدرجة العلمية",
  "HOURS": "قيمة ساعات اضافي",
  "A_DAYS": "قيمة ايام اضافي",
  "COMP_OVR_TIM": "مستحقات اخري",
  "G_SP_ADV_01": "العلاوات الخاصة",
  "G_SP_ADV_02": "العلاوة الأستثنائية",
  "TEN_DAYS": "عيد العمال",
  "G_BDL_FOOD": "بدل وجبة",
  "G_PAY_BDL": "الحد الادني",
  "ELAWA_TASH_2019": "علاوة تشجيعية",
  "G_INSUR": "حصة الهيئة 13.25%",
  "G_FAC_BOX": "حصة الهيئة  ص.ت.خ",
  "G_PAY_DA": "حصة الهيئة  صحي 0.5%",
  "G_TAXE": "ضريبة",
  "G_PRS_END_PNFT": "مكافأة 1%",
  "G_PRS_BAS_INS": "حصة العامل فى المعاش",
  "G_PRS_BOX": "ص.ت.خ عامل",
  "G_MEDIC_INS": "تأمين صحي",
  "G_CLUB": "ص.ر.ع",
  "G_BAK_INS": "رد مكافأة",
  "G_PNFT_INS": "قسط مكافأة",
  "G_DED_INS": "استبدال معاش",
  "G_PRV_INS": "مدة سابقة",
  "G_CON_INS": "مدة اعتبارية",
  "G_VAC_INS": "اجازة بدون أجر",
  "CLUB_SUBSCRIPTION": "اشتراك نادى",
  "total_VAR_CON": "جملة استقطاعات ثابتة",
  "HIRE_DATE": "تاريخ التعيين",
  "DEPT_NAME": "الإدارة",
  "JOB_NAME": "الوظيفة",
  "NET_SALARY": "صافي الراتب",
};

const incomeFields = [
  { key: "BAS_SAL", label: translations.BAS_SAL },
  { key: "G_SP_ADV_03", label: translations.G_SP_ADV_03 },
  {
    key: "ADJUSTED_BAL",
    label: translations["BAS_SAL + G_SP_ADV_03"],
    calc: (employee) => (Number(employee.BAS_SAL || 0) + Number(employee.G_SP_ADV_03 || 0))
  },
  { key: "G_PAY_DAYS", label: translations.G_PAY_DAYS },
  { key: "G_PAY_SAL", label: translations.G_PAY_SAL },
  { key: "G_PAY_VA", label: translations.G_PAY_VA },
  { key: "G_REPRSNT", label: translations.G_REPRSNT },
  { key: "G_CAR", label: translations.G_CAR },
  { key: "G_TOT_ADV", label: translations.G_TOT_ADV },
  { key: "HOURS", label: translations.HOURS },
  { key: "A_DAYS", label: translations.A_DAYS },
  { key: "COMP_OVR_TIM", label: translations.COMP_OVR_TIM },
  { key: "G_SP_ADV_01", label: translations.G_SP_ADV_01 },
  { key: "G_SP_ADV_02", label: translations.G_SP_ADV_02 },
  { key: "TEN_DAYS", label: translations.TEN_DAYS },
  { key: "G_BDL_FOOD", label: translations.G_BDL_FOOD },
  { key: "G_PAY_BDL", label: translations.G_PAY_BDL },
  { key: "ELAWA_TASH_2019", label: translations.ELAWA_TASH_2019 },
];

const deductionFields = [
  { key: "G_TAXE", label: translations.G_TAXE },
  { key: "G_PRS_END_PNFT", label: translations.G_PRS_END_PNFT },
  { key: "G_PRS_BAS_INS", label: translations.G_PRS_BAS_INS },
  { key: "G_PRS_BOX", label: translations.G_PRS_BOX },
  { key: "G_MEDIC_INS", label: translations.G_MEDIC_INS },
  { key: "G_CLUB", label: translations.G_CLUB },
  { key: "G_BAK_INS", label: translations.G_BAK_INS },
  { key: "G_PNFT_INS", label: translations.G_PNFT_INS },
  { key: "G_DED_INS", label: translations.G_DED_INS },
  { key: "G_PRV_INS", label: translations.G_PRV_INS },
  { key: "G_CON_INS", label: translations.G_CON_INS },
  { key: "G_VAC_INS", label: translations.G_VAC_INS },
  { key: "CLUB_SUBSCRIPTION", label: translations.CLUB_SUBSCRIPTION },
  {
    key: "TOTAL_VAR_CON",
    label: translations.total_VAR_CON,
    calc: (employee) => (Number(employee.G_TAXE + employee.G_EMP_INS + employee.G_PRS_BOX + employee.G_MEDIC_INS + employee.CLUB_SUBSCRIPTION +
      employee.G_BAK_INS + employee.G_PNFT_INS + employee.G_DED_INS + employee.G_PRV_INS + employee.G_CON_INS + employee.G_VAC_INS + employee.G_CLUB))
  },
];

export default function EmployeeForm() {
  const [empNum, setEmpNum] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openIncomeModal, setOpenIncomeModal] = useState(false);
  const [openDeductionModal, setOpenDeductionModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (data.success) {
          setCurrentUser(data.user);
          setEmpNum(data.user.empNum);
          fetchEmployeeData(data.user.empNum);
        } else {
          router.push("/login");
        }
      } catch (err) {
        setError("خطأ في التحقق من الجلسة");
        setLoading(false);
      }
    };

    checkAuthAndFetch();
  }, []);

  const fetchEmployeeData = async (code) => {
    setLoading(true);
    setError("");
    setEmployee(null);

    try {
      const res = await fetch(`/api/employee?empNum=${code}`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error || "عذراً، لم يتم العثور على بياناتك");
      } else if (json.data && json.data.length > 0) {
        const rows = json.data;
        const mainEmployee = rows[0];
        mainEmployee.deductions = rows.filter(r => r.DEDUCTION_NAME);
        setEmployee(mainEmployee);
      } else {
        setError("لا توجد بيانات لهذا الرقم");
      }
    } catch (err) {
      setError("حدث خطأ في الاتصال بالبيانات");
    } finally {
      setLoading(false);
    }
  };


  const totalVar = {
    key: "TOTAL_VAR_CON_1",
    calc: (employee) => (Number(employee.G_PAY_SAL + employee.G_PAY_VA + employee.G_REPRSNT + employee.G_CAR + employee.G_TOT_ADV + employee.A_DAYS + employee.COMP_OVR_TIM + employee.G_SP_ADV_01 + employee.G_SP_ADV_02 + employee.TEN_DAYS + employee.G_BDL_FOOD + employee.G_PAY_BDL + employee.ELAWA_TASH_2019))
  }

  const totalDeduction = {
    key: "TOTAL_DED_CON_1",
    calc: (employee) => (Number(employee.G_TAXE + employee.G_PRS_BAS_INS + employee.G_PRS_BOX + employee.G_MEDIC_INS + employee.CLUB_SUBSCRIPTION +
      employee.G_BAK_INS + employee.G_PNFT_INS + employee.G_DED_INS + employee.G_PRV_INS + employee.G_CON_INS + employee.G_VAC_INS + employee.G_CLUB + employee.G_PRS_END_PNFT + employee.TOT_VAR_DED))
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 rtl">
      <div className="bg-white border-b shadow-sm mb-8">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">شريط المرتب</h1>
                {/* {currentUser && (
                  <p className="text-slate-500 text-sm">مرحباً، {currentUser.empName}</p>
                )} */}
              </div>
            </div>

            {/* <div className="flex items-center gap-3">
              <Button onClick={handleLogout} variant="outline" className="text-red-600 border-red-100 hover:bg-red-50 gap-2">
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </Button>
            </div> */}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm animate-pulse">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500">جاري تحميل بياناتك...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {employee && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="md:col-span-2 space-y-6">
              <Card className="border-none shadow-lg overflow-hidden">
                <div className="h-2 bg-blue-600" />
                <CardHeader className="flex flex-row items-center gap-5 pb-8">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center border-4 border-white shadow-md">
                    <User className="w-10 h-10 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-3xl font-bold text-slate-800">{employee.EMP_NAME}</CardTitle>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="text-blue-600 border-blue-100 bg-blue-50">
                        {employee.JOB_NAME || "رقم الملف"}
                      </Badge>
                      <span className="text-slate-300">|</span>
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        {employee.EMP_NUM}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="grid grid-cols-2 gap-x-12 gap-y-8 py-6 bg-slate-50/50">
                  <InfoItem label="الفئة الوظيفية" value={employee.EMP_DEG || "غير محدد"} icon={<Users className="w-4 h-4" />} />
                  <InfoItem label="القطاع" value={employee.SECTOR_NAME || "-"} />
                  <InfoItem label="حالة الموظف" value={employee.STATUS_NAME} color="text-green-600" />
                </CardContent>
              </Card>

              {/* Data Note */}
              {/* <Card className="border-dashed border-2 bg-blue-50/30 border-blue-100">
                <CardContent className="p-4 text-sm text-blue-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>يتم عرض هذه البيانات لموظف واحد فقط بناءً على تسجيل الدخول الحالي لضمان الخصوصية والسرية التامة للبيانات المالية.</p>
                </CardContent>
              </Card> */}
            </div>

            <div className="space-y-6">
              <Card className="bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl" />
                <CardHeader>
                  <CardTitle className="text-slate-400 text-sm font-medium flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-500" />
                    الصافي المستحق
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold tracking-tight mb-2">
                    {Number(employee.G_NET_PAY || 0).toLocaleString("ar-EG")}
                    <span className="text-xl font-medium mr-2 text-slate-500">ج.م</span>
                  </div>
                  <p className="text-blue-400 text-sm mt-4 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    استحقاق شهر {new Date().toLocaleString('ar-EG', { month: 'long' })}
                  </p>
                </CardContent>
                <Separator className="bg-slate-800 " />
                <CardFooter className="flex flex-col gap-3 py-6 font-primary text-right">
                  <div className="w-full flex justify-between text-sm hover:bg-slate-800 p-2 rounded-xl cursor-pointer" onClick={() => setOpenIncomeModal(true)}>
                    <span className="text-slate-400">إجمالي الإيرادات</span>
                    <span className="font-mono text-green-500">
                      {totalVar?.calc(employee).toLocaleString("ar-EG") || 0} ج.م
                    </span>
                  </div>
                  <div className="w-full flex justify-between text-sm hover:bg-slate-800 p-2 rounded-xl cursor-pointer" onClick={() => setOpenDeductionModal(true)}>
                    <span className="text-slate-400">إجمالي الخصومات</span>
                    <span className="font-mono text-red-500">{totalDeduction?.calc(employee).toLocaleString("ar-EG") || 0} ج.م</span>
                  </div>
                </CardFooter>
              </Card>

              {/* <Button className="w-full h-12 gap-2 bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-sm" variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4" />
                طباعة الكشف
              </Button> */}
            </div>
          </div>
        )}
      </div>

      <IncomeModal
        open={openIncomeModal}
        onClose={() => setOpenIncomeModal(false)}
        employee={employee}
        totalVar={totalVar}
        incomeFields={incomeFields}
      />
      <DeductionModal
        open={openDeductionModal}
        onClose={() => setOpenDeductionModal(false)}
        employee={employee}
        totalDeduction={totalDeduction}
        deductionFields={deductionFields}
      />
    </div>
  );
}

function InfoItem({ label, value, icon, color = "text-slate-700" }) {
  return (
    <div className="space-y-1.5 px-4 py-3 rounded-xl bg-white border border-slate-100/50 shadow-sm">
      <p className="text-[15px] font-bold text-blue-500/70 uppercase flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
