export const hackerSdkQueryKeys = {
  root(portalKey: string) {
    return ["forge-hacker-sdk", "v1", portalKey] as const;
  },
  publicHackathon(portalKey: string) {
    return [...this.root(portalKey), "public-hackathon"] as const;
  },
  participant(portalKey: string) {
    return [...this.root(portalKey), "participant"] as const;
  },
  session(portalKey: string) {
    return [...this.participant(portalKey), "session"] as const;
  },
  application(portalKey: string) {
    return [...this.participant(portalKey), "application"] as const;
  },
  dashboard(portalKey: string) {
    return [...this.participant(portalKey), "dashboard"] as const;
  },
  resume(portalKey: string) {
    return [...this.participant(portalKey), "resume"] as const;
  },
  checkInPass(portalKey: string) {
    return [...this.participant(portalKey), "check-in-pass"] as const;
  },
  schedule(portalKey: string) {
    return [...this.participant(portalKey), "schedule"] as const;
  },
  attendance(portalKey: string) {
    return [...this.participant(portalKey), "attendance"] as const;
  },
  points(portalKey: string) {
    return [...this.participant(portalKey), "points"] as const;
  },
  leaderboard(portalKey: string, scope: string) {
    return [...this.participant(portalKey), "leaderboard", scope] as const;
  },
} as const;
