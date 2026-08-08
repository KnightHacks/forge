import { db } from "../src/client";
import { inspectIssueIntegrity } from "../src/issues/preflight";
import { Permissions, Roles, User } from "../src/schemas/auth";
import {
  Event,
  Issue,
  IssuesToTeamsVisibility,
  IssuesToUsersAssignment,
  Template,
} from "../src/schemas/knight-hacks";

const [
  assignments,
  events,
  issues,
  roleAssignments,
  roles,
  templates,
  users,
  visibility,
] = await Promise.all([
  db.select().from(IssuesToUsersAssignment),
  db.select({ hackathonId: Event.hackathonId, id: Event.id }).from(Event),
  db
    .select({
      eventId: Issue.event,
      id: Issue.id,
      parentId: Issue.parent,
      status: Issue.status,
      teamId: Issue.team,
    })
    .from(Issue),
  db
    .select({ roleId: Permissions.roleId, userId: Permissions.userId })
    .from(Permissions),
  db
    .select({
      channelId: Roles.issueReminderChannel,
      id: Roles.id,
    })
    .from(Roles),
  db
    .select({ body: Template.body, id: Template.id, name: Template.name })
    .from(Template),
  db.select({ id: User.id }).from(User),
  db.select().from(IssuesToTeamsVisibility),
]);

const report = inspectIssueIntegrity({
  assignments,
  eventIds: events
    .filter((event) => event.hackathonId === null)
    .map((event) => event.id),
  issues,
  reminderDestinations: roles.map((role) => ({
    channelId: role.channelId,
    roleId: role.id,
  })),
  roleAssignments,
  roleIds: roles.map((role) => role.id),
  templates,
  userIds: users.map((user) => user.id),
  visibility,
});
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (!report.canEnable) process.exitCode = 1;
