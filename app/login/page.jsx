"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { User, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function LoginForm() {
    const [empNum, setEmpNum] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const searchParams = useSearchParams();
    const router = useRouter();

    // الأولوية للـ callbackUrl إذا وجد، وإلا الذهاب للملف الشخصي
    const callbackUrl = searchParams.get("callbackUrl") || "/import";

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ empNum, password }),
            });

            const data = await res.json();

            if (data.success) {
                toast.success("تم تسجيل الدخول بنجاح");

                // استخدام window.location لضمان تحديث cookies والبيانات بالكامل
                window.location.href = callbackUrl;
            } else {
                setError(data.error || "خطأ في تسجيل الدخول");
            }
        } catch (err) {
            setError("حدث خطأ في الاتصال بالسيرفر");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-none shadow-2xl">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center font-bold">مرحباً بك </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
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
                                placeholder="ادخل رقم الملف"
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
                    <Button disabled={loading} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white transition-all">
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <span className="flex items-center gap-2">
                                دخول
                                <ArrowRight className="h-5 w-5 rotate-180" />
                            </span>
                        )}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
                <div className="text-sm text-center text-slate-600">
                    ليس لدي حساب ...؟  {" "}
                    <Link href="/register" className="text-blue-600 font-bold hover:underline">
                        إنشاء حساب جديد
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 rtl">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Lock className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-slate-900">تسجيل الدخول</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        أدخل رقم الملف وكلمة المرور لتسجيل الدخول
                    </p>
                </div>
                <Suspense fallback={<div className="text-center p-4">جاري التحميل...</div>}>
                    <LoginForm />
                </Suspense>
            </div>
        </div>
    );
}
