"use client";

import { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";

import type { Session } from "@blade/auth";

import type { AuthStore } from "~/app/stores/auth/session-store";
import { createAuthStore } from "~/app/stores/auth/session-store";

export type SessionStoreApi = ReturnType<typeof createAuthStore>;

export const SessionStoreContext = createContext<SessionStoreApi | undefined>(
  undefined,
);

export function SessionStoreContextProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  const storeRef = useRef<SessionStoreApi>();
  if (!storeRef.current) {
    storeRef.current = createAuthStore(session);
  }

  return (
    <SessionStoreContext.Provider value={storeRef.current}>
      {children}
    </SessionStoreContext.Provider>
  );
}

export function useSessionStore<T>(selector: (state: AuthStore) => T): T {
  const authStore = useContext(SessionStoreContext);
  if (!authStore) {
    throw new Error("useAuthStore must be used within an AuthStoreProvider");
  }
  return useStore(authStore, selector);
}
