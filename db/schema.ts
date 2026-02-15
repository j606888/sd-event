import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

// 用户角色枚举
export const userRoleEnum = pgEnum("user_role", ["Organizer"]);

// 这是一个示例 schema，你可以根据需求修改
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  encryptedPassword: text("encrypted_password").notNull(),
  role: userRoleEnum("role").notNull().default("Organizer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 在这里添加更多的表定义...
