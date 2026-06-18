# Event 類型 (Party / Workshop / Festival) + 購買項目範本

> 設計文件。延續 [`ticketing-architecture.md`](./ticketing-architecture.md) 的票務基礎設施。

## Context（為什麼做這件事）

目前所有 Event 沒有分類，每次新增活動都要從零手動建立票價時段 (price tiers)、票種群組 (groups)、
購買項目 (purchase items)。同類活動（Party / Workshop / Festival）的票務結構其實高度重複：

- **Party**：通常有早鳥優惠 → 同一張入場票，配「超早鳥 / 早鳥 / 現場」幾個時段價。
- **Workshop**：有 Full Pass 優惠價、或單堂購買，且要決定「Party 是否涵蓋」，同時也要早鳥 / 現場價。
- **Festival**：上述兩者的綜合，方案最多。

目標：在「新增活動」時先選類型，系統就**預先填好**對應的票價時段／群組／購買項目（範本），
使用者再依需求增刪修改。範本只是省去重複輸入，不限制最終結果。

### 已確認的決策

1. **範本寫死在程式碼**（不另建資料表，最快上線；要改範本就改 code）。
2. **type 在建立時選、之後可改**；編輯頁顯示 type 欄位但改 type 不會重套範本。
3. **範本純預填、完全可改**（套用 = 把 draft 灌進現有表單狀態，等同手動建立）。

既有票務基礎設施（Phase 1 時段價 / Phase 2 群組 / Phase 2.5 群組互斥）已足夠，範本只是這些東西的預設組合，**無需任何破壞性變更**。

## 既有架構重點

- `db/schema.ts`：enum 慣例 `export const xEnum = pgEnum("table_field", [...])`，例如 `eventStatusEnum = pgEnum("event_status", ["draft","published"])`。`events` 表用 `status: eventStatusEnum("status").notNull().default("published")`。
- 票務表關係：
  - `eventPriceTiers`（event 層級時段：name + endsAt，空 endsAt = fallback 永不過期）
  - `eventPurchaseItemGroups`（title / selectionMode `single|multiple` / required）
  - `eventPurchaseItems`（name / amount fallback / groupId nullable / hidden / sortOrder）
  - `eventPurchaseItemPrices`（purchaseItemId × tierId → amount，unique(item,tier)）
  - `eventGroupExclusions`（groupAId/groupBId 對稱互斥）
- 表單 draft 型別都在 `hooks/use-event-form.ts`：`PriceTierDraft`、`PurchaseItemGroupDraft`、`PurchaseItemDraft`（含 `prices: ItemTierPriceDraft[]`、`groupDraftIndex`）。create 模式用 `tierDraftIndex` / `groupDraftIndex` 暫指，送出時於 `use-event-form.ts` 提交流程解析成真正 id。
- create 模式目前已預設兩個 tier（超早鳥／早鳥），groups/items 起始為空。
- 共用表單元件 `components/events/management/EventForm.tsx`（3 個 tab：基本資訊 / 販售項目 / 主辦&收款）。
- 入口：建立 = `app/events/new/page.tsx`（`mode="create"`）；編輯 = `app/events/[eventId]/page.tsx`（`mode="edit"`）。
- API：建立 `POST app/api/events/route.ts`（只建主檔，回傳新 event id）；之後表單流程再逐一 POST groups / price-tiers / purchase-items、PUT group-exclusions。更新主檔 `PATCH app/api/events/[eventId]/route.ts`。

## 實作計畫

### 1. Schema：新增 event type 欄位
檔案 `db/schema.ts`
- 在 Enums 區新增：`export const eventTypeEnum = pgEnum("event_type", ["Party", "Workshop", "Festival"]);`
- `events` 表新增欄位：`type: eventTypeEnum("type").notNull().default("Party"),`
- `npm run db:generate` → 產生 `drizzle/0007_*.sql`。因為 NOT NULL + default "Party"，既有資料會自動 backfill 成 Party（符合需求）。
- 先 `npm run db:migrate:local` 驗證，確認無誤後再 `npm run db:migrate:prod`。

### 2. 範本定義（純程式碼）
新檔 `lib/event-templates.ts`
- 匯出 `EventType = "Party" | "Workshop" | "Festival"`、`EVENT_TYPES`（含中文 label / 說明，供 picker 用）。
- 匯出 `getEventTemplate(type): { priceTiers, groups, purchaseItems, groupExclusions }`，回傳值直接用 `use-event-form.ts` 的 draft 型別（`PriceTierDraft[]` / `PurchaseItemGroupDraft[]` / `PurchaseItemDraft[]` / `Array<[string,string]>`）。
  - 群組互斥 key 沿用表單慣例 `draft-<index>`（對應 group 的陣列 index）。
  - item 的 `prices` 用 `tierDraftIndex` 對應 tier 陣列 index；amount 預設 0（或合理 placeholder）讓使用者填。

建議初版範本內容（皆可後續在 code 調整）：

**Party**
- tiers：超早鳥 / 早鳥 / 一般·現場
- groups：無（單一獨立項目）
- items：`Party 入場票`，跨 3 個 tier 都給價格欄

**Workshop**
- tiers：早鳥 / 一般·現場
- groups：`課程方案`(single, required)、`加購`(multiple, optional)
- items：`Full Pass（含 Party）`、`單堂課` → 課程方案；`加購 Party` → 加購

**Festival**（綜合，方案最多）
- tiers：超早鳥 / 早鳥 / 一般 / 現場
- groups：`Pass 方案`(single, required)、`單堂課`(multiple, optional)、`Party`(multiple, optional)
- items：`Full Pass（含 Party）`、`Full Pass（不含 Party）`、`單日 Pass` → Pass 方案；`單堂課` → 單堂課；`週五 Party`、`週六 Party` → Party
- 互斥：初版留空。註記限制：群組互斥是「群組層級」，無法表達「只有含 Party 的 Full Pass 才鎖 Party 群組」這種項目層級條件，故 Festival 互斥交由使用者自行設定。

### 3. 表單接上 type 與範本
檔案 `hooks/use-event-form.ts`
- `EventFormInitialData` 加 `type: EventType`。
- `UseEventFormParams` 加 `initialType?: EventType`。
- 新增 state `const [type, setType] = useState<EventType>(initialType ?? "Party")`，並輸出 `type` / `setType`。
- create 模式初始化 tiers/groups/items：改為由 `getEventTemplate(initialType ?? "Party")` 帶入（取代目前寫死的兩個 tier、空 groups/items）。
- 新增 `applyTemplate(type)`：以該 type 的範本覆寫 `priceTiers/groups/purchaseItems/groupExclusions`（給 create 模式換類型時用；會覆寫現有 draft）。
- edit 模式：`type` 由 initialData 帶入；改 type 只更新 state，不重套範本。
- 提交流程（create 的 POST `/api/events` body、edit 的 PATCH body）帶上 `type`。

### 4. API 接受 type
- `app/api/events/route.ts` POST：body 解析加 `type`（驗證 ∈ 三值，預設 "Party"），寫入 `events.type`。
- `app/api/events/[eventId]/route.ts` PATCH：允許更新 `type`（驗證同上）。
- 若有 zod schema，一併加入 enum 驗證。

### 5. 建立流程：類型 / 範本選擇器
檔案 `app/events/new/page.tsx` + `EventForm.tsx`
- 新增頁先呈現類型卡片（Party / Workshop / Festival，文案取自 `EVENT_TYPES`；可含「空白」選項）。
- 選定後把 `initialType` 傳給 `EventForm`，表單即預填對應範本。
- 在「販售項目」tab 提供「切換範本／類型」入口：呼叫 `applyTemplate`，因會覆寫已編輯內容，需 confirm 提示。
- 編輯頁（`app/events/[eventId]/page.tsx` → 基本資訊 tab）顯示 type 為一般 select，改了只存 type、不動既有項目。

## 關鍵檔案一覽
- `db/schema.ts`（enum + 欄位）
- `drizzle/0007_*.sql`（generate 產生）
- `lib/event-templates.ts`（**新檔**，範本定義 + getEventTemplate）
- `hooks/use-event-form.ts`（type state、範本初始化、applyTemplate、提交帶 type）
- `app/api/events/route.ts`、`app/api/events/[eventId]/route.ts`（接受 type）
- `app/events/new/page.tsx`（類型/範本 picker）
- `components/events/management/EventForm.tsx`（type 欄位 + 換範本入口）
- `app/events/[eventId]/page.tsx`（編輯頁 type 欄位）

## 驗證方式
1. `docker compose up -d` 啟動本地 DB → `npm run db:generate` → `npm run db:migrate:local`，用 `npm run db:studio:local` 確認 `events.type` 存在且舊資料皆為 `Party`。
2. `npm run dev`，到 `/events/new`：分別選 Party / Workshop / Festival，確認表單預填對應 tiers / groups / items；可任意增刪改後成功建立。
3. 建立後到該活動編輯頁，確認 type 欄位顯示正確、可改；改 type 不會清掉既有項目。
4. 打開公開報名頁 `/e/[publicKey]`，確認套範本建立的票務在報名流程運作正常（時段價、群組單/多選、必填、互斥）。
5. `npm run lint` 與 `npm run build` 通過。
6. 全部確認後 `npm run db:migrate:prod` 套用到正式 DB。
