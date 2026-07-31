/**
 * Eyebrow copy for each admin page, keyed by page.
 *
 * The eyebrow is the small label above an admin page title. Every admin page
 * reads its own key from here rather than inlining the string, so the wording
 * for a page is decided once and stays consistent between the page and any
 * loading skeleton that renders the same header.
 *
 * This is copy, not layout: `AdminPageHeader` takes the eyebrow as a prop and
 * has no knowledge of these keys. Keeping the map here means importing the
 * copy does not also pull in the header component and its dependencies.
 */
export const ADMIN_PAGE_EYEBROWS = {
  alumni: "Alumni communications",
  analytics: "Club intelligence",
  checkIn: "Event attendance",
  companies: "Company intelligence",
  companyDetail: "Company record",
  discordArchive: "Discord operations",
  email: "Campaign communications",
  eventFeedback: "Feedback configuration",
  events: "Event planning",
  formCreate: "Form creation",
  formEdit: "Form configuration",
  formResponses: "Response intelligence",
  forms: "Member workflows",
  formSections: "Form organization",
  hackathonDetail: "Hackathon record",
  hackathons: "Hackathon operations",
  issueArchive: "Issue archive",
  issueCalendar: "Club Operations",
  issueDetail: "Issue record",
  issueKanban: "Issue workflow",
  issueList: "Issue directory",
  logs: "Officer audit trail",
  members: "Member directory",
  roles: "Access control",
  rolesConfig: "Platform wiring",
} as const;
