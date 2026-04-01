"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Upload,
    Trash2,
    User,
    FileSignature,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Search,
    Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";

export default function SignaturesPage() {
    const [user, setUser] = useState(null);
    const [signatures, setSignatures] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const res = await fetch("/api/auth/me");
            const json = await res.json();
            if (json.success) {
                setUser(json.user);

                // التحقق من الصلاحية
                if (String(json.user.empNum) !== "938") {
                    toast.error("غير مصرح لك بالوصول لهذه الصفحة");
                    window.location.href = "/";
                    return;
                }

                fetchSignatures();
                fetchEmployees();
            }
        } catch (error) {
            console.error("Error fetching user:", error);
            toast.error("خطأ في جلب بيانات المستخدم");
        }
    };

    const fetchSignatures = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/signatures?adminEmpNum=938`);
            const json = await res.json();
            if (json.success) {
                setSignatures(json.signatures || []);
            }
        } catch (error) {
            console.error("Error fetching signatures:", error);
            toast.error("خطأ في جلب التوقيعات");
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch("/api/import/transfer/employees");
            const json = await res.json();
            if (json.success) {
                setEmployees(json.data || []);
            }
        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };

    const [signatureFiles, setSignatureFiles] = useState([]);

    useEffect(() => {
        fetchSignatureFiles();
    }, []);

    const fetchSignatureFiles = async () => {
        try {
            const res = await fetch("/api/signatures/list-files");
            const json = await res.json();
            if (json.success) {
                setSignatureFiles(json.files || []);
            }
        } catch (error) {
            console.error("Error fetching signature files:", error);
        }
    };

    const handleAssignSignature = async (selectedFilePath) => {
        if (!selectedFilePath || !selectedEmp) return;

        setUploading(true);
        try {
            const res = await fetch("/api/signatures", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    empNum: selectedEmp.EMP_NUM,
                    adminEmpNum: user.empNum,
                    signaturePath: selectedFilePath
                })
            });

            const json = await res.json();
            if (json.success) {
                toast.success("تم ربط التوقيع بنجاح");
                setSelectedEmp(null);
                fetchSignatures();
            } else {
                toast.error(json.error || "فشل ربط التوقيع");
            }
        } catch (error) {
            console.error("Error linking signature:", error);
            toast.error("خطأ في ربط التوقيع");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteSignature = async (empNum) => {
        if (!confirm("هل أنت متأكد من حذف هذا التوقيع؟")) return;

        try {
            const res = await fetch(`/api/signatures?adminEmpNum=938&empNum=${empNum}`, {
                method: "DELETE"
            });

            const json = await res.json();
            if (json.success) {
                toast.success("تم حذف التوقيع بنجاح");
                fetchSignatures();
            } else {
                toast.error(json.error || "فشل حذف التوقيع");
            }
        } catch (error) {
            console.error("Error deleting signature:", error);
            toast.error("خطأ في حذف التوقيع");
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.EMP_NAME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.EMP_NUM?.toString().includes(searchTerm)
    );

    if (loading && !user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!user || String(user.empNum) !== "938") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Card className="max-w-md p-8 text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-slate-800 mb-2">غير مصرح</h2>
                    <p className="text-slate-500">ليس لديك صلاحية الوصول لهذه الصفحة</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-4 bg-blue-600 rounded-2xl shadow-lg">
                            <FileSignature className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-800">إدارة التوقيعات</h1>
                            <p className="text-slate-500 font-medium">إضافة وإدارة توقيعات الموظفين</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* قائمة الموظفين */}
                    <Card className="rounded-3xl border-none shadow-xl">
                        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-3xl">
                            <CardTitle className="flex items-center gap-3">
                                <User className="w-6 h-6" />
                                اختر موظف لإضافة التوقيع
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="mb-4">
                                <div className="relative">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <Input
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="ابحث عن موظف..."
                                        className="pr-10 h-12 rounded-2xl border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {filteredEmployees.map(emp => {
                                    const hasSignature = signatures.some(s => s.EMP_NUM === emp.EMP_NUM);
                                    const isSelected = selectedEmp?.EMP_NUM === emp.EMP_NUM;

                                    return (
                                        <div
                                            key={emp.EMP_NUM}
                                            onClick={() => setSelectedEmp(emp)}
                                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-slate-100 bg-white hover:border-blue-200"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                                                        }`}>
                                                        {emp.EMP_NAME?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800">{emp.EMP_NAME}</p>
                                                        <p className="text-xs text-slate-400 font-bold">{emp.SEC_N}</p>
                                                    </div>
                                                </div>
                                                {hasSignature && (
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-none">
                                                        <CheckCircle2 className="w-3 h-3 ml-1" />
                                                        لديه توقيع
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {selectedEmp && (
                                <div className="mt-6 p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
                                    <p className="text-sm font-black text-blue-900 mb-3">
                                        ربط توقيع لـ: {selectedEmp.EMP_NAME}
                                    </p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">اختر ملف التوقيع من المجلد المشترك</label>
                                            <select
                                                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                                onChange={(e) => handleAssignSignature(e.target.value)}
                                                defaultValue=""
                                            >
                                                <option value="" disabled>-- اختر ملف التوقيع --</option>
                                                {signatureFiles.map((file, idx) => (
                                                    <option key={idx} value={file.fullPath}>
                                                        {file.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {uploading && (
                                            <div className="flex items-center justify-center text-blue-600 gap-2 text-sm font-bold">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                جاري الحفظ...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* قائمة التوقيعات الموجودة */}
                    <Card className="rounded-3xl border-none shadow-xl">
                        <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-t-3xl">
                            <CardTitle className="flex items-center gap-3">
                                <FileSignature className="w-6 h-6" />
                                التوقيعات المسجلة ({signatures.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            ) : signatures.length === 0 ? (
                                <div className="text-center py-20">
                                    <ImageIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold">لا توجد توقيعات مسجلة</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                                    {signatures.map(sig => {
                                        const emp = employees.find(e => e.EMP_NUM === sig.EMP_NUM);
                                        return (
                                            <div
                                                key={sig.EMP_NUM}
                                                className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-emerald-200 transition-all"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center font-black text-emerald-700">
                                                            {emp?.EMP_NAME?.charAt(0) || sig.EMP_NUM.toString().charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-800">
                                                                {emp?.EMP_NAME || `موظف ${sig.EMP_NUM}`}
                                                            </p>
                                                            <p className="text-xs text-slate-400 font-bold truncate max-w-xs">
                                                                {sig.SIGNATURE_PATH}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteSignature(sig.EMP_NUM)}
                                                        className="text-red-500 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
}
