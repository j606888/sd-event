# TODO — UX 測試報告未完成項目

> 背景：2026-07-14 用 Chrome 實測了整個主辦方建立活動流程（活動類型範本 → 票價時段 → 折扣碼 →
> 公開頁報名 → 回報付款 → 確認收款 → 統計 → 手動入場 → 現場報名），當時發現的 bug 與大部分
> UX 問題已修完（跨日日期、時段價快照顯示、活動類型空白、折扣碼提示與已用次數、早鳥截止徽章、
> 匯款帳號連動、付款狀態用詞）。以下是**尚未處理**的項目。
>
> 本機測試資料：event id 8（`Bachata Sensual Weekend Workshop`，publicKey `h5t6jyej`），
> 已有兩筆報名（registrationKey `6uwyf54caeey` 含折扣碼 VIP20 + 一筆現場報名）。
> 開發指令：`yarn dev -p 3010`，本機 DB 見 CLAUDE.md。

## 1. 回報付款頁與入場憑證頁改成置中卡片版面（主要項目）

**問題**：`/report-payment/[registrationKey]` 與 `/entry-voucher/[registrationKey]` 是整頁全寬、
靠左的版面，和報名流程（`/e/[publicKey]`、`/registration-success/[registrationKey]`）的
深藍漸層背景 + 置中白色圓角卡片風格完全不一致，桌機上看起來像沒排版。

**做法**：
- 參考 `components/events/registration/steps/EventDetailsStep.tsx` 的外層結構：
  `min-h-screen bg-gradient-to-b from-ink to-[#2c5d7c] p-4 sm:py-10` +
  `mx-auto max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl`。
- 改 `app/report-payment/[registrationKey]/page.tsx` 與 `app/entry-voucher/[registrationKey]/page.tsx`
  （若內容在其他元件內，順著 import 找）。
- 手機寬度下應與現狀差異不大，重點是桌機置中收斂。

**驗證**：開 `http://localhost:3010/report-payment/6uwyf54caeey` 與
`http://localhost:3010/entry-voucher/6uwyf54caeey`，桌機視窗下內容置中、卡片式；
回報付款送出流程仍可用（送出後導回 registration-success）。

## 2. 順手修：entry-voucher 頁既有的 lint error

`app/entry-voucher/[registrationKey]/page.tsx` 有一個既有的
`react-hooks/set-state-in-effect` error（effect 內同步 `setError("無效的報名編號")`）。
做第 1 項時順手重構掉（例如改成 render 時直接判斷 `!registrationKey` 顯示錯誤，不進 effect）。

## 3. 統計頁「報名項目統計」的金額標示

`components/events/management/EventStats.tsx`（API：`app/api/events/[eventId]/stats/route.ts`）
的「報名項目統計」顯示的是項目**現行定價**（如 Full Pass $2,200），但實際成交多為時段價
（早鳥 $1,800），容易誤讀成營收。二選一：
- (a) 金額改為該項目實收加總（join `event_registration_purchase_items.unit_amount`），或
- (b) 拿掉金額只留「N 人」，營收看上方三張卡片。
偏好 (a)，但 (b) 也可接受，看實作成本。

**驗證**：`/events/8` → 統計 → 報名項目統計的數字能和報名詳情對上。

## 4. 報名者列表增加「使用折扣碼」篩選（低優先）

主辦方目前無法看「哪些報名用了折扣碼／用了哪個碼」。在
`/events/[eventId]` 報名者列表的篩選（`components/events/registration/RegistrationsList.tsx`、
`lib/registration-list-filters.ts`、列表 API `app/api/events/[eventId]/registrations/route.ts`）
加一個折扣碼維度（有用碼／未用碼，或依 code 篩選），列表列上可順便顯示 coupon code 小標籤。

**驗證**：篩選後只剩測試小美那筆（VIP20）；CSV 匯出不需要動（已有金額欄）。

## 5. 產品層討論（不要直接動工，先跟我確認方向）

- **建立活動的發布流程**：目前按「建立活動」即上線銷售（無草稿/預覽狀態）。schema 的
  `events.status` 已有 `draft | published` 欄位但流程沒用到。若要做：建立後進 draft、
  活動頁加「發布」按鈕與預覽。影響公開頁的可見性判斷，需先確認要不要做。
- **報名表折扣碼欄位**：輸入後要按「套用」才生效；使用者輸入完直接按「選擇付款方式」
  會不會漏掉？可考慮在進下一步時自動嘗試套用或提醒。

---

完成一項就把該節從本檔刪除；全部完成後刪掉這個檔案。
