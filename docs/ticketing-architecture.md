# 可擴充票務架構：時段價 + 票種群組

> 設計文件。實作分 Phase 進行，可跨 session。本檔為後續實作的單一依據。

## Context（為什麼要做）

目前活動的購買項目（`eventPurchaseItems`）是**一層平的清單** `{ name, amount, hidden, sortOrder }`，
搭配 event 上兩個布林開關 `allowMultiplePurchase`（開放多選）與 `autoCalcAmount`（自動算金額），
金額 = `Σ(已選項目 amount) × 參加者人數`（`hooks/use-event-application-form.ts:89-111`）。

這個模型對 workshop / festival 這類活動有三個結構性痛點：

1. **沒有「時段」概念** → 早鳥 / 一般 / 現場價只能複製成多個獨立項目
   （`全餐早鳥 $2500`、`全餐一般 $2800`…），項目數量爆炸。
2. **沒有「套票 vs 單買」的區分** → 自動加總只對純單買有效；套票是「買越多越便宜」的固定價，
   被加總破壞，所以組織者只能關掉自動算、改在描述塞一大段說明文字。
3. **沒有「擇一 / 可複選 / 加購」的群組規則** → 無法表達「主票種擇一 + 單堂課複選 + Party 加購」。

### 已確認的決策

| 決策 | 選擇 |
|------|------|
| 核心定價模型 | **選項式 + 時段價**（預先定義每個可售選項，系統依當下時段加總；不做自動折扣推導） |
| 選購層級 | **報名層級**（維持現狀：選一組票 × 人數），不做每位參加者各選 |
| 時段價 | **依當下日期自動切換**早鳥 / 一般 / 現場 |
| 條件加購（雙堂免費加 Party 等） | **延後**，第一版加購用固定價 / 獨立項目處理 |

### 目標成果

組織者建活動時，能用「群組 + 時段價」描述完整票務（如 Gabriel Workshop / Bachata festival 範例），
報名頁依當下日期自動顯示正確價格並自動算總額，**不再需要展開每種組合、不再需要長篇說明文字**。

---

## 目標架構（資料模型）

採**純加法式擴充**：新增資料表與 nullable 欄位，舊活動完全不受影響。

### 1. 時段價 `eventPriceTiers`（活動層級）

```
eventPriceTiers {
  id          serial PK
  eventId     int  FK -> events.id (cascade)
  name        text         // "早鳥" / "一般" / "現場"
  endsAt      timestamptz? // 此時段截止時間；最後一段（fallback）為 null = 永不過期
  sortOrder   int  default 0
  createdAt / updatedAt
}
```

**Active tier 解析（伺服器端，用 server 時間，避免 client 時鐘）**：
依 `sortOrder` 升冪，取第一個 `endsAt >= now` 的時段；若都過期，取 `endsAt IS NULL` 的 fallback 時段。
活動完全沒設時段時 → 退回用 `eventPurchaseItems.amount`（現狀行為）。

### 2. 票種群組 `eventPurchaseItemGroups`（活動層級）

```
eventPurchaseItemGroups {
  id            serial PK
  eventId       int FK -> events.id (cascade)
  title         text          // "主票種" / "單堂課" / "加購"
  selectionMode text          // "single"（擇一/radio） | "multiple"（可複選/checkbox）
  required      boolean default true   // 是否必須從此群組選至少一項
  sortOrder     int default 0
  createdAt / updatedAt
}
```

`selectionMode` 取代舊的 event 層級 `allowMultiplePurchase`：新活動以群組規則為準，
舊活動（沒有群組）仍沿用 `allowMultiplePurchase`。

### 3. 擴充 `eventPurchaseItems`

新增一欄（nullable，向後相容）：

```
groupId  int? FK -> eventPurchaseItemGroups.id (set null)
```

`amount` 保留，作為「未設時段價」時的預設/fallback 價格。

### 4. 各時段價格 `eventPurchaseItemPrices`

```
eventPurchaseItemPrices {
  id              serial PK
  purchaseItemId  int FK -> eventPurchaseItems.id (cascade)
  tierId          int FK -> eventPriceTiers.id (cascade)
  amount          int
  unique(purchaseItemId, tierId)
}
```

採關聯表（與 codebase 全關聯風格一致、可查詢）。某 item 在某 tier 沒列價 → 退回 `item.amount`。

### 5. 報名時快照單價 `eventRegistrationPurchaseItems`（擴充既有 join table）

價格會隨時段變動，報名當下必須**快照**，讓報名紀錄自我完備、可稽核。新增：

```
unitAmount  int   // 報名當下解析出的單價（含時段）
tierName    text? // 報名當下生效的時段名稱（純記錄用）
```

**新活動一律走 join table**（不論群組是 single 或 multiple），舊的 `eventRegistrations.purchaseItemId`
單欄僅保留給既有資料讀取相容。

---

## 向後相容策略

- Migration 全為新增（新表 + nullable 欄位），**不需資料 backfill**。
- 讀取/報名流程依序判斷：
  - 活動**有群組** → 走新模型（群組規則 + 時段價 + join table 快照）。
  - 活動**無群組** → 走舊模型（`allowMultiplePurchase` / `autoCalcAmount` / 平項目），程式不變。
- 同時順手修一個既有 bug：`components/events/management/PurchaseItemDrawer.tsx` 讀 `data.item?.id`，
  但 API（`app/api/events/[eventId]/purchase-items/route.ts`）回傳 `{ purchaseItem }`，鍵名不符。

---

## 實作分期（可分 session 進行）

### Phase 1 — 時段價（最高價值、風險最低，幾乎純加法）✅ 已完成

**Schema**：新增 `eventPriceTiers`、`eventPurchaseItemPrices`；`db:generate` → `db:migrate:local` 驗證。

**API**：
- 新增 `app/api/events/[eventId]/price-tiers/route.ts`（GET/POST）+ `[tierId]/route.ts`（PATCH/DELETE）。
- 擴充 purchase-items API 接受/回傳各時段價（`.../purchase-items/route.ts`、`[itemId]/route.ts`）。
- `lib/api/public-event.ts`：伺服器端解析 active tier，回傳每個 item 的「當下價」+ 時段資訊，寫進 `types/event.ts` 的 `PublicEventData`。

**管理 UI**：`components/events/management/PurchaseItemsSection.tsx` 加「票價時段」編輯區；
`PurchaseItemDrawer.tsx` 由單一金額改為「每個時段一個金額」。狀態在 `hooks/use-event-form.ts`。

**報名端**：`hooks/use-event-application-form.ts` 的自動算改用「當下時段價」；
`components/events/registration/steps/ApplicationFormStep.tsx` 顯示當下價（與時段標籤）。

**報名建立**：`app/api/events/[eventId]/registrations/route.ts` 在 transaction 內以伺服器解析的時段價
回填 `unitAmount` / `tierName`，並可在後端重算總額做防呆校驗。

### Phase 2 — 票種群組 + 選擇規則（結構性）✅ 已完成

> 實作摘要：新增 `eventPurchaseItemGroups` + `eventPurchaseItems.groupId`；group CRUD 路由
> （`app/api/events/[eventId]/purchase-item-groups/`）；public-event 回傳 `groups[]`；管理 UI 改群組階層
> （`PurchaseItemsSection` / `PurchaseItemDrawer` / `use-event-form`）；報名端依群組 radio/checkbox 渲染、
> 選填擇一群組附「不需要」選項、自動算總額（`FormData.selectedByGroup`）；報名建立依群組規則後端驗證並寫 join table。
> 採**全有全無**：活動一旦有群組即走新模型，舊活動（無群組）完全沿用舊路徑。瀏覽器端對端 + 後端防呆皆已實測通過。


**Schema**：新增 `eventPurchaseItemGroups`；`eventPurchaseItems` 加 `groupId`。

**API**：新增 group CRUD 路由；purchase-items 接受 `groupId`；public-event 依群組組裝回傳。

**管理 UI**：`PurchaseItemsSection.tsx` 改為「群組 → 項目」階層；每個群組可設 `selectionMode` / `required`；
項目歸屬群組。

**報名端**：`ApplicationFormStep.tsx` 依群組渲染（single=radio、multiple=checkbox），
並依 `required` / `selectionMode` 做前端驗證；`event-application-types.ts` 的 `FormData` 由
`selectedPlanId` / `selectedPlanIds` 改為「群組 → 已選項目」的結構（保留舊欄位供無群組活動）。

**報名建立**：依群組規則做後端驗證，全部選項寫入 join table。

### Phase 2.5 — 跨群組互斥（Cross-Group Mutual Exclusion）✅ 已完成

> 實作摘要：新增**對稱配對表** `eventGroupExclusions`（`eventId` / `groupAId` / `groupBId`，寫入時正規化
> `groupAId < groupBId`、`unique(groupAId, groupBId)`，群組刪除以 FK cascade 清除）。新增 group-exclusions
> 路由（`app/api/events/[eventId]/group-exclusions/`，GET + replace-all PUT）；public-event 為每個 group 補
> 雙向展開的 `excludesGroupIds[]`；報名建立在既有 per-group 校驗迴圈後加互斥檢查（互斥兩群組不可同時有選取 → 400）。
> 報名端 `ApplicationFormStep` 對被鎖群組**灰掉 + 不可點 + 提示「已包含於『X』」**並清空其已選，
> `use-event-application-form` 的 `groupsSatisfied` 跳過被鎖群組；管理端 `PurchaseItemsSection` 每個群組附
> 「互斥群組」多選 checkbox，`use-event-form` 以群組 key（`id-<id>` / `draft-<index>`）成對保存，
> create 流程於 `groupIdByDraftIndex` 建好後解析寫入、edit 流程即時 replace-all PUT。
> 採**全有全無**沿用 Phase 2 路徑：無群組或未設互斥的活動完全不受影響。

目前群組的 `required` / `selectionMode` 只管**群組內**。Bachata Festival（套票群組 single + 單堂課 multiple +
Party 群組）若無此規則，使用者可**同時**勾「全餐雙日 $2800」**又**勾單堂 A/B/C + Party，總額被加總成 $5200，
造成重複付費。本階段以對稱的「群組↔群組互斥」解決：選了互斥群組任一項即鎖住另一群組（前端灰掉並清空、後端校驗擋下）。

### Phase 3 — 條件加購 / 折扣引擎（待實作）

第一版加購用固定價或獨立項目。日後可在群組/項目上加「加購價隨主票而變」的規則層。

**完整 Phase 3（折扣 / 條件加購引擎，更後面再做）：**
「雙堂免費加 Party」這類「加購價隨已選主票而變」的條件規則層；折扣自動推導。

---

## 關鍵檔案一覽

| 區域 | 檔案 |
|------|------|
| Schema | `db/schema.ts`、`drizzle/`（migration） |
| 購買項目 API | `app/api/events/[eventId]/purchase-items/route.ts`、`[itemId]/route.ts` |
| 新增 API | `.../price-tiers/`、`.../purchase-item-groups/` |
| 公開活動資料 | `lib/api/public-event.ts`、`types/event.ts` |
| 管理 UI | `components/events/management/PurchaseItemsSection.tsx`、`PurchaseItemDrawer.tsx`、`hooks/use-event-form.ts` |
| 報名 UI | `components/events/registration/steps/ApplicationFormStep.tsx`、`event-application-types.ts`、`hooks/use-event-application-form.ts` |
| 報名建立 | `app/api/events/[eventId]/registrations/route.ts` |

---

## 範例對照（驗證模型表達力）

**Bachata Festival（雙日）** — 主票種(擇一) + 單堂課(複選) + 加購(選填)：

```
時段：早鳥（至 5/10） / 一般（fallback）

群組「主票種」(single)
  全餐雙日(含Styling)      早鳥2500 / 一般2800
  全餐雙日(無Styling)      早鳥2200 / 一般2500
  Bachata單日全餐          早鳥1700 / 一般1900
群組「單堂課」(multiple)
  (A) Bachata Musicality   早鳥700 / 一般800
  (B) Bachata Workshop     早鳥500 / 一般600
群組「加購」(optional)
  Party                    早鳥300 / 一般400
```

**Gabriel Workshop** — 一般主票種 + 加購 Party（條件免費的部分留待 Phase 3，第一版用固定加購價）：

```
時段：早鳥（6/16~6/30） / 一般（fallback）

群組「課程」(single)
  One Class                早鳥650 / 一般800
  Two Classes              早鳥1300 / 一般1500
群組「加購 Party」(optional, single)
  加購 Party               固定200    ← 雙堂免費的條件折扣 = Phase 3
群組「單買 Party」(single)
  7/4 Main Party           早鳥350 / 一般400
```

---

## 驗證方式

1. `npm run db:generate` 確認 migration 只含新增；`npm run db:migrate:local` 套用到本地 DB（port 54331）。
2. `npm run dev`，建一個 workshop 活動：設「早鳥（截止過去日期）」「一般」兩時段 + 主票種(擇一)/單堂課(複選)/加購 群組。
3. 開公開報名頁，確認**顯示的是「一般」價**（因早鳥已過）、選項依群組規則運作、總額自動算對。
4. 完成一筆報名，到 Drizzle Studio（`npm run db:studio`）確認 `eventRegistrationPurchaseItems` 有正確 `unitAmount` / `tierName` 快照。
5. 開一個**舊有（無群組）活動**確認報名流程完全不變（相容性回歸）。
6. `npm run lint` 與 `npm run build` 通過。
</content>
</invoke>
