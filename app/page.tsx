import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect("/events");
  }

  return (
    <div className="min-h-screen flex flex-col items-center">
      <main className="w-full flex-1 max-w-md p-4 flex flex-col items-center justify-between">
        <h1 className="text-[28px] font-extrabold text-[#5295BC] mb-8 self-start" style={{ fontFamily: 'var(--font-nunito)' }}>
          SD Event.
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
            受夠了用 Google Form 來辦活動?
          </h2>
          <p className="text-[15px] text-gray-600 mb-8 text-center leading-relaxed">
            從建立活動、收集表單、對帳查帳、到最後的 QR-Code 入場我們全都幫你做好了
            還不趕快來試試看
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full items-center mb-8">
          <Button asChild>
            <Link
              href="/register"
              className="w-full"
            >
              註冊帳號
            </Link>
          </Button>
          <p className="text-gray-600 text-sm">
            已經有帳號了?{" "}
            <Link href="/login" className="text-[#5295BC] font-medium underline">
              登入
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
