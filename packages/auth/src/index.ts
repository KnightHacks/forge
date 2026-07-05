import { createForgeAuthClient } from "./client-factory";
import { env } from "./env";

const bladeAuthClient = createForgeAuthClient({
  baseURL: env.NEXT_PUBLIC_BLADE_URL,
});

export const { auth, authClient, signIn, signOut } = bladeAuthClient;
