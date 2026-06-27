import { IS_PROD } from "../util";

export const HACKATHON_NAME = "bloomknights";
export const PROD_DISCORD_ROLE = "1510751065786683412";
export const DEV_DISCORD_ROLE = "1520492619921227836";
export const EVENT_ROLE_ID = IS_PROD ? PROD_DISCORD_ROLE : DEV_DISCORD_ROLE;
