# 介面翻譯（next-intl）

介面支援繁中（`zh-TW`，原文）與英文（`en`）。網址不帶語系：使用者手動切換時寫 `NEXT_LOCALE` cookie，
沒切換過就跟著瀏覽器的 Accept-Language（見 `lib/locale.ts`）。

## 檔案

- `messages/<locale>/<namespace>.json`：一個 namespace 一個檔，`index.ts` 把它們組起來。
- 新增 namespace：兩個語系都要建檔，並在兩個 `index.ts` 加上 import。
- `zh-TW` 是型別的來源：`t("...")` 打錯 key 會編譯失敗。
- `lib/messages.test.ts` 會檢查兩個語系的 key、`{參數}`、`<標籤>` 完全一致。

## 寫法

- Client component：`const t = useTranslations("events.list")`；Server component：`const t = await getTranslations("...")`。
- key 用 camelCase，依元件／區塊分組（`events.list.empty`），不要用中文當 key。
- 繁中文案維持原本的字，翻譯只換掉寫死的字串，不順便改文案。
- 參數一律用 ICU：`"共 {count} 筆"`。英文複數用 `{count, plural, one {# registration} other {# registrations}}`。
  不要在 JSX 裡把數字跟翻譯片段拼起來，也不要把兩段翻譯接成一句（語序在英文裡會不一樣）。
- 句子裡要套樣式用 `t.rich("key", { strong: (chunks) => <strong>{chunks}</strong> })`。
- 日期一律用 `lib/format-event-date.ts`，把 `useLocale()` 傳進去；不要用 `toLocaleDateString`（會吃到執行環境的時區）。
- `lib/` 的純函式回傳 key 或代碼，由元件翻譯；hook 裡可以直接 `useTranslations`。
- placeholder、aria-label、title、`confirm()`、`alert()` 的字也要翻。
- 伺服器回來的 `data.error` 目前還是中文，保留 `data.error || t("xxxFailed")` 的寫法，API 的錯誤訊息另外處理。
- 不翻：使用者輸入的資料（活動名稱、人名、地點名稱）、SD Event、NT$、LINE、Google Map、Leader / Follower。

### 瀏覽器翻譯安全（重要）

使用者可能用 Google 翻譯把頁面再翻成日文、韓文。被翻譯的文字節點如果跟其他節點並排，
React 更新時會當機或顯示舊字（見 `instrumentation-client.ts`）。所以：

- `t()` 的輸出旁邊如果還有圖示、其他文字或條件渲染，就包一層 `<span>`，讓它成為該元素唯一的字串子節點。
- 會切換的文字（`saving ? t("saving") : t("save")`）旁邊有圖示時，文字放進自己的 `<span>`。
- 原則：一個元素裡要嘛只有一個字串運算式，要嘛全是元素。
- `t.rich` 的 chunks 是陣列，會變動的數字要寫成 `(chunks) => <span>{richText(chunks)}</span>`（`lib/rich-text.ts`），
  否則被翻譯後數字會停住。

## 用詞對照

| 中文 | English |
|---|---|
| 活動 | event |
| 報名（名詞／動詞） | registration / register |
| 報名者 | registrant |
| 參加者 | attendee |
| 聯絡人 | contact |
| 票種、票券 | ticket, ticket type |
| 票券區塊 | ticket group |
| 互斥規則 | exclusion rule |
| 價格時段（早鳥／一般／現場） | price tier (Early bird / Regular / Door) |
| 名額 | spots |
| 現場報名 | walk-in (registration) |
| 現金 | cash |
| 匯款、轉帳 | bank transfer |
| 付款方式 | payment method |
| 回報付款 | report payment |
| 確認收款 | confirm payment |
| 未付款／待確認收款／已收款／已拒絕／已退款 | Unpaid / Awaiting confirmation / Paid / Rejected / Refunded |
| 入場、報到 | check in（動詞）／ check-in（名詞） |
| 已入場／未入場 | checked in / not checked in |
| 取消入場 | undo check-in |
| 入場 QR 憑證 | entry QR pass |
| 掃 QR | scan QR |
| 退款 | refund |
| 隱藏 | hide / hidden |
| 折扣碼 | coupon code |
| 折抵 | discount |
| 活動地點 | venue |
| 主辦單位 | organizer |
| 銀行資訊 | bank account |
| LINE 付款好友 | LINE Pay payee |
| 常用資訊 | saved info |
| 注意事項 | notices |
| 參加者勾選項目 | attendee checkbox |
| 活動封面 | cover image |
| 團隊 | team |
| 管理員／驗票人員 | Admin / Check-in staff |
| 草稿／已發佈／已結束 | Draft / Published / Ended |
| 基本資訊／票券設定／統計 | Basic info / Tickets / Stats |
| 已入帳 | collected |
| 匯出 | export |
| 不確定（舞蹈角色） | Not sure |
