"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { cn } from "@/lib/utils";

/**
 * 主辦方輸入的活動描述以 Markdown 呈現。
 *
 * - remark-breaks：舊資料是純文字，單一換行在標準 Markdown 會被吃掉，
 *   加上這個 plugin 才能維持「打幾行就顯示幾行」的直覺。
 * - 不啟用 rehype-raw：內容來自主辦方但會公開顯示，一律不解析原始 HTML。
 */

const components: Components = {
  h1: ({ children }) => (
    <h2 className="mt-5 mb-2 text-lg font-semibold text-ink first:mt-0">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="mt-5 mb-2 text-base font-semibold text-ink first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-4 mb-1.5 text-[15px] font-semibold text-ink first:mt-0">{children}</h4>
  ),
  h4: ({ children }) => (
    <h5 className="mt-4 mb-1.5 text-[15px] font-semibold text-gray-700 first:mt-0">{children}</h5>
  ),
  h5: ({ children }) => (
    <h6 className="mt-3 mb-1 text-sm font-semibold text-gray-700 first:mt-0">{children}</h6>
  ),
  h6: ({ children }) => (
    <p className="mt-3 mb-1 text-sm font-semibold text-gray-500 first:mt-0">{children}</p>
  ),
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="text-gray-500 line-through">{children}</del>,
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-5 first:mt-0 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-0.5 [&>p]:my-0">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-brand underline underline-offset-2 hover:text-brand-hover"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-gray-300 pl-3 text-gray-600 [&>p]:my-1">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-gray-200" />,
  code: ({ children }) => (
    <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.9em] text-gray-800">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-md bg-gray-100 p-3 text-[13px] leading-relaxed [&>code]:bg-transparent [&>code]:p-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-gray-300 px-2 py-1.5 font-semibold text-ink">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-gray-200 px-2 py-1.5 align-top">{children}</td>
  ),
  img: ({ src, alt }) =>
    typeof src === "string" ? (
      // 內容為主辦方貼上的外部圖片網址，不走 next/image（避免 remote pattern 限制）
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ""} loading="lazy" className="my-3 max-w-full rounded-lg" />
    ) : null,
};

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
