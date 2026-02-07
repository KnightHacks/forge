// TODO: JSDOC all all of the non PROD_ or DEV_ exports
import { IS_PROD } from "../util";
import * as KNIGHTHACKS_8 from "./knight-hacks-8";
import * as PROJECT_LAUNCH_26 from "./project-launch-26";

export { KNIGHTHACKS_8 };
export { PROJECT_LAUNCH_26 };

export const PROD_OFFICER_ROLE = "486629374758748180";
export const DEV_OFFICER_ROLE = "1246637685011906560";
export const OFFICER_ROLE = IS_PROD ? PROD_OFFICER_ROLE : DEV_OFFICER_ROLE;

export const PROD_ADMIN_ROLE = "1319413082258411652";
export const DEV_ADMIN_ROLE = "1321955700540309645";
export const ADMIN_ROLE = IS_PROD ? PROD_ADMIN_ROLE : DEV_ADMIN_ROLE;

export const PROD_VOLUNTEER_ROLE = "1415505872360312974";
export const DEV_VOLUNTEER_ROLE = "1426947077514203279";
export const VOLUNTEER_ROLE = IS_PROD
  ? PROD_VOLUNTEER_ROLE
  : DEV_VOLUNTEER_ROLE;

// TODO: add DEV_ALUMNI_ROLE
export const PROD_ALUMNI_ROLE = "486629512101232661";
export const ALUMNI_ROLE = PROD_ALUMNI_ROLE;

export const PROD_VIP_ROLE = "1423358570203844689";
export const DEV_VIP_ROLE = "1423366084874080327";
export const VIP_ROLE = IS_PROD ? PROD_VIP_ROLE : DEV_VIP_ROLE;

export const PROD_KNIGHTHACKS_GUILD = "486628710443778071";
export const DEV_KNIGHTHACKS_GUILD = "1151877367434850364";
export const KNIGHTHACKS_GUILD = IS_PROD
  ? PROD_KNIGHTHACKS_GUILD
  : DEV_KNIGHTHACKS_GUILD;

export const PROD_LOG_CHANNEL = "1324885515412963531";
export const DEV_LOG_CHANNEL = "1284582557689843785";
export const LOG_CHANNEL = IS_PROD ? PROD_LOG_CHANNEL : DEV_LOG_CHANNEL;

export const PROD_RECRUITING_CHANNEL = "1461758896950608104";
export const RECRUITING_CHANNEL = IS_PROD
  ? PROD_RECRUITING_CHANNEL
  : DEV_LOG_CHANNEL;

export const PERMANENT_INVITE = "https://discord.com/invite/Kv5g9vf";

export const DISCORD_EVENT_TYPE = 3;
export const DISCORD_EVENT_PRIVACY_LEVEL = 2;

export const TEAMS = [
  {
    team: "Outreach",
    color: "#88fea1",
    director_role: "779845137822908436",
  },
  {
    team: "Design",
    color: "#eaacff",
    director_role: "874028482089349172",
  },
  {
    team: "Development",
    color: "#93ceff",
    director_role: "1082124530077683772",
  },
  {
    team: "Sponsorship",
    color: "#f5f4af",
    director_role: "626815399442513920",
  },
  {
    team: "Workshops",
    color: "#206694",
    director_role: "757002949603098837",
  },
  {
    team: "Projects/Mentorship",
    color: "#3498db",
    director_role: "1244790444626280550",
  },
];

export const ALLOWED_FORM_ASSIGNABLE_DISC_ROLES = [
  PROJECT_LAUNCH_26.MEMBER_ROLE,
];
