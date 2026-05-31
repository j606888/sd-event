# Code Review TODO

本檔案列出 `/events/:eventId` 及相關模組的待辦改善項目。
Items 1–8 + 13 已在 `feature/claude` branch 完成（commit `cfee2e6`）。
Items 9–10 已完成。
Item 11 已完成。
Item 12 已完成。
Item 14 已完成。
Item 15 已完成。

---

## ✅ 已完成

- **Item 1** — Registration 建立加 `db.transaction()`（`app/api/events/[eventId]/registrations/route.ts`）
- **Item 2** — Registration list 加 server-side pagination + filters
- **Item 3** — 合併兩次 attendee COUNT 查詢為一條 GROUP BY
- **Item 4** — `page.tsx` 抽成 custom hooks（`hooks/use-event-detail.ts`, `hooks/use-registrations.ts`）
- **Item 5** — 改用 TanStack Query（`page.tsx`, `EventStats.tsx`）
- **Item 6** — 加 DB indexes（`db/schema.ts`，migration: `drizzle/0003_wet_wilson_fisk.sql`）⚠️ 記得跑 `npm run db:migrate`
- **Item 7** — Stats endpoint 改用 DB-level aggregation（`app/api/events/[eventId]/stats/route.ts`）
- **Item 8** — DELETE event 加 ownership 驗證（`app/api/events/[eventId]/route.ts`）
- **Item 9** — 抽出 `PaymentStatusBadge`、`RoleBadge` 共用元件；date formatting 統一用 `lib/format-event-date.ts` 的 `formatTimestamp()`
- **Item 10** — Canonical types 移至 `types/registration.ts`（`Registration`、`RegistrationDetailData`、`ScannedRegistration`、`PurchaseItem`）；`EventLocation` 改從 `types/event.ts` import
- **Item 11** — `EventForm.tsx` 表單邏輯抽成 `hooks/use-event-form.ts`；`PurchaseItemDraft`、`NoticeItemDraft` 類型集中到 hook 檔案，移除三個同名 sibling 重複定義
- **Item 12** — API Response shape 統一：`purchase-items` 回傳 `purchaseItem`/`purchaseItems`，`notice-items` 回傳 `noticeItem`/`noticeItems`；同步更新 `hooks/use-event-form.ts`
- **Item 14** — QRScanner fetch 失敗後保留錯誤訊息 + 加「重試」按鈕；移除已不存在的 `processingRef`（先前已清除）
- **Item 15** — `next.config.ts` 加 `ufs.sh` / `utfs.io` remotePatterns；移除所有 `<Image unoptimized>` prop（10 處）
- **Item 13** — 搜尋加 300ms debounce（`app/events/[eventId]/page.tsx`）

---

## 🔲 待辦

### Item 16 — 缺少 Loading Skeleton
目前所有 loading 狀態只顯示文字「載入中…」。

建議加 skeleton 的地方：
- Registration list（`components/events/registration/RegistrationsList.tsx`）
- Registration detail（`components/events/registration/RegistrationDetail.tsx`）
- Event form（`components/events/management/EventForm.tsx`）

做法：用 `components/ui/skeleton.tsx`（若還沒加，用 `npx shadcn add skeleton`）。

---

### Item 17 — Filter 按鈕沒有「啟用中 filter 數量」badge
檔案：`components/events/registration/RegistrationsList.tsx`

目前 Filter 按鈕看不出來有沒有啟用篩選。

做法：計算啟用的 filter 數量（`paymentFilter !== "all"` + `checkInFilter !== "all"` + `hiddenFilter !== "non_hidden"`），在 Filter 按鈕上顯示 badge。
