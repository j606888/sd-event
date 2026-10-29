import { LanguageSwitcher } from "./LanguageSwitcher";

/**
 * 公開頁（報名、報名狀態、回報付款、入場憑證）卡片上方的語言切換。
 * 放在 `min-h-screen bg-paper p-4` 容器裡、白色卡片之前，寬度跟卡片一樣（max-w-lg）。
 */
export function PublicLanguageBar() {
  return (
    <div className="mx-auto mb-3 flex max-w-lg justify-end">
      <LanguageSwitcher className="bg-white shadow-sm" />
    </div>
  );
}
