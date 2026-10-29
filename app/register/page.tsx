"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Logo } from "@/components/brand/Logo";

const NAME_MIN = 2;
const PASSWORD_MIN = 6;

// 驗證訊息要跟著語系，schema 在元件裡用翻譯好的字建立
const createRegisterSchema = (messages: {
  nameMin: string;
  emailInvalid: string;
  passwordMin: string;
}) =>
  z.object({
    name: z.string().min(NAME_MIN, messages.nameMin),
    email: z.string().email(messages.emailInvalid),
    password: z.string().min(PASSWORD_MIN, messages.passwordMin),
  });
type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;

const RegisterPage = () => {
  const router = useRouter();
  const t = useTranslations("auth");
  const registerSchema = useMemo(
    () =>
      createRegisterSchema({
        nameMin: t("validation.nameMin", { min: NAME_MIN }),
        emailInvalid: t("validation.emailInvalid"),
        passwordMin: t("validation.passwordMin", { min: PASSWORD_MIN }),
      }),
    [t]
  );
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError("root", { message: json.error || t("register.failed") });
      return;
    }
    router.push("/setup-team");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col items-center">
    <main className="w-full flex-1 max-w-md p-4 flex flex-col items-center justify-between">
      <h1 className="mb-8 self-start">
          <Logo />
        </h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col items-center justify-center w-full gap-6">
        <h4 className="text-[20px] font-semibold text-gray-900text-center">{t("register.title")}</h4>
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">{t("nameLabel")}</label>
            <Input {...register("name")} type="text" placeholder={t("namePlaceholder")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
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
            {t("signUp")}
          </Button>
          <p className="text-gray-600 text-sm">
            <span>{t("hasAccount")}</span>{" "}
            <Link href="/login" className="text-brand-strong font-medium underline">
              {t("logIn")}
            </Link>
          </p>
        </div>
      </form>
    </main>
  </div>
  );
};

export default RegisterPage;