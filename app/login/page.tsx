"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const loginSchema = z.object({
  email: z.string().email("請輸入有效的信箱"),
  password: z.string().min(6, "密碼至少要 6 個字"),
})
type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    console.log("提交的資料：", data);
    
    // 這裡模擬 API 請求
    await new Promise((resolve) => setTimeout(resolve, 2000));
    alert("登入成功！（目前僅為模擬）");
  };

  return (
    <div className="min-h-screen flex flex-col items-center">
    <main className="w-full flex-1 max-w-md p-4 flex flex-col items-center justify-between">
      <h1 className="text-[28px] font-extrabold text-[#5295BC] mb-8 self-start" style={{ fontFamily: 'var(--font-nunito)' }}>
        SD Event.
      </h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col items-center justify-center w-full gap-6">
        <h4 className="text-[20px] font-semibold text-gray-900text-center">登入帳號</h4>
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
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            登入帳號
          </Button>
          <p className="text-gray-600 text-sm">
            還沒有帳號?{" "}
            <Link href="/register" className="text-[#5295BC] font-medium underline">
              註冊帳號
            </Link>
          </p>
        </div>
      </form>
    </main>
  </div>
  );
};

export default LoginPage;