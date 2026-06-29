interface RoleEventRecord {
  endAt: Date;
  hackathonId: string | null;
  id: string;
  legacy: boolean;
  name: string;
  roleIds: string[];
}

export function getEventRoleDependencies(
  events: readonly RoleEventRecord[],
  roleId: string,
) {
  const blockers = events
    .filter((event) => event.roleIds.includes(roleId))
    .map((event) => ({
      eventId: event.id,
      kind: event.hackathonId
        ? ("hackathon_maintenance" as const)
        : ("club" as const),
      label: event.name,
      legacy: event.legacy,
    }));
  const currentClub = blockers.filter(
    (blocker) => blocker.kind === "club" && !blocker.legacy,
  ).length;
  const historicalClub = blockers.filter(
    (blocker) => blocker.kind === "club" && blocker.legacy,
  ).length;
  const hackathonMaintenance = blockers.filter(
    (blocker) => blocker.kind === "hackathon_maintenance",
  ).length;
  return {
    blockers,
    currentClub,
    hackathonMaintenance,
    historicalClub,
    total: blockers.length,
  };
}
