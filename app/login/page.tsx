"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { safeNextPath } from "@/lib/safe-next-path";

const loginSchema = z.object({
  email: z.string().email("請輸入有效的信箱"),
  password: z.string().min(6, "密碼至少要 6 個字"),
})
type LoginFormValues = z.infer<typeof loginSchema>;

const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 被 session 過期踢出來的人會帶著 ?expired=1 回到這裡
  const expired = searchParams.get("expired") === "1";
  // ?next= 是原本想去的那一頁。一定要過 safeNextPath —— 這個值來自網址列，
  // 直接拿去導向就是一個 open redirect。
  const next = safeNextPath(searchParams.get("next"));
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError("root", { message: json.error || "登入失敗" });
      return;
    }
    // 沒有 next 就回 /setup-team，它會視情況再把人送去 /events
    router.push(next ?? "/setup-team");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col items-center">
    <main className="w-full flex-1 max-w-md p-4 flex flex-col items-center justify-between">
      <h1 className="text-[28px] font-extrabold text-brand mb-8 self-start" style={{ fontFamily: 'var(--font-nunito)' }}>
        SD Event.
      </h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col items-center justify-center w-full gap-6">
        <h4 className="text-[20px] font-semibold text-gray-900text-center">登入帳號</h4>
        {expired && (
          <p className="w-full rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
            登入已過期，請重新登入
          </p>
        )}
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">信箱</label>
            <Input {...register("email")} type="email" placeholder="輸入信箱" />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">密碼</label>
            <Input {...register("password")} type="password" placeholder="輸入密碼" />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full items-center mb-8">
          {errors.root && (
            <p className="text-sm text-red-500">{errors.root.message}</p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            登入帳號
          </Button>
          <p className="text-gray-600 text-sm">
            還沒有帳號?{" "}
            <Link href="/register" className="text-brand font-medium underline">
              註冊帳號
            </Link>
          </p>
        </div>
      </form>
    </main>
  </div>
  );
};

// useSearchParams 需要 Suspense 邊界（同 app/admin/events/page.tsx 的做法）
const LoginPage = () => (
  <Suspense fallback={null}>
    <LoginForm />
  </Suspense>
);

export default LoginPage;