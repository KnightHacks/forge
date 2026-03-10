import { relations } from "drizzle-orm";

import { Account, Permissions, Roles, Session, User } from "./auth";
import {
  Issue,
  IssuesToTeamsVisibility,
  IssuesToUsersAssignment,
  Member,
} from "./knight-hacks";

export const UserRelations = relations(User, ({ many, one }) => ({
  accounts: many(Account),
  member: one(Member),
  permissions: many(Permissions, {
    relationName: "userPermissionRel",
  }),
}));

export const RoleRelations = relations(Roles, ({ many }) => ({
  permissions: many(Permissions, {
    relationName: "rolePermissionRel",
  }),
}));

export const PermissionRelations = relations(Permissions, ({ one }) => ({
  role: one(Roles, {
    fields: [Permissions.roleId],
    references: [Roles.id],
    relationName: "rolePermissionRel",
  }),
  user: one(User, {
    fields: [Permissions.userId],
    references: [User.id],
    relationName: "userPermissionRel",
  }),
}));

export const AccountRelations = relations(Account, ({ one }) => ({
  user: one(User, { fields: [Account.userId], references: [User.id] }),
}));

export const MemberRelations = relations(Member, ({ one }) => ({
  user: one(User, { fields: [Member.userId], references: [User.id] }),
}));

export const SessionRelations = relations(Session, ({ one }) => ({
  user: one(User, { fields: [Session.userId], references: [User.id] }),
}));

export const issuesToTeamsVisibilityRelations = relations(
  IssuesToTeamsVisibility,
  ({ one }) => ({
    issue: one(Issue, {
      fields: [IssuesToTeamsVisibility.issueId],
      references: [Issue.id],
    }),
    team: one(Roles, {
      fields: [IssuesToTeamsVisibility.teamId],
      references: [Roles.id],
    }),
  }),
);

export const issuesToUsersAssignmentRelations = relations(
  IssuesToUsersAssignment,
  ({ one }) => ({
    issue: one(Issue, {
      fields: [IssuesToUsersAssignment.issueId],
      references: [Issue.id],
    }),
    user: one(User, {
      fields: [IssuesToUsersAssignment.userId],
      references: [User.id],
    }),
  }),
);

export const issueRelations = relations(Issue, ({ many }) => ({
  teamVisibility: many(IssuesToTeamsVisibility),
  userAssignments: many(IssuesToUsersAssignment),
}));

export const rolesRelations = relations(Roles, ({ many }) => ({
  visibleIssues: many(IssuesToTeamsVisibility),
}));

export const usersRelations = relations(User, ({ many }) => ({
  assignedIssues: many(IssuesToUsersAssignment),
}));
