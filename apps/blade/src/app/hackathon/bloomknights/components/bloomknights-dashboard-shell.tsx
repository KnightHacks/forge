import type { ReactNode } from "react";

const BLOOMKNIGHTS_DASHBOARD_BACKGROUND =
  "https://assets.knighthacks.org/bloomknights-application-6400.webp";

export function BloomKnightsDashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main
      className="min-h-screen bg-emerald-950 bg-cover bg-center bg-no-repeat px-4 py-16"
      style={{
        backgroundImage: `linear-gradient(
          to bottom,
          rgba(3, 13, 15, 0.38) 0%,
          rgba(3, 13, 15, 0.58) 52%,
          rgba(3, 13, 15, 0.86) 100%
        ), url("${BLOOMKNIGHTS_DASHBOARD_BACKGROUND}")`,
      }}
    >
      <div className="mx-auto w-full max-w-8xl">{children}</div>
    </main>
  );
}
