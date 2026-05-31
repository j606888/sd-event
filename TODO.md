# Code Review TODO

本檔案列出 `/events/:eventId` 及相關模組的待辦改善項目。
Items 1–8 + 13 已在 `feature/claude` branch 完成（commit `cfee2e6`）。
Items 9–10 已完成。
Item 11 已完成。

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
- **Item 13** — 搜尋加 300ms debounce（`app/events/[eventId]/page.tsx`）

---

## 🔲 待辦

### Item 11 — EventForm.tsx 太大（734 行），責任過多
檔案：`components/events/management/EventForm.tsx`

一個 component 同時負責：表單 state、三個 API 的 dropdown 資料、UploadThing、datetime 格式轉換、5 種 drawer open/close、create vs edit 模式。

做法：
- 表單邏輯抽成 `hooks/use-event-form.ts`
- 每個 Select+Drawer 群組（Location、Organizer、BankInfo）可考慮合成一個小元件

---

### Item 12 — API Response shape 不一致
不同 endpoint 回傳的 key 命名不統一：
- `GET /events` → `{ events: [...] }`
- `GET /events/[id]` → `{ event: {...} }`
- `GET /registrations` → `{ registrations: [...] }`
- `GET /purchase-items` → `{ items: [...] }`
- `POST /purchase-items` → `{ item: {...} }`

做法：統一成固定命名規則（例如固定用資源名稱）。需同步更新所有呼叫端。

---

### Item 14 — QR Scanner 錯誤沒有 Retry
檔案：`components/events/registration/QRScanner.tsx`

- Fetch registration 失敗後，error 訊息 3 秒自動清除，使用者不知道要重掃
- `processingRef`（Line 36）宣告後從未使用，可刪除

做法：保留錯誤訊息 + 加「重試」按鈕，移除未使用的 `processingRef`。

---

### Item 15 — 所有 `<Image>` 都加了 `unoptimized`
關鍵字搜尋：`grep -r "unoptimized" components/ app/`

UploadThing 的圖片網域（`ufs.sh`）需加到 `next.config.js` 的 `images.remotePatterns`，加完後移除 `unoptimized` prop，讓 Next.js image optimization 生效（WebP 轉換、CDN resize、blur placeholder）。

---

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
