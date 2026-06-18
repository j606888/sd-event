import {
  pgTable,
  serial,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  primaryKey,
  foreignKey,
  index,
  unique,
} from "drizzle-orm/pg-core";

// ============ Enums ============
export const userRoleEnum = pgEnum("user_role", ["Organizer"]);
export const teamMemberRoleEnum = pgEnum("team_member_role", ["owner", "member"]);
export const eventStatusEnum = pgEnum("event_status", ["draft", "published"]);
export const eventTypeEnum = pgEnum("event_type", ["Party", "Workshop", "Festival"]);

// ============ Users ============
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  encryptedPassword: text("encrypted_password").notNull(),
  role: userRoleEnum("role").notNull().default("Organizer"),
  activeTeamId: integer("active_team_id").references(() => teams.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ Teams ============
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ Team Members (user ↔ team 多對多) ============
export const teamMembers = pgTable(
  "team_members",
  {
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: teamMemberRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.teamId, t.userId] }) })
);

// ============ Team Invitations (團隊邀請，用於邀請未註冊使用者) ============
export const teamInvitations = pgTable("team_invitations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: teamMemberRoleEnum("role").notNull().default("member"),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============ Event Locations (活動地點，依團隊) ============
export const eventLocations = pgTable("event_locations", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  googleMapUrl: text("google_map_url"),
  address: text("address"),
  remark: text("remark"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ Organizers (主辦單位，依團隊) ============
export const organizers = pgTable("organizers", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  photoUrl: text("photo_url"),
  lineId: text("line_id"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ Bank Infos (銀行資訊，依團隊) ============
export const bankInfos = pgTable("bank_infos", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  bankCode: text("bank_code").notNull(),
  account: text("account"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ Events ============
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  /** 公開金鑰：用於不需登入的分享/報名網址，避免暴露數字 ID */
  publicKey: text("public_key").notNull().unique(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  /** 活動類型，用於決定購買項目範本；既有資料 backfill 為 Party */
  type: eventTypeEnum("type").notNull().default("Party"),
  description: text("description"),
  coverUrl: text("cover_url"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  locationId: integer("location_id").references(() => eventLocations.id, {
    onDelete: "set null",
  }),
  organizerId: integer("organizer_id").references(() => organizers.id, {
    onDelete: "set null",
  }),
  bankInfoId: integer("bank_info_id").references(() => bankInfos.id, {
    onDelete: "set null",
  }),
  allowMultiplePurchase: boolean("allow_multiple_purchase").default(false),
  autoCalcAmount: boolean("auto_calc_amount").default(false),
  status: eventStatusEnum("status").notNull().default("published"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_events_team_id").on(t.teamId),
]);

// ============ Event Purchase Item Groups (票種群組，如 主票種 / 單堂課 / 加購) ============
export const eventPurchaseItemGroups = pgTable("event_purchase_item_groups", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  /** "single"（擇一/radio） | "multiple"（可複選/checkbox） */
  selectionMode: text("selection_mode").notNull().default("single"),
  /** 是否必須從此群組選至少一項 */
  required: boolean("required").notNull().default(true),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_purchase_item_groups_event_id").on(t.eventId),
]);

// ============ Event Purchase Items (購買項目) ============
export const eventPurchaseItems = pgTable("event_purchase_items", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  /** 所屬票種群組；null = 此活動未使用群組（沿用舊模型） */
  groupId: integer("group_id").references(() => eventPurchaseItemGroups.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  /** 為 true 時不顯示於公開報名表，仍保留於後台與既有報名紀錄 */
  hidden: boolean("hidden").default(false).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_purchase_items_event_id").on(t.eventId),
]);

// ============ Event Price Tiers (票價時段，如 早鳥 / 一般 / 現場) ============
export const eventPriceTiers = pgTable("event_price_tiers", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** 此時段截止時間（含）；最後一段（fallback，如「現場/一般」）為 null = 永不過期 */
  endsAt: timestamp("ends_at", { withTimezone: true }),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_price_tiers_event_id").on(t.eventId),
]);

// ============ Event Purchase Item Prices (購買項目於各時段的價格) ============
export const eventPurchaseItemPrices = pgTable("event_purchase_item_prices", {
  id: serial("id").primaryKey(),
  purchaseItemId: integer("purchase_item_id")
    .notNull()
    .references(() => eventPurchaseItems.id, { onDelete: "cascade" }),
  tierId: integer("tier_id")
    .notNull()
    .references(() => eventPriceTiers.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  unique("uniq_item_tier").on(t.purchaseItemId, t.tierId),
  index("idx_item_prices_item_id").on(t.purchaseItemId),
]);

// ============ Event Group Exclusions (票種群組互斥：選了 A 群組即鎖住 B 群組) ============
// 對稱關係，寫入時正規化 groupAId < groupBId 以避免 (A,B)/(B,A) 重複。
export const eventGroupExclusions = pgTable("event_group_exclusions", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  groupAId: integer("group_a_id")
    .notNull()
    .references(() => eventPurchaseItemGroups.id, { onDelete: "cascade" }),
  groupBId: integer("group_b_id")
    .notNull()
    .references(() => eventPurchaseItemGroups.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("uniq_group_exclusion_pair").on(t.groupAId, t.groupBId),
  index("idx_group_exclusions_event_id").on(t.eventId),
]);

// ============ Event Notice Items (須知項目) ============
export const eventNoticeItems = pgTable("event_notice_items", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_notice_items_event_id").on(t.eventId),
]);

// ============ Event Registrations (報名記錄) ============
export const eventRegistrations = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  /** 公開金鑰：用於不需登入的查看/付款回報網址 */
  registrationKey: text("registration_key").notNull().unique(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  purchaseItemId: integer("purchase_item_id")
    .references(() => eventPurchaseItems.id, { onDelete: "set null" }),
  /** 聯絡人資訊（現場報名可只填姓名，故電話/信箱允許為空） */
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  /** 報名來源："online"（公開表單）| "walk_in"（現場由主辦建立） */
  source: text("source").notNull().default("online"),
  /** 付款資訊 */
  paymentMethod: text("payment_method"), // "Line Pay", "Bank Transfer", "Other", "Cash"
  totalAmount: integer("total_amount").notNull(),
  /** 付款狀態 */
  paymentStatus: text("payment_status").notNull().default("pending"), // "pending", "reported", "confirmed", "rejected"
  /** 付款回報資訊 */
  paymentScreenshotUrl: text("payment_screenshot_url"),
  paymentNote: text("payment_note"), // 銀行末五碼或其他訊息
  /** 管理員可將報名標記為隱藏，在報名詳情頁可再取消隱藏 */
  hidden: boolean("hidden").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_reg_event_id").on(t.eventId),
  index("idx_reg_reg_key").on(t.registrationKey),
]);

// ============ Event Registration Purchase Items (報名購買項目，用於多選) ============
export const eventRegistrationPurchaseItems = pgTable(
  "event_registration_purchase_items",
  {
    id: serial("id").primaryKey(),
    registrationId: integer("registration_id").notNull(),
    purchaseItemId: integer("purchase_item_id").notNull(),
    quantity: integer("quantity").notNull().default(1),
    /** 報名當下解析出的單價（含時段）快照；舊資料為 null */
    unitAmount: integer("unit_amount"),
    /** 報名當下生效的時段名稱（純記錄用）；無時段或舊資料為 null */
    tierName: text("tier_name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    foreignKey({
      name: "erpi_registration_id_fk",
      columns: [t.registrationId],
      foreignColumns: [eventRegistrations.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "erpi_purchase_item_id_fk",
      columns: [t.purchaseItemId],
      foreignColumns: [eventPurchaseItems.id],
    }).onDelete("cascade"),
    index("idx_erpi_reg_id").on(t.registrationId),
    index("idx_erpi_item_id").on(t.purchaseItemId),
  ]
);

// ============ Event Attendees (參加者) ============
export const eventAttendees = pgTable("event_attendees", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id")
    .notNull()
    .references(() => eventRegistrations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(), // "Leader", "Follower", "Not sure"
  checkedIn: boolean("checked_in").default(false).notNull(),
  checkedInAt: timestamp("checked_in_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_attendees_reg_id").on(t.registrationId),
]);
