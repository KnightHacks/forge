import { relations } from "drizzle-orm";

import { Account, Permissions, Roles, Session, User } from "./auth";
import {
  Company,
  Employment,
  Event,
  EventAttendee,
  Issue,
  IssueHistory,
  IssueReminderDelivery,
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
  operatedEventCheckIns: many(EventAttendee, {
    relationName: "eventCheckInOperator",
  }),
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
  history: many(IssueHistory),
  reminderDeliveries: many(IssueReminderDelivery),
}));

export const IssueHistoryRelations = relations(IssueHistory, ({ one }) => ({
  actor: one(User, {
    fields: [IssueHistory.actorId],
    references: [User.id],
  }),
  issue: one(Issue, {
    fields: [IssueHistory.issueId],
    references: [Issue.id],
  }),
}));

export const IssueReminderDeliveryRelations = relations(
  IssueReminderDelivery,
  ({ one }) => ({
    issue: one(Issue, {
      fields: [IssueReminderDelivery.issueId],
      references: [Issue.id],
    }),
  }),
);

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

export const MemberRelations = relations(Member, ({ many, one }) => ({
  user: one(User, { fields: [Member.userId], references: [User.id] }),
  eventAttendance: many(EventAttendee),
  employment: many(Employment),
}));

export const CompanyRelations = relations(Company, ({ many, one }) => ({
  createdBy: one(User, {
    fields: [Company.createdByUserId],
    references: [User.id],
  }),
  employment: many(Employment),
  mergedInto: one(Company, {
    fields: [Company.mergedIntoCompanyId],
    references: [Company.id],
    relationName: "companyMerge",
  }),
  mergedCompanies: many(Company, { relationName: "companyMerge" }),
}));

export const EmploymentRelations = relations(Employment, ({ one }) => ({
  company: one(Company, {
    fields: [Employment.companyId],
    references: [Company.id],
  }),
  member: one(Member, {
    fields: [Employment.memberId],
    references: [Member.id],
  }),
}));

export const EventRelations = relations(Event, ({ many }) => ({
  attendees: many(EventAttendee),
}));

export const EventAttendeeRelations = relations(EventAttendee, ({ one }) => ({
  event: one(Event, {
    fields: [EventAttendee.eventId],
    references: [Event.id],
  }),
  member: one(Member, {
    fields: [EventAttendee.memberId],
    references: [Member.id],
  }),
  operator: one(User, {
    fields: [EventAttendee.checkedInBy],
    references: [User.id],
    relationName: "eventCheckInOperator",
  }),
}));

export const SessionRelations = relations(Session, ({ one }) => ({
  user: one(User, { fields: [Session.userId], references: [User.id] }),
}));
