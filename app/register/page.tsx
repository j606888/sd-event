"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "名稱至少要 2 個字"),
  email: z.string().email("請輸入有效的信箱"),
  password: z.string().min(6, "密碼至少要 6 個字"),
})
type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterPage = () => {
  const router = useRouter();
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
      setError("root", { message: json.error || "註冊失敗" });
      return;
    }
    router.push("/setup-team");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col items-center">
    <main className="w-full flex-1 max-w-md p-4 flex flex-col items-center justify-between">
      <h1 className="text-[28px] font-extrabold text-[#5295BC] mb-8 self-start" style={{ fontFamily: 'var(--font-nunito)' }}>
        SD Event.
      </h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col items-center justify-center w-full gap-6">
        <h4 className="text-[20px] font-semibold text-gray-900text-center">建立新帳號</h4>
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">名稱</label>
            <Input {...register("name")} type="text" placeholder="輸入名稱" />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
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
            註冊帳號
          </Button>
          <p className="text-gray-600 text-sm">
            已經有帳號了?{" "}
            <Link href="/login" className="text-[#5295BC] font-medium underline">
              登入
            </Link>
          </p>
        </div>
      </form>
    </main>
  </div>
  );
};

export default RegisterPage;