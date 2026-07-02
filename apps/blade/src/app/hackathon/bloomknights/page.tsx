import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@forge/auth";

import type { DashboardFrameTheme } from "~/app/_components/dashboard/dashboard-frame-theme";
import { BaseHackathonDashboard } from "~/app/_components/dashboard/hackathon-dashboard/components";
import HackerDashboard from "~/app/_components/dashboard/hacker-dashboard/hacker-dashboard";
import { api, HydrateClient } from "~/trpc/server";
import { BloomKnightsDashboardShell } from "./components/bloomknights-dashboard-shell";

export const metadata: Metadata = {
  title: "Blade | BloomKnights Dashboard",
  description: "The official BloomKnights hackathon dashboard.",
};

const BLOOMKNIGHTS_PINK = "#f384d4";
const BLOOMKNIGHTS_HACKERS_GUIDE =
  "https://knight-hacks.notion.site/bloomknights2026";

const bloomKnightsDashboardFrameTheme: DashboardFrameTheme = {
  frameClassName:
    "border border-[#aad163]/70 bg-[#aad163] shadow-xl shadow-[#aad163]/20 backdrop-blur-sm dark:bg-[#aad163]",
  checkedInFrameClassName: "min-h-0 lg:min-h-[380px]",
  topTabClassName: "bg-[#aad163] dark:bg-[#aad163]",
  bottomTabClassName: "bg-[#aad163] dark:bg-[#aad163]",
  leftAccentClassName: "bg-[#f384d4]",
  cornerAccentColor: BLOOMKNIGHTS_PINK,
  hideFrameCutouts: true,
  contentCardClassName:
    "border-white/80 bg-white text-[#f384d4] shadow-sm shadow-[#aad163]/15 dark:bg-white",
  statusBadgeClassName: "bg-white text-[#f384d4] shadow-none dark:bg-white",
  sectionShellClassName:
    "border-0 bg-transparent bg-none shadow-none backdrop-blur-0",
  sectionCardClassName: "shadow-none",
  sectionHeadingClassName: "bk-flower-cycle-text",
  countdownGroupClassName: "shadow-none",
  countdownUnitWrapperClassName: "shadow-none",
  countdownUnitCardClassName:
    "border-white/80 bg-white text-[#f384d4] shadow-none dark:bg-white",
  countdownUnitLabelClassName: "text-[#aad163]",
  eventCardClassName:
    "border-[#aad163]/70 bg-[#aad163] text-white shadow-lg shadow-[#aad163]/20 hover:shadow-[#aad163]/25",
  eventMetaClassName: "text-[#f384d4]",
  eventBadgeClassName: "bg-white text-[#f384d4] hover:bg-white",
  eventPointsClassName: "text-white",
  actionButtonClassName:
    "border-white/80 bg-white text-[#f384d4] shadow-sm shadow-[#aad163]/15 transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#f384d4]/80 hover:bg-white hover:shadow-lg hover:shadow-[#f384d4]/20 active:translate-y-0 active:shadow-none dark:bg-white dark:hover:bg-white motion-reduce:transform-none motion-reduce:transition-none",
  actionBloomClassName: "bk-bloom-cta-action",
  actionIconClassName:
    "text-[#f384d4] group-hover:text-[#f384d4] dark:group-hover:text-[#f384d4]",
  actionTextClassName: "text-[#f384d4] dark:text-[#f384d4]",
  qrDialogContentClassName:
    "border-[#aad163]/70 bg-[#aad163] text-white dark:bg-[#aad163] [&>button:last-child]:text-[#f384d4] [&>button:last-child]:hover:bg-transparent [&>button:last-child]:focus:bg-transparent [&>button:last-child]:focus:ring-[#f384d4] [&>button:last-child]:focus:ring-offset-[#aad163] [&>button:last-child]:data-[state=open]:bg-transparent",
  qrDialogTitleClassName: "text-white",
  qrDialogAccentClassName: "text-[#f384d4]",
  issueDialogContentClassName:
    "border-[#aad163]/70 bg-[#aad163] text-white dark:bg-[#aad163] [&>button:last-child]:text-white [&>button:last-child]:hover:bg-transparent [&>button:last-child]:focus:bg-transparent [&>button:last-child]:focus:ring-[#f384d4] [&>button:last-child]:focus:ring-offset-[#aad163] [&>button:last-child]:data-[state=open]:bg-transparent",
  issueDialogTitleClassName: "text-[#f384d4]",
  issueDialogDescriptionClassName: "text-white",
  issueDialogLabelClassName: "text-[#f384d4]",
  issueDialogTextareaClassName:
    "border-white/80 bg-white text-[#111827] placeholder:text-[#6b7280] focus-visible:ring-[#f384d4]",
  issueDialogCancelButtonClassName:
    "border-white/80 bg-transparent text-white hover:bg-white/15 hover:text-white",
  issueDialogSubmitButtonClassName:
    "bg-[#f384d4] text-white hover:bg-[#f384d4]/90 disabled:bg-[#f384d4]/60 disabled:text-white/80",
  pastHackathonsDialogContentClassName:
    "border-[#aad163]/70 bg-[#aad163] text-white dark:bg-[#aad163] [&>button:last-child]:text-white [&>button:last-child]:hover:bg-transparent [&>button:last-child]:focus:bg-transparent [&>button:last-child]:focus:ring-[#f384d4] [&>button:last-child]:focus:ring-offset-[#aad163] [&>button:last-child]:data-[state=open]:bg-transparent",
  pastHackathonsDialogTitleClassName: "text-white",
  pastHackathonsEmptyClassName: "text-white",
  pastHackathonsCardClassName: "bg-[#f384d4] text-white dark:!bg-[#f384d4]",
  pastHackathonsCardTitleClassName: "text-white",
  pastHackathonsLabelClassName: "text-[#aad163]",
  pastHackathonsValueClassName: "text-white",
  pastHackathonsIconClassName: "text-[#aad163]",
  hidePastHackathonsCardCutout: true,
  confirmButtonClassName: "bg-[#f384d4] text-white hover:bg-[#f384d4]/90",
  confirmDialogContentClassName:
    "border-[#aad163]/70 bg-[#aad163] text-white dark:bg-[#aad163] [&>button:last-child]:text-white [&>button:last-child]:hover:bg-transparent [&>button:last-child]:focus:bg-transparent [&>button:last-child]:focus:ring-[#f384d4] [&>button:last-child]:focus:ring-offset-[#aad163] [&>button:last-child]:data-[state=open]:bg-transparent",
  confirmDialogTitleClassName: "text-white",
  confirmDialogDescriptionClassName: "text-[#f384d4]",
  confirmDialogTermsClassName: "border-white/50 text-white",
  confirmDialogTermsLinkClassName:
    "text-[#f384d4] hover:text-[#f384d4] hover:shadow-none",
  confirmDialogCancelButtonClassName:
    "border-white/80 bg-transparent text-white hover:bg-white/15 hover:text-white",
  confirmDialogSubmitButtonClassName:
    "bg-[#f384d4] text-white hover:bg-[#f384d4]/90 disabled:bg-[#f384d4]/60 disabled:text-white/80",
  confirmSuccessDialogContentClassName:
    "border-[#aad163]/70 bg-[#aad163] text-white dark:bg-[#aad163] [&>button:last-child]:text-white [&>button:last-child]:hover:bg-transparent [&>button:last-child]:focus:bg-transparent [&>button:last-child]:focus:ring-[#f384d4] [&>button:last-child]:focus:ring-offset-[#aad163] [&>button:last-child]:data-[state=open]:bg-transparent",
  confirmSuccessDialogTitleClassName: "text-[#f384d4]",
  confirmSuccessDialogDescriptionClassName: "text-white",
  confirmSuccessDialogButtonClassName:
    "bg-[#f384d4] text-white hover:bg-[#f384d4]/90",
  withdrawDialogContentClassName:
    "border-[#aad163]/70 bg-[#aad163] text-white dark:bg-[#aad163] [&>button:last-child]:text-white [&>button:last-child]:hover:bg-transparent [&>button:last-child]:focus:bg-transparent [&>button:last-child]:focus:ring-[#f384d4] [&>button:last-child]:focus:ring-offset-[#aad163] [&>button:last-child]:data-[state=open]:bg-transparent",
  withdrawDialogTitleClassName: "text-[#f384d4]",
  withdrawDialogDescriptionClassName: "text-white",
  withdrawDialogPromptClassName: "text-[#f384d4]",
  withdrawDialogInputClassName:
    "border-white/80 bg-white text-[#111827] placeholder:text-[#6b7280] focus-visible:ring-[#f384d4]",
  withdrawDialogCancelButtonClassName:
    "border-white/80 bg-transparent text-white hover:bg-white/15 hover:text-white",
  checkedInStatusClassName: "text-[#f384d4]",
  confirmedStatusClassName: "text-[#f384d4]",
  confirmedStatusIconColor: BLOOMKNIGHTS_PINK,
};

export default async function BloomKnightsHackathonPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const hackathon = await api.hackathon.getHackathon({
    hackathonName: "bloomknights",
  });

  if (!hackathon) {
    notFound();
  }

  const hacker = await api.hackerQuery.getHacker({
    hackathonName: hackathon.name,
  });

  return (
    <HydrateClient>
      <BloomKnightsDashboardShell>
        {hacker?.status === "checkedin" ? (
          <BaseHackathonDashboard
            dashboardFrameTheme={bloomKnightsDashboardFrameTheme}
            guideHref={BLOOMKNIGHTS_HACKERS_GUIDE}
            hackathon={hackathon}
            hacker={hacker}
          />
        ) : (
          <HackerDashboard
            dashboardFrameTheme={bloomKnightsDashboardFrameTheme}
            hackathon={hackathon}
            hacker={hacker}
          />
        )}
      </BloomKnightsDashboardShell>
    </HydrateClient>
  );
}
