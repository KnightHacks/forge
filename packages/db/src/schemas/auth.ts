import { relations } from "drizzle-orm";
import { pgTable, pgTableCreator, primaryKey, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

import { Member } from "./knight-hacks";

const createTable = pgTableCreator((name) => `auth_${name}`);

export const User = createTable("user", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  discordUserId: t.varchar({ length: 255 }).notNull(),
  name: t.varchar({ length: 255 }),
  email: t.varchar({ length: 255 }),
  emailVerified: t.boolean().notNull().default(false),
  image: t.varchar({ length: 255 }),
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
}));

export const Permissions = createTable("permissions", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  roleId: t.uuid().notNull().references(() => Roles.id),
  userId: t.uuid().notNull().references(() => User.id)
}));

export const Roles = createTable("roles", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  name: t.varchar().notNull().default(""),
  discordRoleId: t.varchar().unique().notNull(),
  permissions: t.varchar().notNull(),
}));

export const InsertRolesSchema = createInsertSchema(Roles);

export const UserRelations = relations(User, ({ many, one }) => ({
  accounts: many(Account),
  member: one(Member),
  permissions: many(Permissions, {
    relationName: "userPermissionRel"
  })
}));

export const RoleRelations = relations(Roles, ({ many }) => ({
  permissions: many(Permissions, {
    relationName: "rolePermissionRel"
  })
}));

export const PermissionRelations = relations(Permissions, ({one}) => ({
  role: one(Roles, {
    fields: [Permissions.roleId],
    references: [Roles.id],
    relationName: "rolePermissionRel"
  }),
  user: one(User, {
    fields: [Permissions.userId],
    references: [User.id],
    relationName: "userPermissionRel"
  })
}))

export const Account = createTable(
  "account",
  (t) => ({
    id: t.text().notNull(),
    userId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    provider: t.varchar({ length: 255 }).notNull(),
    providerAccountId: t.varchar({ length: 255 }).notNull(),
    refresh_token: t.varchar({ length: 255 }),
    access_token: t.text(),
    expires_at: t.timestamp({ mode: "date", withTimezone: true }),
    scope: t.varchar({ length: 255 }),
    id_token: t.text(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const AccountRelations = relations(Account, ({ one }) => ({
  user: one(User, { fields: [Account.userId], references: [User.id] }),
}));

export const Session = createTable("session", (t) => ({
  id: t.text().notNull().primaryKey(),
  sessionToken: t.varchar({ length: 255 }).notNull(),
  userId: t
    .uuid()
    .notNull()
    .references(() => User.id, { onDelete: "cascade" }),
  expires: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
  ipAddress: t.varchar({ length: 255 }), // add
  userAgent: t.varchar({ length: 1024 }), // add
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
}));

export const SessionRelations = relations(Session, ({ one }) => ({
  user: one(User, { fields: [Session.userId], references: [User.id] }),
}));

export const JudgeSession = createTable("judge_session", (t) => ({
  sessionToken: t.varchar({ length: 255 }).notNull().primaryKey(),
  roomName: t.text().notNull(),
  expires: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
}));

export const Verifications = createTable("verification", (t) => ({
  id: t.text().primaryKey().notNull(),
  identifier: t.text().notNull(),
  value: t.text().notNull(),
  expiresAt: t.timestamp().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp().defaultNow().notNull(),
}));
