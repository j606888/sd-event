import {
  pgTable,
  serial,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";

// ============ Enums ============
export const userRoleEnum = pgEnum("user_role", ["Organizer"]);
export const teamMemberRoleEnum = pgEnum("team_member_role", ["owner", "member"]);
export const eventStatusEnum = pgEnum("event_status", ["draft", "published"]);

// ============ Users ============
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  encryptedPassword: text("encrypted_password").notNull(),
  role: userRoleEnum("role").notNull().default("Organizer"),
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
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
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
  status: eventStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============ Event Purchase Items (購買項目) ============
export const eventPurchaseItems = pgTable("event_purchase_items", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
});
