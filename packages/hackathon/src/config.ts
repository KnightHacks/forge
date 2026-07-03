export interface HackathonPortalConfig {
  hackathonName: string;
  routes: {
    home: string;
    dashboard: string;
    apply: string;
    profile: string;
  };
  termsUrl: string;
  guideUrl: string;
  copy: {
    applicationName: string;
    supportChannelUrl: string;
  };
}

export const APPLICATION_STEPS = [
  {
    id: "profile",
    title: "Basics",
    eyebrow: "Start",
    fields: ["firstName", "lastName"],
  },
  {
    id: "contact",
    title: "Contact",
    eyebrow: "Reachability",
    fields: ["email", "phoneNumber"],
  },
  {
    id: "identity",
    title: "About You",
    eyebrow: "Profile",
    fields: ["dob", "country", "gender", "raceOrEthnicity"],
  },
  {
    id: "education",
    title: "School",
    eyebrow: "Education",
    fields: ["levelOfStudy", "school", "major", "gradDate", "shirtSize"],
  },
  {
    id: "application",
    title: "Application",
    eyebrow: "Application",
    fields: ["survey1", "survey2"],
  },
  {
    id: "links",
    title: "Links",
    eyebrow: "Portfolio",
    fields: [
      "githubProfileUrl",
      "linkedinProfileUrl",
      "websiteUrl",
      "resumeUpload",
    ],
  },
  {
    id: "event",
    title: "Event Details",
    eyebrow: "Event Details",
    fields: ["foodAllergies", "isFirstTime"],
  },
  {
    id: "tosAccepted",
    title: "Agreements",
    eyebrow: "Finalize",
    fields: [
      "agreesToMLHCodeOfConduct",
      "agreesToMLHDataSharing",
      "agreesToReceiveEmailsFromMLH",
    ],
  },
] as const;

export type ApplicationStep = (typeof APPLICATION_STEPS)[number];
export type ApplicationFieldName = ApplicationStep["fields"][number];
