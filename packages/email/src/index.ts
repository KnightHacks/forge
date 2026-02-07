import { Listmonk } from "@maloma/listmonk";

import { env } from "./env";

export const client = new Listmonk({
  url: env.LISTMONK_URL,
  auth: {
    username: env.LISTMONK_USER,
    password: env.LISTMONK_TOKEN,
  },
});
