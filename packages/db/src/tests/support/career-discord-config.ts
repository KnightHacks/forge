/** Production IDs supplied by the Career contributor for #648. */
export const EXPECTED_CAREER_CONFIG = [
  {
    development: null,
    key: "career_internship_channel",
    description: "Channel for internship posts and digests.",
    kind: "channel",
    production: "1537949209867583499",
  },
  {
    development: null,
    key: "career_new_grad_channel",
    description: "Channel for new-grad posts and digests.",
    kind: "channel",
    production: "1537949230742900827",
  },
  {
    development: null,
    key: "career_source_health_channel",
    description: "Optional channel for job source failure alerts.",
    kind: "channel",
    production: null,
  },
  {
    development: null,
    key: "career_internship_digest_role",
    description: "Discord role pinged for internship digests.",
    kind: "role",
    production: "1537949002031562862",
  },
  {
    development: null,
    key: "career_new_grad_digest_role",
    description: "Discord role pinged for new-grad digests.",
    kind: "role",
    production: "1537948941348503683",
  },
] as const;
