import type { Metadata } from "next";
import { Nunito, Inter, Noto_Sans_TC, Plus_Jakarta_Sans } from "next/font/google";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import { QueryProvider } from "@/providers/QueryProvider";
import { Analytics } from "@vercel/analytics/react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-tc",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const displayLatin = Plus_Jakarta_Sans({
  variable: "--font-display-latin",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

/** 只有伺服器用得到的文案（API 錯誤訊息、email），不必送到瀏覽器 */
const SERVER_ONLY_NAMESPACES = new Set(["apiErrors", "eventApiErrors", "emails"]);

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: "SD Event",
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const clientMessages = Object.fromEntries(
    Object.entries(await getMessages()).filter(([namespace]) => !SERVER_ONLY_NAMESPACES.has(namespace))
  );

  return (
    <html lang={locale}>
      <body
        className={`${nunito.variable} ${inter.variable} ${notoSansTC.variable} ${displayLatin.variable} antialiased`}
      >
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        <NextIntlClientProvider messages={clientMessages}>
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
