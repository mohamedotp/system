"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Lock, Loader2, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (newPassword !== confirmPassword) {
            setError("كلمات المرور الجديدة غير متطابقة");
            setLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setError("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await res.json();

            if (data.success) {
                toast.success("تم تغيير كلمة المرور بنجاح");
                setTimeout(() => router.push("/employee"), 1500);
            } else {
                setError(data.error || "خطأ في تحديث كلمة المرور");
            }
        } catch (err) {
            setError("حدث خطأ في الاتصال بالسيرفر");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 rtl">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Lock className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-slate-900">تغيير كلمة المرور</h2>
                    {/* <p className="mt-2 text-sm text-slate-600">
                        قم بتحديث كلمة المرور لضمان أمان حسابك
                    </p> */}
                </div>

                <Card className="border-none shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold">تحديث البيانات</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">كلمة المرور الحالية</label>
                                <Input
                                    type="password"
                                    placeholder="أدخل كلمة المرور الحالية"
                                    className="h-12"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <label className="text-sm font-semibold text-slate-700">كلمة المرور الجديدة</label>
                                <Input
                                    type="password"
                                    placeholder="أدخل كلمة المرور الجديدة"
                                    className="h-12"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">تأكيد كلمة المرور الجديدة</label>
                                <Input
                                    type="password"
                                    placeholder="أعد كتابة كلمة المرور الجديدة"
                                    className="h-12"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <Button disabled={loading} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white transition-all mt-4">
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        تحديث كلمة المرور
                                        <CheckCircle2 className="h-5 w-5" />
                                    </span>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter>
                        <Button
                            variant="ghost"
                            className="w-full text-slate-500 hover:text-blue-600"
                            onClick={() => router.back()}
                        >
                            <ArrowRight className="w-4 h-4 ml-2" />
                            العودة للخلف
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
