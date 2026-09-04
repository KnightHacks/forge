import { relations } from "drizzle-orm";

import { Account, Permissions, Roles, Session, User } from "./auth";
import {
  AlumniBulletinPost,
  Company,
  Employment,
  Event,
  EventAttendee,
  EventPublicationWork,
  FormsSchemas,
  GuestJudgeSession,
  Hackathon,
  HackathonAgreementDefinition,
  HackathonEventPublication,
  HackathonJudgingConfiguration,
  HackathonPortalAuthorizationCode,
  HackathonPortalClient,
  HackathonPortalSession,
  HackathonPortalSessionCredential,
  Hacker,
  HackerAgreementAcceptance,
  HackerAttendee,
  HackerCheckInPass,
  HackerParticipantCommand,
  HackerProfile,
  HackerProfileRevision,
  Issue,
  IssueHistory,
  IssueReminderDelivery,
  IssuesToTeamsVisibility,
  IssuesToUsersAssignment,
  Judge,
  JudgingRoom,
  JudgingRoomAccessLink,
  JudgingRoomPresence,
  Member,
  Project,
  ProjectChallenge,
  ProjectMember,
  ProjectToChallenge,
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
  createdAlumniBulletinPosts: many(AlumniBulletinPost, {
    relationName: "alumniBulletinCreatedBy",
  }),
  updatedAlumniBulletinPosts: many(AlumniBulletinPost, {
    relationName: "alumniBulletinUpdatedBy",
  }),
  deletedProjects: many(Project),
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

export const AlumniBulletinPostRelations = relations(
  AlumniBulletinPost,
  ({ one }) => ({
    createdBy: one(User, {
      fields: [AlumniBulletinPost.createdByUserId],
      references: [User.id],
      relationName: "alumniBulletinCreatedBy",
    }),
    form: one(FormsSchemas, {
      fields: [AlumniBulletinPost.formId],
      references: [FormsSchemas.id],
    }),
    updatedBy: one(User, {
      fields: [AlumniBulletinPost.updatedByUserId],
      references: [User.id],
      relationName: "alumniBulletinUpdatedBy",
    }),
  }),
);

export const EventRelations = relations(Event, ({ many }) => ({
  attendees: many(EventAttendee),
  publicationWork: many(EventPublicationWork),
}));

export const HackathonRelations = relations(Hackathon, ({ many, one }) => ({
  agreementDefinitions: many(HackathonAgreementDefinition),
  attendees: many(HackerAttendee),
  participantCommands: many(HackerParticipantCommand),
  portalClients: many(HackathonPortalClient),
  publications: many(HackathonEventPublication),
  projects: many(Project),
  projectChallenges: many(ProjectChallenge),
  judgingConfiguration: one(HackathonJudgingConfiguration),
  judges: many(Judge),
  judgingRooms: many(JudgingRoom),
}));

export const ProjectRelations = relations(Project, ({ many, one }) => ({
  challenges: many(ProjectToChallenge),
  deletedBy: one(User, {
    fields: [Project.deletedByUserId],
    references: [User.id],
  }),
  hackathon: one(Hackathon, {
    fields: [Project.hackathonId],
    references: [Hackathon.id],
  }),
  members: many(ProjectMember),
}));

export const ProjectMemberRelations = relations(ProjectMember, ({ one }) => ({
  project: one(Project, {
    fields: [ProjectMember.projectId],
    references: [Project.id],
  }),
}));

export const ProjectChallengeRelations = relations(
  ProjectChallenge,
  ({ many, one }) => ({
    hackathon: one(Hackathon, {
      fields: [ProjectChallenge.hackathonId],
      references: [Hackathon.id],
    }),
    projects: many(ProjectToChallenge),
  }),
);

export const ProjectToChallengeRelations = relations(
  ProjectToChallenge,
  ({ one }) => ({
    challenge: one(ProjectChallenge, {
      fields: [ProjectToChallenge.challengeId, ProjectToChallenge.hackathonId],
      references: [ProjectChallenge.id, ProjectChallenge.hackathonId],
    }),
    project: one(Project, {
      fields: [ProjectToChallenge.projectId, ProjectToChallenge.hackathonId],
      references: [Project.id, Project.hackathonId],
    }),
  }),
);

export const HackathonJudgingConfigurationRelations = relations(
  HackathonJudgingConfiguration,
  ({ one }) => ({
    hackathon: one(Hackathon, {
      fields: [HackathonJudgingConfiguration.hackathonId],
      references: [Hackathon.id],
    }),
  }),
);

export const JudgingRoomRelations = relations(JudgingRoom, ({ many, one }) => ({
  accessLinks: many(JudgingRoomAccessLink),
  challenge: one(ProjectChallenge, {
    fields: [JudgingRoom.challengeId, JudgingRoom.hackathonId],
    references: [ProjectChallenge.id, ProjectChallenge.hackathonId],
  }),
  hackathon: one(Hackathon, {
    fields: [JudgingRoom.hackathonId],
    references: [Hackathon.id],
  }),
  presences: many(JudgingRoomPresence),
}));

export const JudgeRelations = relations(Judge, ({ many, one }) => ({
  hackathon: one(Hackathon, {
    fields: [Judge.hackathonId],
    references: [Hackathon.id],
  }),
  presences: many(JudgingRoomPresence),
  user: one(User, { fields: [Judge.userId], references: [User.id] }),
}));

export const JudgingRoomAccessLinkRelations = relations(
  JudgingRoomAccessLink,
  ({ many, one }) => ({
    guestSessions: many(GuestJudgeSession),
    room: one(JudgingRoom, {
      fields: [JudgingRoomAccessLink.roomId, JudgingRoomAccessLink.hackathonId],
      references: [JudgingRoom.id, JudgingRoom.hackathonId],
    }),
  }),
);

export const GuestJudgeSessionRelations = relations(
  GuestJudgeSession,
  ({ one }) => ({
    accessLink: one(JudgingRoomAccessLink, {
      fields: [GuestJudgeSession.accessLinkId, GuestJudgeSession.hackathonId],
      references: [JudgingRoomAccessLink.id, JudgingRoomAccessLink.hackathonId],
    }),
    judge: one(Judge, {
      fields: [GuestJudgeSession.judgeId, GuestJudgeSession.hackathonId],
      references: [Judge.id, Judge.hackathonId],
    }),
  }),
);

export const JudgingRoomPresenceRelations = relations(
  JudgingRoomPresence,
  ({ one }) => ({
    judge: one(Judge, {
      fields: [JudgingRoomPresence.judgeId, JudgingRoomPresence.hackathonId],
      references: [Judge.id, Judge.hackathonId],
    }),
    room: one(JudgingRoom, {
      fields: [JudgingRoomPresence.roomId, JudgingRoomPresence.hackathonId],
      references: [JudgingRoom.id, JudgingRoom.hackathonId],
    }),
  }),
);

export const HackerProfileRelations = relations(
  HackerProfile,
  ({ many, one }) => ({
    attendees: many(HackerAttendee),
    revisions: many(HackerProfileRevision),
    user: one(User, {
      fields: [HackerProfile.userId],
      references: [User.id],
    }),
  }),
);

export const HackerProfileRevisionRelations = relations(
  HackerProfileRevision,
  ({ one }) => ({
    legacyHacker: one(Hacker, {
      fields: [HackerProfileRevision.legacyHackerId],
      references: [Hacker.id],
    }),
    profile: one(HackerProfile, {
      fields: [HackerProfileRevision.profileId],
      references: [HackerProfile.id],
    }),
  }),
);

export const HackerAttendeeRelations = relations(
  HackerAttendee,
  ({ many, one }) => ({
    agreementAcceptances: many(HackerAgreementAcceptance),
    checkInPasses: many(HackerCheckInPass),
    hackathon: one(Hackathon, {
      fields: [HackerAttendee.hackathonId],
      references: [Hackathon.id],
    }),
    profile: one(HackerProfile, {
      fields: [HackerAttendee.profileId],
      references: [HackerProfile.id],
    }),
    profileRevision: one(HackerProfileRevision, {
      fields: [HackerAttendee.profileRevisionId],
      references: [HackerProfileRevision.id],
    }),
  }),
);

export const HackathonAgreementDefinitionRelations = relations(
  HackathonAgreementDefinition,
  ({ many, one }) => ({
    acceptances: many(HackerAgreementAcceptance),
    hackathon: one(Hackathon, {
      fields: [HackathonAgreementDefinition.hackathonId],
      references: [Hackathon.id],
    }),
  }),
);

export const HackerAgreementAcceptanceRelations = relations(
  HackerAgreementAcceptance,
  ({ one }) => ({
    attendee: one(HackerAttendee, {
      fields: [HackerAgreementAcceptance.attendeeId],
      references: [HackerAttendee.id],
    }),
    definition: one(HackathonAgreementDefinition, {
      fields: [HackerAgreementAcceptance.agreementDefinitionId],
      references: [HackathonAgreementDefinition.id],
    }),
  }),
);

export const HackerCheckInPassRelations = relations(
  HackerCheckInPass,
  ({ one }) => ({
    attendee: one(HackerAttendee, {
      fields: [HackerCheckInPass.attendeeId],
      references: [HackerAttendee.id],
    }),
  }),
);

export const HackerParticipantCommandRelations = relations(
  HackerParticipantCommand,
  ({ one }) => ({
    hackathon: one(Hackathon, {
      fields: [HackerParticipantCommand.hackathonId],
      references: [Hackathon.id],
    }),
    user: one(User, {
      fields: [HackerParticipantCommand.userId],
      references: [User.id],
    }),
  }),
);

export const HackathonPortalClientRelations = relations(
  HackathonPortalClient,
  ({ many, one }) => ({
    authorizationCodes: many(HackathonPortalAuthorizationCode),
    hackathon: one(Hackathon, {
      fields: [HackathonPortalClient.hackathonId],
      references: [Hackathon.id],
    }),
    sessions: many(HackathonPortalSession),
  }),
);

export const HackathonPortalSessionCredentialRelations = relations(
  HackathonPortalSessionCredential,
  ({ one }) => ({
    session: one(HackathonPortalSession, {
      fields: [HackathonPortalSessionCredential.portalSessionId],
      references: [HackathonPortalSession.id],
    }),
  }),
);

export const HackathonPortalAuthorizationCodeRelations = relations(
  HackathonPortalAuthorizationCode,
  ({ one }) => ({
    client: one(HackathonPortalClient, {
      fields: [HackathonPortalAuthorizationCode.portalClientId],
      references: [HackathonPortalClient.id],
    }),
  }),
);

export const HackathonPortalSessionRelations = relations(
  HackathonPortalSession,
  ({ many, one }) => ({
    client: one(HackathonPortalClient, {
      fields: [HackathonPortalSession.portalClientId],
      references: [HackathonPortalClient.id],
    }),
    credentials: many(HackathonPortalSessionCredential),
  }),
);

export const HackathonEventPublicationRelations = relations(
  HackathonEventPublication,
  ({ many, one }) => ({
    hackathon: one(Hackathon, {
      fields: [HackathonEventPublication.hackathonId],
      references: [Hackathon.id],
    }),
    work: many(EventPublicationWork),
  }),
);

export const EventPublicationWorkRelations = relations(
  EventPublicationWork,
  ({ one }) => ({
    event: one(Event, {
      fields: [EventPublicationWork.eventId],
      references: [Event.id],
    }),
    publication: one(HackathonEventPublication, {
      fields: [EventPublicationWork.publicationId],
      references: [HackathonEventPublication.id],
    }),
  }),
);

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
