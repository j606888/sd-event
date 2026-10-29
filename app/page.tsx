import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/brand/Logo";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect("/events");
  }
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen flex flex-col items-center">
      <main className="w-full flex-1 max-w-md p-4 flex flex-col items-center justify-between">
        <h1 className="mb-8 self-start">
          <Logo />
        </h1>
        <div>
          <div className="w-full mb-8 mx-auto text-center flex justify-center items-center">
            <Image
              src="/data-management.jpg"
              alt="Data Management"
              width={220}
              height={220}
              className=""
              priority
            />
          </div>
          <h2 className="text-[17px] font-semibold text-gray-900 mb-4 text-center">
            {t("landing.headline")}
          </h2>
          <p className="text-[15px] text-gray-600 mb-8 text-center leading-relaxed">
            {t("landing.body")}
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full items-center mb-8">
          <Button asChild>
            <Link
              href="/register"
              className="w-full"
            >
              {t("signUp")}
            </Link>
          </Button>
          <p className="text-gray-600 text-sm">
            <span>{t("hasAccount")}</span>{" "}
            <Link href="/login" className="text-brand-strong font-medium underline">
              {t("logIn")}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
