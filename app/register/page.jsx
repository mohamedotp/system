"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { User, Lock, UserPlus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function RegisterPage() {
    const [empNum, setEmpNum] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (password !== confirmPassword) {
            setError("كلمات المرور غير متطابقة");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ empNum, password }),
            });

            const data = await res.json();

            if (data.success) {
                toast.success("تم إنشاء الحساب بنجاح!");
                setTimeout(() => router.push("/login"), 2000);
            } else {
                setError(data.error || "خطأ في التسجيل");
            }
        } catch (err) {
            setError("حدث خطأ في الاتصال بالسيرفر");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 rtl">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                        <UserPlus className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-slate-900">إنشاء حساب جديد</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        سجل الآن للوصول إلى مفردات مرتبك والخدمات الذاتية
                    </p>
                </div>

                <Card className="border-none shadow-2xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center font-bold">بيانات الحساب</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRegister} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input
                                        type="text"
                                        placeholder="رقم الملف"
                                        className="pr-10 h-12"
                                        value={empNum}
                                        onChange={(e) => setEmpNum(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="relative">
                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input
                                        type="password"
                                        placeholder="كلمة المرور"
                                        className="pr-10 h-12"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="relative">
                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <Input
                                        type="password"
                                        placeholder="تأكيد كلمة المرور"
                                        className="pr-10 h-12"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <Button disabled={loading} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white transition-all">
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    "إنشاء الحساب"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter>
                        <div className="text-sm text-center w-full text-slate-600">
                            لديك حساب بالفعل؟{" "}
                            <Link href="/login" className="text-blue-600 font-bold hover:underline">
                                تسجيل الدخول
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
