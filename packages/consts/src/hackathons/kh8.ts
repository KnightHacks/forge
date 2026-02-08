// Because @forge/db requires @forge/consts we can't import @forge/db right
// here. Ideally there is another way but im not too sure.
// TODO: look into not doing this
import type { HackerClass } from "../../../db/src/schemas/knight-hacks";
import { IS_PROD } from "../util";

export const PROD_DISCORD_ROLE_KNIGHT_HACKS_8 = "1408025502119231498";
export const DEV_DISCORD_ROLE_KNIGHT_HACKS_8 = "1420819573816692857";
export const KH_EVENT_ROLE_ID = IS_PROD
  ? PROD_DISCORD_ROLE_KNIGHT_HACKS_8
  : DEV_DISCORD_ROLE_KNIGHT_HACKS_8;

export const PROD_DISCORD_ROLE_OPERATORS = "1415702220825038879";
export const DEV_DISCORD_ROLE_OPERATORS = "1420819261223600239";

export const PROD_DISCORD_ROLE_MACHINIST = "1415702276433248406";
export const DEV_DISCORD_ROLE_MACHINIST = "1420819223797698683";

export const PROD_DISCORD_ROLE_SENTINELS = "1415702308494250136";
export const DEV_DISCORD_ROLE_SENTINELS = "1420819277279137892";

export const PROD_DISCORD_ROLE_HARBINGER = "1415702341214011392";
export const DEV_DISCORD_ROLE_HARBINGER = "1420819326075801670";

export const PROD_DISCORD_ROLE_MONSTOLOGIST = "1415702361653121044";
export const DEV_DISCORD_ROLE_MONSTOLOGIST = "1420819295759237222";

export const PROD_DISCORD_ROLE_ALCHEMIST = "1415702383274491934";
export const DEV_DISCORD_ROLE_ALCHEMIST = "1420819309965611140";

export const PROD_DISCORD_SUPERADMIN = "486629374758748180";
export const DEV_DISCORD_SUPERADMIN = "1246637685011906560";

export type AssignableHackerClass = Exclude<HackerClass, "VIP">;

export const CLASS_ROLE_ID: Record<AssignableHackerClass, string> = {
  Operator: IS_PROD ? PROD_DISCORD_ROLE_OPERATORS : DEV_DISCORD_ROLE_OPERATORS,
  Mechanist: IS_PROD ? PROD_DISCORD_ROLE_MACHINIST : DEV_DISCORD_ROLE_MACHINIST,
  Sentinel: IS_PROD ? PROD_DISCORD_ROLE_SENTINELS : DEV_DISCORD_ROLE_SENTINELS,
  Harbinger: IS_PROD ? PROD_DISCORD_ROLE_HARBINGER : DEV_DISCORD_ROLE_HARBINGER,
  Monstologist: IS_PROD
    ? PROD_DISCORD_ROLE_MONSTOLOGIST
    : DEV_DISCORD_ROLE_MONSTOLOGIST,
  Alchemist: IS_PROD ? PROD_DISCORD_ROLE_ALCHEMIST : DEV_DISCORD_ROLE_ALCHEMIST,
} as const satisfies Record<AssignableHackerClass, string>;

export interface ClassInfo {
  team: string;
  teamColor: string;
  classPfp: string;
}

export const HACKER_CLASS_INFO: Record<AssignableHackerClass, ClassInfo> = {
  Mechanist: {
    team: "Humanity",
    teamColor: "#228be6",
    classPfp: "/khviii/mechanist.jpg",
  },
  Operator: {
    team: "Humanity",
    teamColor: "#228be6",
    classPfp: "/khviii/operator.jpg",
  },
  Sentinel: {
    team: "Humanity",
    teamColor: "#228be6",
    classPfp: "/khviii/sentinel.jpg",
  },
  Monstologist: {
    team: "Monstrosity",
    teamColor: "#e03131",
    classPfp: "/khviii/monstologist.jpg",
  },
  Harbinger: {
    team: "Monstrosity",
    teamColor: "#e03131",
    classPfp: "/khviii/harbinger.jpg",
  },
  Alchemist: {
    team: "Monstrosity",
    teamColor: "#e03131",
    classPfp: "/khviii/alchemist.jpg",
  },
};
