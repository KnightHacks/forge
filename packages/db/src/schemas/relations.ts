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
  sessions: many(Session),
  member: one(Member),
  permissions: many(Permissions, {
    relationName: "userPermissionRel",
  }),
  assignedIssues: many(IssuesToUsersAssignment),
}));

export const RoleRelations = relations(Roles, ({ many }) => ({
  permissions: many(Permissions, {
    relationName: "rolePermissionRel",
  }),
  visibleIssues: many(IssuesToTeamsVisibility),
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

export const IssueRelations = relations(Issue, ({ many, one }) => ({
  team: one(Roles, {
    fields: [Issue.team],
    references: [Roles.id],
  }),
  teamVisibility: many(IssuesToTeamsVisibility),
  userAssignments: many(IssuesToUsersAssignment),
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

export const AccountRelations = relations(Account, ({ one }) => ({
  user: one(User, { fields: [Account.userId], references: [User.id] }),
}));

export const MemberRelations = relations(Member, ({ one }) => ({
  user: one(User, { fields: [Member.userId], references: [User.id] }),
}));

export const SessionRelations = relations(Session, ({ one }) => ({
  user: one(User, { fields: [Session.userId], references: [User.id] }),
}));
