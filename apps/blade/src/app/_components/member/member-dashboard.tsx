"use client";

import {
  Building2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Github,
  Globe2,
  Linkedin,
  Mail,
  School,
  Settings,
  Shirt,
  Sparkles,
} from "lucide-react";

import { cn } from "@forge/ui";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent } from "@forge/ui/card";
import { MEMBER_SETTINGS_PATH } from "@forge/validators";

import type { CurrentMember } from "~/hooks/use-member";
import { MemberProfilePictureUpload } from "~/app/_components/member/member-profile-picture-upload";
import { MemberResumeUpload } from "~/app/_components/member/member-resume-upload";
import { MemberRouteTransitionLink } from "~/app/_components/member/member-route-transition-link";

export const dashboardGridClass =
  "grid w-full gap-6 lg:min-h-[calc(100svh-8rem)] lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_28rem]";
export const dashboardPanelClass =
  "h-full min-h-[34rem] overflow-hidden border-white/10 bg-card/95 shadow-2xl shadow-black/25 lg:min-h-[calc(100svh-8rem)] lg:max-h-[calc(100svh-8rem)]";
export const dashboardNestedSurfaceClass =
  "rounded-md border border-white/10 bg-background/60";

function DashboardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

function EmptyValue({ children = "Not set" }: { children?: string }) {
  return <span className="text-muted-foreground">{children}</span>;
}

function GuildProfileCard({ member }: { member: CurrentMember }) {
  const displayName = `${member.firstName} ${member.lastName}`.trim();
  const isPublic = member.guildProfileVisible;
  const links = [
    {
      href: member.githubProfileUrl,
      icon: Github,
      label: "GitHub",
    },
    {
      href: member.linkedinProfileUrl,
      icon: Linkedin,
      label: "LinkedIn",
    },
    {
      href: member.websiteUrl,
      icon: Globe2,
      label: "Portfolio",
    },
  ];

  return (
    <Card className={cn(dashboardPanelClass, "flex flex-col")}>
      <CardContent className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 pt-8">
        <DashboardContent className="flex flex-col items-center text-center">
          <MemberProfilePictureUpload
            displayName={displayName}
            initialProfilePictureUrl={member.profilePictureUrl}
          />
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h2 className="text-2xl font-semibold tracking-normal">
                {displayName}
              </h2>
              <Badge
                variant="outline"
                className="gap-1 rounded-full border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.7rem] text-primary"
              >
                {isPublic ? (
                  <Eye className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <EyeOff className="h-3 w-3" aria-hidden="true" />
                )}
                {isPublic ? "Public" : "Private"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {member.tagline || <EmptyValue>Add a Guild tagline</EmptyValue>}
            </p>
          </div>
        </DashboardContent>

        <DashboardContent
          className={cn(
            dashboardNestedSurfaceClass,
            "min-h-0 overflow-y-auto p-4 lg:flex-1",
          )}
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            About
          </div>
          <p className="break-words text-sm leading-6 text-muted-foreground">
            {member.about || <EmptyValue>No Guild bio yet</EmptyValue>}
          </p>
        </DashboardContent>

        <DashboardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className={cn(dashboardNestedSurfaceClass, "p-4")}>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase text-muted-foreground">
              <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
              Company
            </div>
            <p className="break-words text-sm font-medium">
              {member.company || <EmptyValue>Not listed</EmptyValue>}
            </p>
          </div>
          <div className={cn(dashboardNestedSurfaceClass, "p-4")}>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase text-muted-foreground">
              {isPublic ? (
                <Eye className="h-4 w-4 text-primary" aria-hidden="true" />
              ) : (
                <EyeOff className="h-4 w-4 text-primary" aria-hidden="true" />
              )}
              Visibility
            </div>
            <p className="text-sm font-medium">
              {isPublic ? "Members + sponsors" : "Sponsors only"}
            </p>
          </div>
        </DashboardContent>

        <DashboardContent className="space-y-2">
          <p className="text-xs uppercase text-muted-foreground">Links</p>
          <div className="grid gap-2">
            {links.map((link) => {
              const Icon = link.icon;

              if (!link.href) {
                return (
                  <div
                    key={link.label}
                    className={cn(
                      dashboardNestedSurfaceClass,
                      "flex items-center justify-between px-3 py-2 text-sm text-muted-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {link.label}
                    </span>
                    <span>Not set</span>
                  </div>
                );
              }

              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    dashboardNestedSurfaceClass,
                    "flex items-center justify-between px-3 py-2 text-sm transition hover:border-primary/40 hover:bg-primary/10",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{link.label}</span>
                  </span>
                  <ExternalLink
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </a>
              );
            })}
          </div>
        </DashboardContent>
      </CardContent>
    </Card>
  );
}

export function MemberDashboard({ member }: { member: CurrentMember }) {
  const profileItems = [
    {
      icon: Mail,
      label: "Email",
      value: member.email,
    },
    {
      icon: School,
      label: "School",
      value: member.school,
    },
    {
      icon: Shirt,
      label: "Shirt",
      value: member.shirtSize,
    },
  ];
  const academicItems = [
    {
      label: "Level",
      value: member.levelOfStudy,
    },
    {
      label: "Major",
      value: member.major,
    },
  ];

  return (
    <main className="container py-6 md:py-8 lg:flex lg:min-h-[calc(100svh-4rem)] lg:items-stretch">
      <section className={dashboardGridClass}>
        <Card className={dashboardPanelClass}>
          <CardContent className="flex h-full flex-col justify-start gap-6 p-6 lg:overflow-y-auto lg:p-8">
            <DashboardContent>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-normal md:text-5xl">
                    Welcome, {member.firstName}
                  </h1>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <MemberRouteTransitionLink
                    href={MEMBER_SETTINGS_PATH}
                    aria-label="Edit profile"
                  >
                    <Settings
                      className="h-5 w-5 transition-transform duration-200 group-hover:rotate-45 group-data-[exiting=true]:-rotate-90 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </MemberRouteTransitionLink>
                </Button>
              </div>
            </DashboardContent>

            <div className="space-y-6">
              <DashboardContent className="grid gap-3 sm:grid-cols-3">
                {profileItems.map((item) => (
                  <div
                    key={item.label}
                    className={cn(dashboardNestedSurfaceClass, "p-4")}
                  >
                    <item.icon
                      className="mb-4 h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                    <p className="text-xs uppercase text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-1 break-words text-sm font-medium">
                      {item.value}
                    </p>
                  </div>
                ))}
              </DashboardContent>

              <DashboardContent
                className={cn(dashboardNestedSurfaceClass, "p-4")}
              >
                <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                  <School className="h-4 w-4 text-primary" aria-hidden="true" />
                  Academics
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {academicItems.map((item) => (
                    <div key={item.label}>
                      <p className="text-xs uppercase text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1 break-words text-sm font-medium">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </DashboardContent>

              <DashboardContent
                className={cn(dashboardNestedSurfaceClass, "p-4")}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium">Resume</p>
                    <p className="text-sm text-muted-foreground">
                      {member.resumeUrl
                        ? "View, replace, or remove the PDF connected to your profile."
                        : "No resume uploaded yet."}
                    </p>
                  </div>
                </div>
                <MemberResumeUpload
                  initialResumeUrl={member.resumeUrl}
                  variant="compact"
                />
              </DashboardContent>
            </div>
          </CardContent>
        </Card>

        <GuildProfileCard member={member} />
      </section>
    </main>
  );
}
