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
    "border border-[#B9D79A]/70 bg-[#B9D79A] shadow-xl shadow-[#B9D79A]/20 backdrop-blur-sm dark:bg-[#B9D79A]",
  checkedInFrameClassName:
    "min-h-0 !border-[#B9D79A]/70 !bg-[#B9D79A] !shadow-[#B9D79A]/20 dark:!bg-[#B9D79A] lg:min-h-[380px]",
  checkedInActionButtonClassName:
    "!border-[#FFFDF1]/80 !bg-[#FFFDF1] hover:!bg-[#FFFDF1] dark:!bg-[#FFFDF1] dark:hover:!bg-[#FFFDF1]",
  checkedInActionIconClassName:
    "text-[#42602A] group-hover:text-[#42602A] dark:group-hover:text-[#42602A]",
  checkedInActionTextClassName: "text-[#42602A] dark:text-[#42602A]",
  checkedInSectionLabelClassName: "text-[#42602A]",
  topTabClassName: "bg-[#B9D79A] dark:bg-[#B9D79A]",
  bottomTabClassName: "bg-[#B9D79A] dark:bg-[#B9D79A]",
  leftAccentClassName: "bg-[#f384d4]",
  cornerAccentColor: BLOOMKNIGHTS_PINK,
  hideFrameCutouts: true,
  contentCardClassName:
    "border-[#FFFDF1]/80 bg-[#FFFDF1] text-[#42602A] shadow-sm shadow-[#B9D79A]/15 dark:bg-[#FFFDF1]",
  statusBadgeClassName:
    "bg-[#FFFDF1] text-[#f384d4] shadow-none dark:bg-[#FFFDF1]",
  sectionShellClassName:
    "border-0 bg-transparent bg-none shadow-none backdrop-blur-0",
  sectionCardClassName: "shadow-none",
  sectionHeadingClassName: "bk-flower-cycle-text",
  countdownGroupClassName: "shadow-none",
  countdownUnitWrapperClassName: "shadow-none",
  countdownUnitCardClassName:
    "border-[#FFFDF1]/80 bg-[#FFFDF1] text-[#42602A] shadow-none dark:bg-[#FFFDF1]",
  countdownUnitLabelClassName: "text-[#42602A]",
  eventCardClassName:
    "border-[#B9D79A]/70 bg-[#B9D79A] text-[#42602A] shadow-lg shadow-[#B9D79A]/20 hover:shadow-[#B9D79A]/25",
  eventTitleClassName: "text-[#42602A]",
  eventMetaClassName: "text-[#42602A]",
  eventDescriptionClassName: "text-[#42602A]",
  eventBadgeClassName: "bg-[#2F8B57] text-[#FFFDF1] hover:bg-[#2F8B57]",
  eventPointsClassName: "text-[#53634A]",
  actionButtonClassName:
    "border-[#FFFDF1]/80 bg-[#FFFDF1] text-[#42602A] shadow-sm shadow-[#B9D79A]/15 transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#42602A]/40 hover:bg-[#FFFDF1] hover:shadow-lg hover:shadow-[#B9D79A]/20 active:translate-y-0 active:shadow-none dark:bg-[#FFFDF1] dark:hover:bg-[#FFFDF1] motion-reduce:transform-none motion-reduce:transition-none",
  actionBloomClassName: "bk-bloom-cta-action",
  hackerQrButtonClassName: "-translate-x-0.5",
  actionIconClassName:
    "text-[#42602A] group-hover:text-[#42602A] dark:group-hover:text-[#42602A]",
  actionTextClassName: "text-[#42602A] dark:text-[#42602A]",
  qrDialogContentClassName:
    "border-[#B9D79A]/70 bg-[#B9D79A] text-white dark:bg-[#B9D79A] [&>button:last-child]:text-[#f384d4] [&>button:last-child]:hover:bg-transparent [&>button:last-child]:focus:bg-transparent [&>button:last-child]:focus:ring-[#f384d4] [&>button:last-child]:focus:ring-offset-[#B9D79A] [&>button:last-child]:data-[state=open]:bg-transparent",
  qrDialogTitleClassName: "text-white",
  qrDialogAccentClassName: "text-[#42602A]",
  issueDialogContentClassName:
    "border-[#B9D79A]/70 bg-[#B9D79A] text-[#53634A] dark:bg-[#B9D79A] [&>button:last-child]:text-[#53634A] [&>button:last-child]:hover:bg-transparent [&>button:last-child]:focus:bg-transparent [&>button:last-child]:focus:ring-[#f384d4] [&>button:last-child]:focus:ring-offset-[#B9D79A] [&>button:last-child]:data-[state=open]:bg-transparent",
  issueDialogTitleClassName: "text-[#42602A]",
  issueDialogDescriptionClassName: "text-[#53634A]",
  issueDialogLabelClassName: "text-[#42602A]",
  issueDialogTextareaClassName:
    "border-[#FFFDF1]/80 bg-[#FFFDF1] text-[#111827] placeholder:text-[#6b7280] focus-visible:ring-[#f384d4]",
  issueDialogCancelButtonClassName:
    "border-[#FFFDF1]/80 bg-[#FFFDF1] text-[#53634A] hover:bg-[#FFFDF1]/90 hover:text-[#53634A]",
  issueDialogSubmitButtonClassName:
    "bg-[#f384d4] text-white hover:bg-[#f384d4]/90 disabled:bg-[#f384d4]/60 disabled:text-white/80",
  pastHackathonsDialogContentClassName:
    "border-[#B9D79A]/70 bg-[#B9D79A] text-[#2F8B57] dark:bg-[#B9D79A] [&>button:last-child]:text-[#42602A] [&>button:last-child]:hover:bg-transparent [&>button:last-child]:focus:bg-transparent [&>button:last-child]:focus:ring-[#42602A] [&>button:last-child]:focus:ring-offset-[#B9D79A] [&>button:last-child]:data-[state=open]:bg-transparent",
  pastHackathonsDialogTitleClassName: "text-[#42602A]",
  pastHackathonsEmptyClassName: "text-[#2F8B57]",
  pastHackathonsCardClassName: "bg-[#FFFDF1] text-[#2F8B57] dark:!bg-[#FFFDF1]",
  pastHackathonsCardTitleClassName: "text-[#42602A]",
  pastHackathonsLabelClassName: "text-[#42602A]",
  pastHackathonsValueClassName: "text-[#2F8B57]",
  pastHackathonsIconClassName: "text-[#42602A]",
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
    "border-[#B9D79A]/70 bg-[#B9D79A] text-[#42602A] dark:bg-[#B9D79A] [&>button:last-child]:text-[#42602A] [&>button:last-child]:hover:bg-transparent [&>button:last-child]:focus:bg-transparent [&>button:last-child]:focus:ring-[#42602A] [&>button:last-child]:focus:ring-offset-[#B9D79A] [&>button:last-child]:data-[state=open]:bg-transparent",
  withdrawDialogTitleClassName: "text-[#42602A]",
  withdrawDialogDescriptionClassName: "text-destructive",
  withdrawDialogPromptClassName: "text-[#42602A]",
  withdrawDialogInputClassName:
    "border-[#FFFDF1]/80 bg-[#FFFDF1] text-[#111827] placeholder:text-[#6b7280] focus-visible:ring-[#42602A]",
  withdrawDialogCancelButtonClassName:
    "border-[#FFFDF1]/80 bg-[#FFFDF1] text-[#42602A] hover:bg-[#FFFDF1]/90 hover:text-[#42602A]",
  checkedInStatusClassName: "text-[#f384d4]",
  confirmedStatusClassName: "text-[#42602A]",
  confirmedStatusIconColor: "#42602A",
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
          <div className="mt-0 lg:-mt-12">
            <HackerDashboard
              dashboardFrameTheme={bloomKnightsDashboardFrameTheme}
              hackathon={hackathon}
              hacker={hacker}
            />
          </div>
        )}
      </BloomKnightsDashboardShell>
    </HydrateClient>
  );
}
