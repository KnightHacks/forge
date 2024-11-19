import { createStore } from "zustand/vanilla";

import type { Session } from "@blade/auth";

export type AuthState = Session | null;

export type AuthStore = AuthState;

export const defaultAuthState: AuthState = null;

export const createAuthStore = (
  initialAuthState: AuthState = defaultAuthState,
) => {
  return createStore<AuthStore>()(() => initialAuthState);
};
