import { auth } from "@blade/auth";

import { SessionStoreContextProvider } from "./session-store-context-provider";

export async function Session({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <SessionStoreContextProvider session={session}>
      {children}
    </SessionStoreContextProvider>
  );
}
