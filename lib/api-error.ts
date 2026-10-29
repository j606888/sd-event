import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

type Translate = Awaited<ReturnType<typeof getTranslations<never>>>;
/** 完整的訊息 key，例如 "apiErrors.common.notLoggedIn" */
export type ApiMessageKey = Parameters<Translate>[0];
export type ApiMessageValues = Parameters<Translate>[1];

/**
 * 依請求者的介面語言翻譯一句伺服器訊息。
 * 語系跟頁面一樣從 NEXT_LOCALE cookie / Accept-Language 決定（i18n/request.ts），
 * 瀏覽器打 API 時兩者都會帶上，所以回傳的訊息會跟畫面同一種語言。
 */
export async function apiMessage(key: ApiMessageKey, values?: ApiMessageValues): Promise<string> {
  const t = await getTranslations();
  return t(key, values);
}

/** `{ error: 翻譯後的訊息 }` 的 JSON 回應。前端照舊顯示 `data.error`。 */
export async function apiError(
  key: ApiMessageKey,
  status: number,
  values?: ApiMessageValues
): Promise<NextResponse<{ error: string }>> {
  return NextResponse.json({ error: await apiMessage(key, values) }, { status });
}
