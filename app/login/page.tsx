"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { safeNextPath } from "@/lib/safe-next-path";
import { Logo } from "@/components/brand/Logo";

const PASSWORD_MIN = 6;

// 驗證訊息要跟著語系，schema 在元件裡用翻譯好的字建立
const createLoginSchema = (messages: { emailInvalid: string; passwordMin: string }) =>
  z.object({
    email: z.string().email(messages.emailInvalid),
    password: z.string().min(PASSWORD_MIN, messages.passwordMin),
  });
type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;

const LoginForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const loginSchema = useMemo(
    () =>
      createLoginSchema({
        emailInvalid: t("validation.emailInvalid"),
        passwordMin: t("validation.passwordMin", { min: PASSWORD_MIN }),
      }),
    [t]
  );
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
      setError("root", { message: json.error || t("login.failed") });
      return;
    }
    // 沒有 next 就回 /setup-team，它會視情況再把人送去 /events
    router.push(next ?? "/setup-team");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col items-center">
    <main className="w-full flex-1 max-w-md p-4 flex flex-col items-center justify-between">
      <h1 className="mb-8 self-start">
          <Logo />
        </h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col items-center justify-center w-full gap-6">
        <h4 className="text-[20px] font-semibold text-gray-900text-center">{t("login.title")}</h4>
        {expired && (
          <p className="w-full rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-800">
            {t("login.expired")}
          </p>
        )}
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">{t("emailLabel")}</label>
            <Input {...register("email")} type="email" placeholder={t("emailPlaceholder")} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">{t("passwordLabel")}</label>
            <Input {...register("password")} type="password" placeholder={t("passwordPlaceholder")} />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full items-center mb-8">
          {errors.root && (
            <p className="text-sm text-red-500">{errors.root.message}</p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t("login.submit")}
          </Button>
          <p className="text-gray-600 text-sm">
            <span>{t("noAccount")}</span>{" "}
            <Link href="/register" className="text-brand-strong font-medium underline">
              {t("signUp")}
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