import { relations } from "drizzle-orm";
import { pgTableCreator, primaryKey } from "drizzle-orm/pg-core";

import { Member } from "./knight-hacks";

const createTable = pgTableCreator((name) => `auth_${name}`);

export const User = createTable("user", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  discordUserId: t.varchar({ length: 255 }).notNull(),
  name: t.varchar({ length: 255 }),
  image: t.varchar({ length: 255 }),
}));

export const UserRelations = relations(User, ({ many, one }) => ({
  accounts: many(Account),
  member: one(Member),
}));

export const Account = createTable(
  "account",
  (t) => ({
    userId: t
      .uuid()
      .notNull()
      .references(() => User.id, { onDelete: "cascade" }),
    type: t
      .varchar({ length: 255 })
      .$type<"email" | "oauth" | "oidc" | "webauthn">()
      .notNull(),
    provider: t.varchar({ length: 255 }).notNull(),
    providerAccountId: t.varchar({ length: 255 }).notNull(),
    refresh_token: t.varchar({ length: 255 }),
    access_token: t.text(),
    expires_at: t.integer(),
    token_type: t.varchar({ length: 255 }),
    scope: t.varchar({ length: 255 }),
    id_token: t.text(),
    session_state: t.varchar({ length: 255 }),
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
  sessionToken: t.varchar({ length: 255 }).notNull().primaryKey(),
  userId: t
    .uuid()
    .notNull()
    .references(() => User.id, { onDelete: "cascade" }),
  expires: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
}));

export const SessionRelations = relations(Session, ({ one }) => ({
  user: one(User, { fields: [Session.userId], references: [User.id] }),
}));
