"use client";

import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Home,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  LogOut,
  Menu,
  Play,
  Printer,
  QrCode,
  ScrollText,
  UserRound,
  X,
} from "lucide-react";

import type { HackerStatus, PortalParticipant } from "@forge/hackathon";
import type { HackerProfileFormValues } from "@forge/hackathon/client";
import { FORMS } from "@forge/consts";
import { getHackerLifecycleState } from "@forge/hackathon";
import {
  useHackerDashboardFlow,
  useHackerProfileFlow,
} from "@forge/hackathon/client";
import { Avatar, AvatarFallback, AvatarImage } from "@forge/ui/avatar";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@forge/ui/form";
import { Input } from "@forge/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@forge/ui/popover";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { signOut } from "~/auth/client";
import styles from "./khix-dashboard.module.css";

const profileDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

interface CountdownState {
  days: number;
  hours: number;
  isComplete: boolean;
  label: string;
  minutes: number;
  seconds: number;
}

const WITHDRAW_HOLD_READY_MS = 1100;
const MOBILE_DRAWER_TRANSITION_MS = 280;
const KHIX_EVENT_DETAILS =
  "October 9-11, 2026 at University of Central Florida";
const PORTAL_FIREFLY_IDS = Array.from({ length: 24 }, (_, index) =>
  String(index + 1),
);
type MobileDrawerState = "closed" | "opening" | "open" | "closing";
const applicationLinks: Record<"mentor" | "volunteer", string> = {
  mentor: "https://forms.gle/CThgMyhCHZzdwYPq6",
  volunteer:
    "https://docs.google.com/forms/d/1qr_9pbTZiMRudBBaQiO3HBfTwGV_W6cTx1P_MBmOAfk/viewform?edit_requested=true",
};

const statusScenes: Record<
  HackerStatus,
  {
    body: string;
    headline: string;
    label: string;
    statusClassName: string | undefined;
  }
> = {
  accepted: {
    body: "Congratulations, you've been accepted into Knight Hacks IX! Read the terms, then agree and confirm.",
    headline: "You're in!\nConfirm your spot!",
    label: "Accepted",
    statusClassName: styles.statusAccepted,
  },
  checkedin: {
    body: "Thank you for coming!! We hope you have an awesome experience!",
    headline: "You're checked in!",
    label: "Checked in",
    statusClassName: styles.statusCheckedin,
  },
  confirmed: {
    body: "We're so excited to see you! Thank you for confirming your spot!",
    headline: "You're confirmed for Knight Hacks IX.",
    label: "Confirmed",
    statusClassName: styles.statusConfirmed,
  },
  denied: {
    body: "We could not offer you a seat this time. Thank you for applying.",
    headline: "Application update is ready.",
    label: "Not selected",
    statusClassName: styles.statusDenied,
  },
  pending: {
    body: "No action is needed right now. The organizer team is reviewing applications.",
    headline: "Your application is in review.",
    label: "In review",
    statusClassName: styles.statusPending,
  },
  waitlisted: {
    body: "If a seat opens, this page updates with your next step.",
    headline: "You're on the waitlist.",
    label: "Waitlisted",
    statusClassName: styles.statusWaitlisted,
  },
  withdrawn: {
    body: "Your application remains on record, but your attendance is withdrawn.",
    headline: "Your attendance is withdrawn.",
    label: "Withdrawn",
    statusClassName: styles.statusWithdrawn,
  },
};

function joinClasses(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function readErrorMessage(error: unknown, depth = 0): string | null {
  if (depth > 3) return null;

  if (typeof error === "string") {
    const message = error.trim();
    return message.length > 0 ? message : null;
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    return message.length > 0
      ? message
      : readErrorMessage(error.cause, depth + 1);
  }

  if (!error || typeof error !== "object") return null;

  const record = error as Record<string, unknown>;
  const directMessage = readErrorMessage(record.message, depth + 1);
  if (directMessage) return directMessage;

  for (const key of ["shape", "data", "error", "cause"]) {
    const nestedMessage = readErrorMessage(record[key], depth + 1);
    if (nestedMessage) return nestedMessage;
  }

  return null;
}

function getToastErrorMessage(error: unknown, fallback: string) {
  return readErrorMessage(error) ?? fallback;
}

function getCountdownState(
  startDate: Date,
  endDate: Date,
  now = new Date(),
): CountdownState {
  if (now >= startDate) {
    return {
      days: 0,
      hours: 0,
      isComplete: true,
      label:
        now <= endDate
          ? "Knight Hacks IX is live"
          : "Knight Hacks IX has wrapped",
      minutes: 0,
      seconds: 0,
    };
  }

  const distance = Math.max(startDate.getTime() - now.getTime(), 0);
  const totalSeconds = Math.floor(distance / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    isComplete: false,
    label: "Knight Hacks IX starts in",
    minutes,
    seconds,
  };
}

function getDisplayName(name?: string | null) {
  const trimmedName = name?.trim().replace(/\s+/g, " ") ?? "";
  if (trimmedName.length === 0) return "hacker";

  return trimmedName.replace(
    /(^|[\s'’-])(\p{L})/gu,
    (_match, prefix: string, letter: string) =>
      `${prefix}${letter.toLocaleUpperCase("en-US")}`,
  );
}

function getSessionUserDisplayName(user: KhixSessionUser) {
  const name = user.name?.trim();
  if (name != null && name.length > 0) {
    return name;
  }

  return getSessionUserEmail(user) ?? "Signed in";
}

function getSessionUserDetail(user: KhixSessionUser) {
  return getSessionUserEmail(user) ?? "Discord account";
}

function getSessionUserEmail(user: KhixSessionUser) {
  const email = user.email?.trim();
  if (email == null || email.length === 0) return null;
  if (/^\d+@blade\.org$/i.test(email)) return null;

  return email;
}

function getSessionUserInitials(user: KhixSessionUser) {
  const emailName = getSessionUserDisplayName(user).split("@")[0];
  const source = emailName != null && emailName.length > 0 ? emailName : "KH";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters =
    parts.length > 1
      ? [parts[0]?.[0], parts[1]?.[0]]
      : Array.from(parts[0] ?? source).slice(0, 2);

  const initials = letters.join("").toLocaleUpperCase("en-US");
  return initials.length > 0 ? initials : "KH";
}

function getDiscordAvatarUrl(user: KhixSessionUser) {
  const avatarHash = user.image?.trim();
  if (!avatarHash) return null;
  if (/^https?:\/\//i.test(avatarHash)) return avatarHash;

  const discordUserId = user.discordUserId?.trim();
  if (!discordUserId) return null;

  const extension = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordUserId}/${avatarHash}.${extension}`;
}

function getDateInputValue(value?: Date | string | null) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function getProfileDateLabel(value?: Date | string | null) {
  const dateValue = getDateInputValue(value);
  if (!dateValue) return "Not set";

  const [yearText, monthText, dayText] = dateValue.split("-");
  if (!yearText || !monthText || !dayText) return dateValue;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return dateValue;
  }

  return profileDateFormatter.format(date);
}

function getAllergies(value?: string | null) {
  return (
    value
      ?.split(",")
      .map((allergy) => allergy.trim())
      .filter(Boolean) ?? []
  );
}

interface KhixSessionUser {
  discordUserId?: string | null;
  email?: string | null;
  image?: string | null;
  name?: string | null;
}

interface KhixDashboardProps {
  sessionUser?: KhixSessionUser;
}

export function KhixDashboard({ sessionUser }: KhixDashboardProps) {
  const {
    config,
    confirmAttendance,
    confirmMutation,
    dashboard,
    dashboardQuery,
    loadQRCode,
    qrCode,
    qrMutation,
    reportIssue,
    reportIssueMutation,
    resumeQuery,
    resumeUrl,
    withdrawAttendance,
    withdrawMutation,
  } = useHackerDashboardFlow();
  const [issue, setIssue] = useState("");
  const [issueOpen, setIssueOpen] = useState(false);

  const handleIssueReport = async () => {
    const trimmedIssue = issue.trim();
    if (!trimmedIssue) return;

    try {
      await reportIssue(trimmedIssue);
      setIssue("");
      setIssueOpen(false);
      toast.success("Your note was sent to the organizers.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Could not report the issue."));
    }
  };

  const reportIssueNavAction = (
    <ReportIssueNavAction
      issue={issue}
      isOpen={issueOpen}
      isPending={reportIssueMutation.isPending}
      onChange={setIssue}
      onOpenChange={setIssueOpen}
      onReport={handleIssueReport}
    />
  );

  if (dashboardQuery.isPending) {
    return (
      <KhixDashboardShell
        navAction={reportIssueNavAction}
        sessionUser={sessionUser}
      >
        <DashboardSkeleton />
      </KhixDashboardShell>
    );
  }

  if (dashboardQuery.isError || !dashboard) {
    return (
      <KhixDashboardShell
        navAction={reportIssueNavAction}
        sessionUser={sessionUser}
      >
        <StatusStage
          action={
            <Button asChild className={styles.primaryButton}>
              <Link href="/dashboard">Try again</Link>
            </Button>
          }
          body="Refresh the page or try again in a moment."
          headline="Could not load your dashboard."
          greeting="Knight Hacks IX"
        />
      </KhixDashboardShell>
    );
  }

  const { hackathon, participant } = dashboard;
  const fallbackName = getDisplayName(sessionUser?.name ?? sessionUser?.email);

  if (!participant) {
    return (
      <KhixDashboardShell
        navAction={reportIssueNavAction}
        sessionUser={sessionUser}
      >
        <StatusStage
          action={
            <Button asChild className={styles.primaryButton}>
              <Link href="/apply">Application portal</Link>
            </Button>
          }
          body="Do not miss your chance."
          countdown={
            <EventCountdown
              endDate={hackathon.endDate}
              startDate={hackathon.startDate}
            />
          }
          headline="Looks like you haven't applied yet."
          greeting={`Hi, ${fallbackName}!`}
        />
        <ToolDock supportUrl={config.copy.supportChannelUrl} />
      </KhixDashboardShell>
    );
  }

  const fullName = [participant.firstName, participant.lastName]
    .map((name) => name.trim())
    .filter(Boolean)
    .join(" ");
  const greetingName =
    fullName.length > 0 ? getDisplayName(fullName) : fallbackName;
  const scene = statusScenes[participant.status];
  const lifecycleState = getHackerLifecycleState({
    applicationDeadline: hackathon.applicationDeadline,
    applicationOpen: hackathon.applicationOpen,
    confirmationCapacity: hackathon.confirmationCapacity,
    confirmationDeadline: hackathon.confirmationDeadline,
    confirmedCount: dashboard.confirmedCount,
    status: participant.status,
  });
  const confirmationClosed = lifecycleState === "accepted-confirmation-closed";
  const atCapacity = lifecycleState === "accepted-at-capacity";
  const actionPending = confirmMutation.isPending || withdrawMutation.isPending;
  const qrAvailable =
    participant.status === "confirmed" || participant.status === "checkedin";

  const handleConfirm = async () => {
    try {
      await confirmAttendance();
      toast.success("Your Knight Hacks IX seat is confirmed.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Could not confirm attendance."));
    }
  };

  const handleWithdraw = async () => {
    try {
      await withdrawAttendance();
      toast.success("Your Knight Hacks IX attendance has been withdrawn.");
    } catch (error) {
      toast.error(
        getToastErrorMessage(error, "Could not withdraw attendance."),
      );
    }
  };

  return (
    <KhixDashboardShell
      navAction={reportIssueNavAction}
      sessionUser={sessionUser}
    >
      <StatusStage
        action={
          <StatusAction
            actionPending={actionPending}
            atCapacity={atCapacity}
            confirmationClosed={confirmationClosed}
            loadQRCode={loadQRCode}
            onConfirm={handleConfirm}
            onWithdraw={handleWithdraw}
            qrAvailable={qrAvailable}
            qrCode={qrCode}
            qrErrorMessage={
              qrMutation.error
                ? getToastErrorMessage(
                    qrMutation.error,
                    "Could not load your QR code.",
                  )
                : null
            }
            qrLoading={qrMutation.isPending}
            status={participant.status}
            termsUrl={config.termsUrl}
          />
        }
        body={scene.body}
        countdown={
          <EventCountdown
            endDate={hackathon.endDate}
            showLabel={participant.status !== "accepted"}
            startDate={hackathon.startDate}
          />
        }
        headline={scene.headline}
        greeting={`Hi, ${greetingName}!`}
        statusLabel={scene.label}
        statusClassName={scene.statusClassName}
      />

      <ToolDock
        resumeMeta={
          resumeUrl ? "Open" : resumeQuery.isPending ? "Checking" : "Locked"
        }
        resumeText={
          resumeUrl
            ? "Open attached resume."
            : resumeQuery.isPending
              ? "Checking attached resume."
              : "No resume attached yet."
        }
        resumeUrl={resumeUrl}
        qrAvailable={qrAvailable}
        qrCode={qrCode}
        qrErrorMessage={
          qrMutation.error
            ? getToastErrorMessage(
                qrMutation.error,
                "Could not load your QR code.",
              )
            : null
        }
        qrLoading={qrMutation.isPending}
        loadQRCode={loadQRCode}
        hideApplications={participant.status === "checkedin"}
        supportUrl={config.copy.supportChannelUrl}
      />
    </KhixDashboardShell>
  );
}

export function KhixLore({ sessionUser }: KhixDashboardProps) {
  const { reportIssue, reportIssueMutation } = useHackerDashboardFlow();
  const [issue, setIssue] = useState("");
  const [issueOpen, setIssueOpen] = useState(false);

  const handleIssueReport = async () => {
    const trimmedIssue = issue.trim();
    if (!trimmedIssue) return;

    try {
      await reportIssue(trimmedIssue);
      setIssue("");
      setIssueOpen(false);
      toast.success("Your note was sent to the organizers.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Could not report the issue."));
    }
  };

  const reportIssueNavAction = (
    <ReportIssueNavAction
      issue={issue}
      isOpen={issueOpen}
      isPending={reportIssueMutation.isPending}
      onChange={setIssue}
      onOpenChange={setIssueOpen}
      onReport={handleIssueReport}
    />
  );

  return (
    <KhixDashboardShell
      activeItem="lore"
      navAction={reportIssueNavAction}
      sessionUser={sessionUser}
    >
      <LoreExperience />
    </KhixDashboardShell>
  );
}

export function KhixProfile({ sessionUser }: KhixDashboardProps) {
  const {
    dashboardQuery,
    participant,
    profileSchema,
    reportIssue,
    reportIssueMutation,
    updateMutation,
    updateProfile,
    uploadMutation,
    uploadResume,
  } = useHackerProfileFlow();
  const [issue, setIssue] = useState("");
  const [issueOpen, setIssueOpen] = useState(false);
  const dashboard = dashboardQuery.data;

  const handleIssueReport = async () => {
    const trimmedIssue = issue.trim();
    if (!trimmedIssue) return;

    try {
      await reportIssue(trimmedIssue);
      setIssue("");
      setIssueOpen(false);
      toast.success("Your note was sent to the organizers.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Could not report the issue."));
    }
  };

  const reportIssueNavAction = (
    <ReportIssueNavAction
      issue={issue}
      isOpen={issueOpen}
      isPending={reportIssueMutation.isPending}
      onChange={setIssue}
      onOpenChange={setIssueOpen}
      onReport={handleIssueReport}
    />
  );

  if (dashboardQuery.isPending) {
    return (
      <KhixDashboardShell
        activeItem="profile"
        navAction={reportIssueNavAction}
        sessionUser={sessionUser}
      >
        <ProfileSkeleton />
      </KhixDashboardShell>
    );
  }

  if (dashboardQuery.isError || !dashboard) {
    return (
      <KhixDashboardShell
        activeItem="profile"
        navAction={reportIssueNavAction}
        sessionUser={sessionUser}
      >
        <StatusStage
          body="Refresh the page or try again in a moment."
          headline="Could not load your profile."
          greeting="Knight Hacks IX"
        />
      </KhixDashboardShell>
    );
  }

  if (!participant) {
    const fallbackName = getDisplayName(
      sessionUser?.name ?? sessionUser?.email,
    );

    return (
      <KhixDashboardShell
        activeItem="profile"
        navAction={reportIssueNavAction}
        sessionUser={sessionUser}
      >
        <StatusStage
          action={
            <Button asChild className={styles.primaryButton}>
              <Link href="/apply">Application portal</Link>
            </Button>
          }
          body="Your profile appears here after you submit an application."
          headline="No profile yet."
          greeting={`Hi, ${fallbackName}!`}
        />
      </KhixDashboardShell>
    );
  }

  return (
    <KhixDashboardShell
      activeItem="profile"
      navAction={reportIssueNavAction}
      sessionUser={sessionUser}
    >
      <ProfileSection
        participant={participant}
        profileSchema={profileSchema}
        saving={updateMutation.isPending || uploadMutation.isPending}
        updateProfile={updateProfile}
        uploadResume={uploadResume}
      />
    </KhixDashboardShell>
  );
}

export function KhixDashboardNotFound({ sessionUser }: KhixDashboardProps) {
  const { reportIssue, reportIssueMutation } = useHackerDashboardFlow();
  const [issue, setIssue] = useState("");
  const [issueOpen, setIssueOpen] = useState(false);

  const handleIssueReport = async () => {
    const trimmedIssue = issue.trim();
    if (!trimmedIssue) return;

    try {
      await reportIssue(trimmedIssue);
      setIssue("");
      setIssueOpen(false);
      toast.success("Your note was sent to the organizers.");
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Could not report the issue."));
    }
  };

  const reportIssueNavAction = (
    <ReportIssueNavAction
      issue={issue}
      isOpen={issueOpen}
      isPending={reportIssueMutation.isPending}
      onChange={setIssue}
      onOpenChange={setIssueOpen}
      onReport={handleIssueReport}
    />
  );

  return (
    <KhixDashboardShell
      navAction={reportIssueNavAction}
      sessionUser={sessionUser}
    >
      <StatusStage
        action={
          <Button asChild className={styles.primaryButton}>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
        body="That dashboard path is not available. Head back to your status page."
        headline={"404\nPortal not found."}
        statusLabel="Not found"
        statusClassName={styles.statusPending}
      />
    </KhixDashboardShell>
  );
}

function KhixDashboardShell({
  activeItem = "status",
  children,
  navAction,
  sessionUser,
}: {
  activeItem?: "lore" | "profile" | "status";
  children: ReactNode;
  navAction?: ReactNode;
  sessionUser?: KhixSessionUser;
}) {
  const [mobileMenuState, setMobileMenuState] =
    useState<MobileDrawerState>("closed");
  const [drawerDragOffset, setDrawerDragOffset] = useState(0);
  const drawerCloseTimeoutRef = useRef<number | null>(null);
  const drawerOpenFrameRef = useRef<number | null>(null);
  const drawerSuppressClickRef = useRef(false);
  const drawerSuppressClickTimeoutRef = useRef<number | null>(null);
  const drawerGestureRef = useRef<{
    dragging: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
  } | null>(null);
  const loreHref = "/dashboard/lore";
  const statusHref = "/dashboard";
  const mobileMenuMounted = mobileMenuState !== "closed";
  const mobileMenuExpanded =
    mobileMenuState === "opening" || mobileMenuState === "open";

  const clearDrawerTimers = useCallback(() => {
    if (drawerOpenFrameRef.current !== null) {
      window.cancelAnimationFrame(drawerOpenFrameRef.current);
      drawerOpenFrameRef.current = null;
    }

    if (drawerCloseTimeoutRef.current !== null) {
      window.clearTimeout(drawerCloseTimeoutRef.current);
      drawerCloseTimeoutRef.current = null;
    }

    if (drawerSuppressClickTimeoutRef.current !== null) {
      window.clearTimeout(drawerSuppressClickTimeoutRef.current);
      drawerSuppressClickTimeoutRef.current = null;
    }
  }, []);

  const suppressNextDrawerClick = (shouldSuppress: boolean) => {
    drawerSuppressClickRef.current = shouldSuppress;

    if (drawerSuppressClickTimeoutRef.current !== null) {
      window.clearTimeout(drawerSuppressClickTimeoutRef.current);
      drawerSuppressClickTimeoutRef.current = null;
    }

    if (!shouldSuppress) return;

    drawerSuppressClickTimeoutRef.current = window.setTimeout(() => {
      drawerSuppressClickTimeoutRef.current = null;
      drawerSuppressClickRef.current = false;
    }, 0);
  };

  const openMobileMenu = useCallback(() => {
    clearDrawerTimers();
    drawerGestureRef.current = null;
    drawerSuppressClickRef.current = false;
    setDrawerDragOffset(0);
    setMobileMenuState("opening");

    drawerOpenFrameRef.current = window.requestAnimationFrame(() => {
      drawerOpenFrameRef.current = window.requestAnimationFrame(() => {
        drawerOpenFrameRef.current = null;
        setMobileMenuState("open");
      });
    });
  }, [clearDrawerTimers]);

  const closeMobileMenu = useCallback(() => {
    clearDrawerTimers();
    drawerGestureRef.current = null;
    drawerSuppressClickRef.current = false;
    setDrawerDragOffset(0);
    setMobileMenuState((state) => (state === "closed" ? "closed" : "closing"));

    drawerCloseTimeoutRef.current = window.setTimeout(() => {
      drawerCloseTimeoutRef.current = null;
      setMobileMenuState("closed");
    }, MOBILE_DRAWER_TRANSITION_MS);
  }, [clearDrawerTimers]);

  useEffect(() => {
    return clearDrawerTimers;
  }, [clearDrawerTimers]);

  useEffect(() => {
    if (!mobileMenuMounted) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;

      closeMobileMenu();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMobileMenu, mobileMenuMounted]);

  const releaseDrawerPointerCapture = (
    element: HTMLDivElement,
    pointerId: number,
  ) => {
    try {
      if (element.hasPointerCapture(pointerId)) {
        element.releasePointerCapture(pointerId);
      }
    } catch {
      // The browser may already release capture after pointercancel/lostpointercapture.
    }
  };

  const handleDrawerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (mobileMenuState !== "open" || !event.isPrimary) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    drawerGestureRef.current = {
      dragging: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
    };
  };

  const handleDrawerPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = drawerGestureRef.current;
    if (gesture?.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    if (!gesture.dragging) {
      const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY);
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 8) return;

      if (!horizontalIntent) {
        drawerGestureRef.current = null;
        releaseDrawerPointerCapture(event.currentTarget, event.pointerId);
        return;
      }

      gesture.dragging = true;

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        drawerGestureRef.current = null;
        return;
      }
    }

    gesture.x = event.clientX;
    drawerSuppressClickRef.current = true;
    event.preventDefault();

    const drawerWidth = event.currentTarget.getBoundingClientRect().width;
    setDrawerDragOffset(Math.max(Math.min(deltaX, 0), -drawerWidth));
  };

  const handleDrawerPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = drawerGestureRef.current;
    if (gesture?.pointerId !== event.pointerId) return;

    releaseDrawerPointerCapture(event.currentTarget, event.pointerId);

    const drawerWidth = event.currentTarget.getBoundingClientRect().width;
    const dragDistance = Math.min(gesture.x - gesture.startX, 0);
    const shouldClose =
      Math.abs(dragDistance) > Math.min(drawerWidth * 0.32, 128);

    drawerGestureRef.current = null;
    setDrawerDragOffset(0);

    if (shouldClose) {
      closeMobileMenu();
    }

    suppressNextDrawerClick(gesture.dragging);
  };

  const drawerStyle = {
    "--khix-mobile-drawer-drag-x": `${drawerDragOffset}px`,
  } as CSSProperties;

  return (
    <main
      className={joinClasses(
        styles.dashboard,
        activeItem === "status" && styles.statusDashboard,
      )}
    >
      <a href="#khix-dashboard-main" className={styles.skipLink}>
        Skip to dashboard
      </a>
      <div className={styles.chrome}>
        <aside className={styles.portalNav} aria-label="Dashboard navigation">
          <div className={styles.mobileTopBar}>
            <Link href="/" className={styles.mobileLogoLink}>
              <Image
                src="/khlogo.svg"
                alt="Knight Hacks IX"
                width={118}
                height={48}
                className={styles.railLogo}
                priority
              />
            </Link>
            <button
              type="button"
              className={styles.mobileMenuButton}
              aria-controls="khix-dashboard-drawer"
              aria-expanded={mobileMenuExpanded}
              aria-label="Open dashboard menu"
              onClick={openMobileMenu}
            >
              <Menu className="size-5" />
            </button>
          </div>
          {mobileMenuMounted ? (
            <button
              type="button"
              className={styles.mobileDrawerScrim}
              data-mobile-menu={mobileMenuState}
              aria-label="Close dashboard menu"
              onClick={closeMobileMenu}
            />
          ) : null}
          <div
            id="khix-dashboard-drawer"
            className={styles.portalNavInner}
            data-mobile-dragging={drawerDragOffset !== 0 ? "true" : undefined}
            data-mobile-menu={mobileMenuState}
            onPointerCancel={handleDrawerPointerEnd}
            onClickCapture={(event) => {
              if (!drawerSuppressClickRef.current) return;

              drawerSuppressClickRef.current = false;
              event.preventDefault();
              event.stopPropagation();
            }}
            onPointerDown={handleDrawerPointerDown}
            onPointerMove={handleDrawerPointerMove}
            onPointerUp={handleDrawerPointerEnd}
            style={drawerStyle}
          >
            <div className={styles.railBrand}>
              <Link
                href="/"
                className={styles.railLogoLink}
                onClick={closeMobileMenu}
              >
                <Image
                  src="/khlogo.svg"
                  alt="Knight Hacks IX"
                  width={118}
                  height={48}
                  className={styles.railLogo}
                  priority
                />
              </Link>
              <button
                type="button"
                className={styles.mobileMenuButton}
                aria-controls="khix-dashboard-drawer"
                aria-expanded={mobileMenuExpanded}
                aria-label="Close dashboard menu"
                onClick={closeMobileMenu}
              >
                <X className="size-5" />
              </button>
            </div>

            <nav id="khix-dashboard-nav" className={styles.railNav}>
              <Link
                className={joinClasses(
                  styles.railLink,
                  activeItem === "status" && styles.railLinkActive,
                )}
                href={statusHref}
                onClick={closeMobileMenu}
              >
                <span className={styles.railIcon} aria-hidden="true">
                  <ScrollText className="size-4" />
                </span>
                <span className={styles.railLinkText}>
                  <span className={styles.railLinkLabel}>Dashboard</span>
                </span>
              </Link>
              <Link
                className={joinClasses(
                  styles.railLink,
                  activeItem === "lore" && styles.railLinkActive,
                )}
                href={loreHref}
                onClick={closeMobileMenu}
              >
                <span className={styles.railIcon} aria-hidden="true">
                  <BookOpen className="size-4" />
                </span>
                <span className={styles.railLinkText}>
                  <span className={styles.railLinkLabel}>Lore</span>
                </span>
              </Link>
              <button
                type="button"
                className={joinClasses(
                  styles.railLink,
                  styles.railButton,
                  styles.railLinkLocked,
                )}
                aria-label="Events page locked"
                disabled
              >
                <span className={styles.railIcon} aria-hidden="true">
                  <CalendarDays className="size-4" />
                </span>
                <span className={styles.railLinkText}>
                  <span className={styles.railLockedLabel}>
                    <span className={styles.railLinkLabel}>Events</span>
                    <LockKeyhole className={styles.railLockIcon} />
                  </span>
                </span>
              </button>
              <button
                type="button"
                className={joinClasses(
                  styles.railLink,
                  styles.railButton,
                  styles.railLinkLocked,
                )}
                aria-label="3D printing page locked"
                disabled
              >
                <span className={styles.railIcon} aria-hidden="true">
                  <Printer className="size-4" />
                </span>
                <span className={styles.railLinkText}>
                  <span className={styles.railLockedLabel}>
                    <span className={styles.railLinkLabel}>3D Printing</span>
                    <LockKeyhole className={styles.railLockIcon} />
                  </span>
                </span>
              </button>
              <Link
                className={joinClasses(
                  styles.railLink,
                  activeItem === "profile" && styles.railLinkActive,
                )}
                href="/dashboard/profile"
                onClick={closeMobileMenu}
              >
                <span className={styles.railIcon} aria-hidden="true">
                  <UserRound className="size-4" />
                </span>
                <span className={styles.railLinkText}>
                  <span className={styles.railLinkLabel}>Profile</span>
                </span>
              </Link>
              {navAction}
            </nav>

            <div className={styles.navFooter}>
              {sessionUser ? <SignedInNavCard user={sessionUser} /> : null}
              <Link
                href="/"
                className={styles.siteReturnLink}
                onClick={closeMobileMenu}
              >
                <span className={styles.railIcon} aria-hidden="true">
                  <Home className="size-4" />
                </span>
                <span>Return to site</span>
              </Link>
              <button
                type="button"
                className={styles.logoutButton}
                onClick={() => void signOut({ redirectTo: "/" })}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Log out
              </button>
            </div>
          </div>
        </aside>

        <div
          id="khix-dashboard-main"
          className={joinClasses(
            styles.main,
            activeItem === "status" && styles.statusMain,
            activeItem === "lore" && styles.loreMain,
            activeItem === "profile" && styles.profileMain,
          )}
          tabIndex={-1}
        >
          <span className={styles.portalMagic} aria-hidden="true">
            <span className={styles.portalCanopyGlow} />
            <span className={styles.portalFireflies}>
              {PORTAL_FIREFLY_IDS.map((fireflyId) => (
                <span
                  key={fireflyId}
                  className={styles.portalFirefly}
                  data-firefly={fireflyId}
                />
              ))}
            </span>
            <span className={styles.portalWisp} data-wisp="one" />
            <span className={styles.portalWisp} data-wisp="two" />
            <span className={styles.portalWisp} data-wisp="three" />
            <span className={styles.portalWisp} data-wisp="four" />
            <span className={styles.portalWisp} data-wisp="five" />
            <span className={styles.portalWisp} data-wisp="six" />
            <span className={styles.portalWisp} data-wisp="seven" />
            <span className={styles.portalWisp} data-wisp="eight" />
          </span>
          {children}
        </div>
      </div>
    </main>
  );
}

function SignedInNavCard({ user }: { user: KhixSessionUser }) {
  const avatarSrc = getDiscordAvatarUrl(user);
  const displayName = getSessionUserDisplayName(user);
  const detail = getSessionUserDetail(user);

  return (
    <div className={styles.navUserCard} title={`${displayName} ${detail}`}>
      <Avatar className={styles.navUserAvatar}>
        {avatarSrc ? (
          <AvatarImage
            src={avatarSrc}
            alt=""
            className={styles.navUserAvatarImage}
          />
        ) : null}
        <AvatarFallback className={styles.navUserAvatarFallback}>
          {getSessionUserInitials(user)}
        </AvatarFallback>
      </Avatar>
      <span className={styles.navUserText}>
        <span className={styles.navUserName}>{displayName}</span>
        <span className={styles.navUserDetail}>{detail}</span>
      </span>
    </div>
  );
}

function ReportIssueNavAction({
  issue,
  isOpen,
  isPending,
  onChange,
  onOpenChange,
  onReport,
}: {
  issue: string;
  isOpen: boolean;
  isPending: boolean;
  onChange: (issue: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  onReport: () => Promise<void>;
}) {
  return (
    <IssueDialog
      issue={issue}
      isOpen={isOpen}
      isPending={isPending}
      onChange={onChange}
      onOpenChange={onOpenChange}
      onReport={onReport}
      trigger={
        <button
          type="button"
          className={joinClasses(styles.railLink, styles.railButton)}
        >
          <span className={styles.railIcon} aria-hidden="true">
            <AlertCircle className="size-4" />
          </span>
          <span className={styles.railLinkText}>
            <span className={styles.railLinkLabel}>Report issue</span>
          </span>
        </button>
      }
    />
  );
}

// Final asset slot: add an optional poster image here when KHIX key art is ready.
const KHIX_LORE_FILM_EMBED_URL =
  "https://www.youtube.com/embed/OzW_4QeCfM0?rel=0&modestbranding=1";
const KHIX_LORE_FILM_POSTER_IMAGE = "";

const LORE_ARTISTS = {
  amira: {
    href: "https://www.linkedin.com/in/amirabhuiyan/",
    name: "Amira",
  },
  christina: {
    href: "https://www.linkedin.com/in/christina-nguyen-53971a326/",
    name: "Christina",
  },
  chrissy: {
    href: "https://www.linkedin.com/in/christina-nguyen-53971a326/",
    name: "Chrissy",
  },
  david: {
    href: "https://www.linkedin.com/in/david-navarrete-/",
    name: "David",
  },
  gabriela: {
    href: "https://www.linkedin.com/in/gabriela-zambrano-7074363b4/",
    name: "Gabriela",
  },
  lena: {
    href: "https://www.linkedin.com/in/lena-tran-/",
    name: "Lena",
  },
} as const;

interface LoreCredit {
  href: string;
  name: string;
  prefix: string;
}

const LORE_PROCESS_IMAGES = [
  {
    alt: "Concept sheet for Hat Lenny with flower, wing, color, and shape notes.",
    copy: "After Knight Hacks VIII, Lenny is free from the gem, but freedom does not erase what happened. Lena's sheet explores what changed through the flower, wings, shapes, and colors while keeping Lenny soft and familiar.",
    credit: { ...LORE_ARTISTS.lena, prefix: "Made by" },
    src: "/assets/lore/hat-lenny-reference.webp",
    title: "Lenny After the Gem",
  },
  {
    alt: "Pink sketch of Lenny standing among mushrooms and small flowers.",
    copy: "Gabriela's sketch catches one of the first searches for the enchanted forest. Mushrooms, flowers, odd shapes, and magic all had to find the right balance between inviting and uneasy.",
    credit: { ...LORE_ARTISTS.gabriela, prefix: "Made by" },
    src: "/assets/lore/lenny-sketch-garden.webp",
    title: "The First Glimpse Beyond the Treeline",
  },
  {
    alt: "Animation workspace showing Lenny drawn over a forest background.",
    copy: "The animation passes turned a still forest into a place with timing, breath, and pressure. Small changes in spacing, hold time, and background motion decided how watchful the scene felt.",
    credit: { ...LORE_ARTISTS.chrissy, prefix: "Made by" },
    src: "/assets/lore/animation-process.webp",
    title: "When the Forest is Magical",
  },
  {
    alt: "Sketch of a dark forest corruption creature holding a glowing figure.",
    copy: "The corruption needed to feel connected to the gem's aftermath. These sketches helped define magic that kept growing after its purpose broke: beautiful, wrong, and still awake under the roots.",
    credit: { ...LORE_ARTISTS.lena, prefix: "Made by" },
    src: "/assets/lore/corruption-concept.webp",
    title: "What the Gem Left Behind",
  },
  {
    alt: "T.K. reference sheet with armor, helmet, sword, and energy details.",
    copy: "T.K.'s disappearance gives the forest a reason to be explored. The armor, helmet, sword, and energy details show that he is capable, but the enchanted forest is strong enough to pull him out of reach.",
    credit: { ...LORE_ARTISTS.david, prefix: "Made by" },
    src: "/assets/lore/tk-reference.webp",
    title: "T.K.'s Trail Ends in the Forest",
  },
  {
    alt: "Finished illustration of Lenny smiling next to T.K.",
    copy: "This piece brings the mascots together so the theme reads at a glance. Lenny is changed, T.K. is tied to the mystery, and the forest around them is still holding something back.",
    credit: { ...LORE_ARTISTS.lena, prefix: "Made by" },
    src: "/assets/lore/lenny-tk-final.webp",
    title: "Before the Forest Closes In",
  },
];

function LoreMediaCredit({ credit }: { credit: LoreCredit }) {
  return (
    <a
      className={styles.loreMediaCredit}
      href={credit.href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${credit.prefix} ${credit.name} on LinkedIn`}
    >
      <span>{credit.prefix}</span>
      {credit.name}
    </a>
  );
}

function LoreExperience() {
  const hasFilm = KHIX_LORE_FILM_EMBED_URL.trim().length > 0;
  const hasPoster = KHIX_LORE_FILM_POSTER_IMAGE.trim().length > 0;

  return (
    <section
      className={styles.loreExperience}
      aria-labelledby="khix-lore-title"
    >
      <div className={styles.loreHero}>
        <h1 id="khix-lore-title" className={styles.loreTitle}>
          Knight Hacks IX: Into the Forest
        </h1>
        <p className={styles.loreIntroCopy}>
          When the gem shattered at the end of Knight Hacks VIII, Lenny was free
          from its control and the city was no longer trapped beneath its glow.
          The broken pieces sank into the soil. Roots wrapped around them.
          Flowers grew where the corruption should have died. From that place,
          the forest began to grow.
        </p>
      </div>

      <figure className={styles.loreFilmStage} id="khix-lore-film">
        {hasPoster ? (
          <Image
            src={KHIX_LORE_FILM_POSTER_IMAGE}
            alt=""
            fill
            className={styles.loreFilmPoster}
            priority
            sizes="(max-width: 700px) 100vw, 80vw"
          />
        ) : null}
        {hasFilm ? (
          <iframe
            className={styles.loreFilmEmbed}
            src={KHIX_LORE_FILM_EMBED_URL}
            title="Knight Hacks IX story film"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className={styles.loreFilmPlaceholder}>
            <span className={styles.lorePlayMark} aria-hidden="true">
              <Play className="size-8" fill="currentColor" />
            </span>
            <span className={styles.loreFilmSignal}>Story film</span>
            <span className={styles.loreFilmPlaceholderTitle}>
              The forest is waiting for its voice.
            </span>
          </div>
        )}
      </figure>

      <section
        className={styles.loreProcessIntro}
        aria-labelledby="khix-lore-work-title"
      >
        <Image
          src="/assets/lore/tiny-lenny-sketch.webp"
          alt="Tiny sketch of Lenny sitting with small wings."
          width={84}
          height={84}
          className={styles.loreTinySketch}
        />
        <p className={styles.loreChapter}>Inside the art book</p>
        <h2 id="khix-lore-work-title">Pages of the Forest</h2>
        <p>
          This page is a look inside the worldbuilding behind Knight Hacks IX:
          sketches, meetings, rejected directions, character sheets, logo tests,
          animation passes, site ideas, and weekly decisions. The theme started
          as a feeling, then became a stack of smaller choices about what the
          forest should look like, how Lenny should change, where T.K. went, and
          what kind of world grows from damaged magic.
        </p>
      </section>

      <section className={styles.loreChapterSpread}>
        <div className={styles.loreChapterCopy}>
          <p className={styles.loreChapter}>1 year ago</p>
          <h2>The corruption took root.</h2>
          <p>
            After Knight Hacks VIII, the team wanted Knight Hacks IX to grow
            from the story that came before it. The gem did not vanish when it
            shattered. Its fragments became seeds beneath the ruins. Grass
            pushed through stone, vines climbed over the old damage, and trees
            grew too fast around the places where the gem fell. Lenny has been
            seen near the treeline. T.K. is missing. Something left behind by
            the gem is still awake deeper in the enchanted forest.
          </p>
        </div>
        <figure className={styles.loreGifFrame}>
          <Image
            src="/assets/lore/scene-5.gif"
            alt="Animated forest scene from the Knight Hacks IX lore film."
            fill
            sizes="(max-width: 700px) 100vw, 48vw"
            unoptimized
          />
          <LoreMediaCredit
            credit={{ ...LORE_ARTISTS.christina, prefix: "Made by" }}
          />
        </figure>
      </section>

      <section className={styles.loreProcessSection} aria-label="Lore process">
        <div className={styles.lorePictureTrail}>
          {LORE_PROCESS_IMAGES.map((image, index) => (
            <figure
              key={image.src}
              className={joinClasses(
                styles.lorePictureBeat,
                index % 2 === 1 && styles.lorePictureBeatReverse,
              )}
            >
              <div className={styles.lorePictureMedia}>
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 700px) 100vw, 48vw"
                />
                <LoreMediaCredit credit={image.credit} />
              </div>
              <figcaption className={styles.lorePictureCaption}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{image.title}</h3>
                <p>{image.copy}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.loreMerchMoment}>
        <figure className={styles.loreMerchImage}>
          <Image
            src="/assets/lore/merch-shirt.webp"
            alt="Knight Hacks shirt mockup with Knight Hacks IX artwork and green logo."
            fill
            sizes="(max-width: 700px) 100vw, 62vw"
          />
          <LoreMediaCredit
            credit={{
              ...LORE_ARTISTS.amira,
              prefix: "Shirt render and logo made by",
            }}
          />
        </figure>
        <div className={styles.loreMerchCopy}>
          <p className={styles.loreChapter}>The Knight Hacks IX mark</p>
          <h2>The Mark of the Forest</h2>
          <p>
            The Knight Hacks IX logo had to work outside the website. It needed
            to hold up on merch, social graphics, slides, signs, and the places
            where the theme has to be recognized quickly. The shirt render shows
            whether the mark still feels sharp when it leaves the design file.
          </p>
        </div>
      </section>

      <section
        className={styles.loreTeamThanks}
        aria-labelledby="khix-lore-team-title"
      >
        <div className={styles.loreTeamPhotos}>
          <figure>
            <Image
              src="/assets/lore/team-full.webp"
              alt="Knight Hacks organizers gathered by the lake."
              fill
              sizes="(max-width: 700px) 100vw, 42vw"
            />
          </figure>
          <figure>
            <Image
              src="/assets/lore/team-organizers.webp"
              alt="Knight Hacks design team gathered by the lake."
              fill
              sizes="(max-width: 700px) 100vw, 42vw"
            />
          </figure>
        </div>
        <div className={styles.loreTeamCopy}>
          <p className={joinClasses(styles.loreChapter, styles.loreTeamKicker)}>
            <span>For the people behind Knight Hacks IX</span>
            <span className={styles.loreHeart} aria-hidden="true" />
          </p>
          <h2 id="khix-lore-team-title">To My Team</h2>
          <p>
            Thank you for making this event and continuing to shape it into the
            hackathon you wanted people to experience, especially the hackers
            walking into their first one. This has been many months of planning,
            checking, adjusting, and caring about details most people will never
            see. Because of that work, hundreds of people will get the chance to
            grow as builders, teammates, and leaders.
          </p>
          <p>
            You are giving your time so students at the University of Central
            Florida and across the nation can find opportunities, build
            confidence, and become stronger software engineers and people.
            Knight Hacks IX exists because you kept showing up for the version
            of the event you knew it could become.
          </p>
          <p>
            And to the design team: thank you for bringing our event to life.
            Knight Hacks has always cared about being an experience before it is
            an event, and you made that true this year. Every canvas, sketch,
            logo pass, motion test, shirt render, color choice, and visual
            experiment shows the care and passion you bring to the work.
          </p>
          <p>
            You turn ideas into something people can see, feel, wear, and
            remember. You also show how art, design, and storytelling belong
            inside software engineering and the careers people build from it. We
            are nothing without you as a team, and every part of Knight Hacks IX
            is stronger because of what you made.
          </p>
          <p>
            And to every other team that contributed: thank you for carrying
            your piece of this event with so much care. Outreach, sponsorship,
            workshops, development, operations, mentors, volunteers, and
            everyone who jumped in helped make Knight Hacks IX real. I love
            y'all, and this event is better because all of you chose to build it
            together.
          </p>
          <p className={styles.loreSignature}>- Adrian Osorio President</p>
        </div>
      </section>
    </section>
  );
}

type HackerProfileFlow = ReturnType<typeof useHackerProfileFlow>;

function getProfileFormDefaults(
  participant: PortalParticipant,
): Partial<HackerProfileFormValues> {
  return {
    firstName: participant.firstName,
    lastName: participant.lastName,
    gender: participant.gender,
    raceOrEthnicity: participant.raceOrEthnicity,
    email: participant.email,
    phoneNumber: participant.phoneNumber || "",
    country: participant.country,
    school: participant.school,
    major: participant.major,
    levelOfStudy: participant.levelOfStudy,
    shirtSize: participant.shirtSize,
    githubProfileUrl: participant.githubProfileUrl ?? "",
    linkedinProfileUrl: participant.linkedinProfileUrl ?? "",
    websiteUrl: participant.websiteUrl ?? "",
    resumeUrl: participant.resumeUrl ?? "",
    dob: getDateInputValue(participant.dob),
    gradDate: getDateInputValue(participant.gradDate),
    survey1: participant.survey1,
    survey2: participant.survey2,
    isFirstTime: participant.isFirstTime ?? false,
    foodAllergies: participant.foodAllergies ?? "",
    agreesToReceiveEmailsFromMLH:
      participant.agreesToReceiveEmailsFromMLH ?? false,
    agreesToMLHCodeOfConduct: participant.agreesToMLHCodeOfConduct ?? false,
    agreesToMLHDataSharing: participant.agreesToMLHDataSharing ?? false,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read the selected file."));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ProfileSection({
  participant,
  profileSchema,
  saving,
  updateProfile,
  uploadResume,
}: {
  participant: PortalParticipant;
  profileSchema: HackerProfileFlow["profileSchema"];
  saving: boolean;
  updateProfile: HackerProfileFlow["updateProfile"];
  uploadResume: HackerProfileFlow["uploadResume"];
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(() =>
    getAllergies(participant.foodAllergies),
  );
  const allergiesRef = useRef<string[]>(selectedAllergies);
  const form = useForm<HackerProfileFormValues>({
    schema: profileSchema,
    defaultValues: getProfileFormDefaults(participant),
  });
  const fileRef = form.register("resumeUpload");
  const disabled = isSaving || saving;
  const profileName =
    [participant.firstName, participant.lastName]
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => getDisplayName(name))
      .join(" ") || "Knight Hacks hacker";
  const profileNameSizeClass =
    profileName.length > 28
      ? styles.profileSummaryNameDense
      : profileName.length > 18
        ? styles.profileSummaryNameLong
        : undefined;
  const profileFacts = [
    { label: "School", value: participant.school },
    { label: "Major", value: participant.major },
    { label: "Graduation", value: getProfileDateLabel(participant.gradDate) },
    { label: "Shirt", value: participant.shirtSize },
    {
      label: "Resume",
      value: participant.resumeUrl ? "Attached" : "Not attached",
    },
  ];

  useEffect(() => {
    form.reset(getProfileFormDefaults(participant));

    const allergies = getAllergies(participant.foodAllergies);
    setSelectedAllergies(allergies);
    allergiesRef.current = allergies;
  }, [form, participant]);

  const updateAllergies = (
    allergy: string,
    onChange: (allergies: string) => void,
  ) => {
    const nextAllergies = allergiesRef.current.includes(allergy)
      ? allergiesRef.current.filter((item) => item !== allergy)
      : [...allergiesRef.current, allergy];

    allergiesRef.current = nextAllergies;
    setSelectedAllergies(nextAllergies);
    onChange(nextAllergies.join(","));
  };

  return (
    <section
      id="profile-details"
      className={styles.profileSection}
      aria-labelledby="khix-profile-title"
    >
      <Form {...form}>
        <form
          className={styles.profileForm}
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            setIsSaving(true);
            try {
              let resumeUrl = values.resumeUrl ?? participant.resumeUrl ?? "";
              if (values.resumeUpload?.length && values.resumeUpload[0]) {
                const file = values.resumeUpload[0];
                const base64File = await fileToBase64(file);
                resumeUrl = await uploadResume(file.name, base64File);
              }

              await updateProfile({
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                dob: values.dob,
                phoneNumber: values.phoneNumber,
                country: values.country,
                school: values.school,
                major: values.major,
                levelOfStudy: values.levelOfStudy,
                gender: values.gender ?? "Prefer not to answer",
                gradDate: values.gradDate,
                raceOrEthnicity:
                  values.raceOrEthnicity ?? "Prefer not to answer",
                shirtSize: values.shirtSize,
                githubProfileUrl: values.githubProfileUrl,
                linkedinProfileUrl: values.linkedinProfileUrl,
                websiteUrl: values.websiteUrl,
                isFirstTime: values.isFirstTime,
                agreesToReceiveEmailsFromMLH:
                  values.agreesToReceiveEmailsFromMLH,
                agreesToMLHCodeOfConduct: values.agreesToMLHCodeOfConduct,
                agreesToMLHDataSharing: values.agreesToMLHDataSharing,
                survey1: values.survey1,
                survey2: values.survey2,
                foodAllergies: values.foodAllergies,
                resumeUrl,
              });
              toast.success("Your Knight Hacks IX profile was updated.");
            } catch (error) {
              toast.error(
                getToastErrorMessage(
                  error,
                  "Could not save your profile changes. If you attached a resume, make sure it is a PDF under 5MB.",
                ),
              );
            } finally {
              setIsSaving(false);
            }
          })}
        >
          <div className={styles.profileFormShell}>
            <aside className={styles.profileSummaryCard}>
              <div className={styles.profileSummaryHeader}>
                <h1
                  id="khix-profile-title"
                  className={joinClasses(
                    styles.profileSummaryName,
                    profileNameSizeClass,
                  )}
                >
                  {profileName}
                </h1>
              </div>
              <dl className={styles.profileSummaryList}>
                {profileFacts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </aside>

            <div className={styles.profileEditor}>
              <div className={styles.profileActions}>
                <Button
                  className={joinClasses(
                    styles.primaryButton,
                    styles.profileSubmitButton,
                  )}
                  disabled={disabled}
                  type="submit"
                >
                  {disabled ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {disabled ? "Saving changes" : "Save profile changes"}
                </Button>
              </div>

              <div className={styles.profileFormContent}>
                <ProfileFormBlock
                  copy="Your name and best contact details."
                  title="Basics"
                >
                  <div className={styles.profileFormGrid}>
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            First Name <RequiredMark />
                          </FormLabel>
                          <FormControl>
                            <Input
                              className={styles.profileInput}
                              placeholder="Lenny"
                              type="text"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            Last Name <RequiredMark />
                          </FormLabel>
                          <FormControl>
                            <Input
                              className={styles.profileInput}
                              placeholder="Dragonson"
                              type="text"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            Email <RequiredMark />
                          </FormLabel>
                          <FormControl>
                            <Input
                              className={styles.profileInput}
                              placeholder="tk@knighthacks.org"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            Phone Number <OptionalNote />
                          </FormLabel>
                          <FormControl>
                            <Input
                              className={styles.profileInput}
                              placeholder="123-456-7890"
                              type="tel"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            Date of Birth <RequiredMark />
                          </FormLabel>
                          <FormControl>
                            <Input
                              className={styles.profileInput}
                              type="date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                  </div>
                </ProfileFormBlock>

                <ProfileFormBlock
                  copy="Demographic information helps us understand who Knight Hacks IX serves."
                  title="About you"
                >
                  <div className={styles.profileFormGrid}>
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            Gender <OptionalNote />
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger
                                className={styles.profileSelectTrigger}
                              >
                                <SelectValue placeholder="Select your gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent
                              className={styles.profileSelectContent}
                            >
                              {FORMS.GENDERS.map((gender) => (
                                <SelectItem key={gender} value={gender}>
                                  {gender}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="raceOrEthnicity"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            Race or Ethnicity <OptionalNote />
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger
                                className={styles.profileSelectTrigger}
                              >
                                <SelectValue placeholder="Select your race or ethnicity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent
                              className={styles.profileSelectContent}
                            >
                              {FORMS.RACES_OR_ETHNICITIES.map((race) => (
                                <SelectItem key={race} value={race}>
                                  {race}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="shirtSize"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            Shirt Size <RequiredMark />
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger
                                className={styles.profileSelectTrigger}
                              >
                                <SelectValue placeholder="Select your shirt size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent
                              className={styles.profileSelectContent}
                            >
                              {FORMS.SHIRT_SIZES.map((size) => (
                                <SelectItem key={size} value={size}>
                                  {size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                  </div>
                </ProfileFormBlock>

                <ProfileFormBlock
                  copy="Your school, program, and expected graduation."
                  title="Academic information"
                >
                  <div className={styles.profileFormGrid}>
                    <FormField
                      control={form.control}
                      name="levelOfStudy"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            Level of Study <RequiredMark />
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger
                                className={styles.profileSelectTrigger}
                              >
                                <SelectValue placeholder="Select your level of study" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent
                              className={styles.profileSelectContent}
                            >
                              {FORMS.LEVELS_OF_STUDY.map((level) => (
                                <SelectItem key={level} value={level}>
                                  {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="school"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            School <RequiredMark />
                          </FormLabel>
                          <FormControl>
                            <ResponsiveComboBox
                              items={FORMS.SCHOOLS}
                              renderItem={(school) => <div>{school}</div>}
                              getItemValue={(school) => school}
                              getItemLabel={(school) => school}
                              onItemSelect={(school) => field.onChange(school)}
                              buttonPlaceholder={field.value}
                              inputPlaceholder="Search for your school"
                              triggerClassName={styles.profileComboboxTrigger}
                            />
                          </FormControl>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="major"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            Major of Study <RequiredMark />
                          </FormLabel>
                          <FormControl>
                            <ResponsiveComboBox
                              items={FORMS.MAJORS}
                              renderItem={(major) => <div>{major}</div>}
                              getItemValue={(major) => major}
                              getItemLabel={(major) => major}
                              onItemSelect={(major) => field.onChange(major)}
                              buttonPlaceholder={field.value}
                              inputPlaceholder="Search for your major"
                              triggerClassName={styles.profileComboboxTrigger}
                            />
                          </FormControl>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gradDate"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            Graduation Date <RequiredMark />
                          </FormLabel>
                          <FormControl>
                            <Input
                              className={styles.profileInput}
                              type="date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                  </div>
                </ProfileFormBlock>

                <ProfileFormBlock
                  copy="Tell the organizer team what you want from the event."
                  title="Hackathon survey"
                >
                  <div className={styles.profileFormGrid}>
                    <FormField
                      control={form.control}
                      name="survey1"
                      render={({ field }) => (
                        <FormItem
                          className={joinClasses(
                            styles.profileFormField,
                            styles.profileFormWide,
                          )}
                        >
                          <FormLabel className={styles.profileFormLabel}>
                            Why do you want to attend Knight Hacks IX?{" "}
                            <RequiredMark />
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              className={styles.profileTextarea}
                              placeholder="Why do you want to attend Knight Hacks IX?"
                              {...field}
                              value={field.value}
                            />
                          </FormControl>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="survey2"
                      render={({ field }) => (
                        <FormItem
                          className={joinClasses(
                            styles.profileFormField,
                            styles.profileFormWide,
                          )}
                        >
                          <FormLabel className={styles.profileFormLabel}>
                            What do you hope to achieve at Knight Hacks IX?{" "}
                            <RequiredMark />
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              className={styles.profileTextarea}
                              placeholder="What are your goals at this hackathon?"
                              {...field}
                              value={field.value}
                            />
                          </FormControl>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                  </div>
                </ProfileFormBlock>

                <ProfileFormBlock
                  copy="Share your work, resume, and dietary requirements."
                  title="Links and logistics"
                >
                  <div className={styles.profileFormGrid}>
                    <FormField
                      control={form.control}
                      name="githubProfileUrl"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            GitHub Profile <OptionalNote />
                          </FormLabel>
                          <FormControl>
                            <Input
                              className={styles.profileInput}
                              placeholder="https://github.com/knighthacks"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="linkedinProfileUrl"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            LinkedIn Profile <OptionalNote />
                          </FormLabel>
                          <FormControl>
                            <Input
                              className={styles.profileInput}
                              placeholder="https://www.linkedin.com/company/knight-hacks"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="websiteUrl"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            Personal Website <OptionalNote />
                          </FormLabel>
                          <FormControl>
                            <Input
                              className={styles.profileInput}
                              placeholder="https://knighthacks.org"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="resumeUpload"
                      render={({ field }) => (
                        <FormItem className={styles.profileFormField}>
                          <FormLabel className={styles.profileFormLabel}>
                            Resume <OptionalNote />
                          </FormLabel>
                          <FormControl>
                            <Input
                              accept="application/pdf,.pdf"
                              className={styles.profileInput}
                              type="file"
                              {...fileRef}
                              onChange={(event) => {
                                field.onChange(
                                  event.target.files?.[0]
                                    ? event.target.files
                                    : undefined,
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="foodAllergies"
                      render={({ field }) => (
                        <FormItem
                          className={joinClasses(
                            styles.profileFormField,
                            styles.profileFormWide,
                          )}
                        >
                          <FormLabel className={styles.profileFormLabel}>
                            Food Allergies/Restrictions <OptionalNote />
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                className={styles.profileAllergyTrigger}
                                type="button"
                                variant="outline"
                              >
                                <span className={styles.profileAllergyLead}>
                                  Select allergies
                                </span>
                                <span className={styles.profileAllergyBadges}>
                                  {selectedAllergies.length > 0 ? (
                                    selectedAllergies.map((allergy) => (
                                      <Badge
                                        key={allergy}
                                        className={styles.profileAllergyBadge}
                                        variant="secondary"
                                      >
                                        {allergy}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span
                                      className={styles.profileAllergyEmpty}
                                    >
                                      None selected
                                    </span>
                                  )}
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              className={styles.profilePopoverContent}
                            >
                              <div className={styles.profileAllergyList}>
                                {FORMS.ALLERGIES.map((allergy) => (
                                  <button
                                    key={allergy}
                                    className={styles.profileAllergyOption}
                                    onClick={() =>
                                      updateAllergies(allergy, field.onChange)
                                    }
                                    type="button"
                                  >
                                    <Checkbox
                                      checked={selectedAllergies.includes(
                                        allergy,
                                      )}
                                      className={styles.profileCheckbox}
                                    />
                                    <span>{allergy}</span>
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <FormMessage className={styles.profileFormMessage} />
                        </FormItem>
                      )}
                    />
                  </div>
                </ProfileFormBlock>

                <ProfileFormBlock
                  copy="Confirm your event details and required MLH agreements."
                  title="Agreements"
                >
                  <div className={styles.profileConsentList}>
                    <FormField
                      control={form.control}
                      name="isFirstTime"
                      render={({ field }) => (
                        <FormItem className={styles.profileConsent}>
                          <FormControl>
                            <Checkbox
                              checked={!!field.value}
                              className={styles.profileCheckbox}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className={styles.profileConsentCopy}>
                            <FormLabel className={styles.profileFormLabel}>
                              This is my first time participating in a hackathon
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="agreesToMLHCodeOfConduct"
                      render={({ field }) => (
                        <FormItem className={styles.profileConsent}>
                          <FormControl>
                            <Checkbox
                              checked={!!field.value}
                              className={styles.profileCheckbox}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className={styles.profileConsentCopy}>
                            <FormLabel className={styles.profileFormLabel}>
                              I have read and agree to the{" "}
                              <Link
                                className={styles.profileInlineLink}
                                href="https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                MLH Code of Conduct
                              </Link>
                              . <RequiredMark />
                            </FormLabel>
                            <FormMessage
                              className={styles.profileFormMessage}
                            />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="agreesToMLHDataSharing"
                      render={({ field }) => (
                        <FormItem className={styles.profileConsent}>
                          <FormControl>
                            <Checkbox
                              checked={!!field.value}
                              className={styles.profileCheckbox}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className={styles.profileConsentCopy}>
                            <FormLabel className={styles.profileFormLabel}>
                              I authorize sharing my registration information
                              with Major League Hacking for event administration
                              and agree to the{" "}
                              <Link
                                className={styles.profileInlineLink}
                                href="https://github.com/MLH/mlh-policies/blob/main/contest-terms.md"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                MLH Contest Terms
                              </Link>
                              {" and "}
                              <Link
                                className={styles.profileInlineLink}
                                href="https://github.com/MLH/mlh-policies/blob/main/privacy-policy.md"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Privacy Policy
                              </Link>
                              . <RequiredMark />
                            </FormLabel>
                            <FormMessage
                              className={styles.profileFormMessage}
                            />
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="agreesToReceiveEmailsFromMLH"
                      render={({ field }) => (
                        <FormItem className={styles.profileConsent}>
                          <FormControl>
                            <Checkbox
                              checked={!!field.value}
                              className={styles.profileCheckbox}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className={styles.profileConsentCopy}>
                            <FormLabel className={styles.profileFormLabel}>
                              I authorize MLH to send me occasional emails about
                              relevant events, career opportunities, and
                              community announcements
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </ProfileFormBlock>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </section>
  );
}

function ProfileFormBlock({
  children,
  copy,
  title,
}: {
  children: ReactNode;
  copy: string;
  title: string;
}) {
  return (
    <section className={styles.profileFormBlock}>
      <div className={styles.profileFormBlockHeader}>
        <h3 className={styles.profileGroupTitle}>{title}</h3>
        <p>{copy}</p>
      </div>
      {children}
    </section>
  );
}

function RequiredMark() {
  return <span className={styles.profileRequired}>*</span>;
}

function OptionalNote() {
  return <span className={styles.profileOptional}>Optional</span>;
}

function EventCountdown({
  endDate,
  showLabel = true,
  startDate,
}: {
  endDate: Date;
  showLabel?: boolean;
  startDate: Date;
}) {
  const [countdown, setCountdown] = useState<CountdownState | null>(null);
  const countdownAccessibleLabel = countdown
    ? `${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes, ${countdown.seconds} seconds until Knight Hacks IX starts`
    : "Loading event countdown";

  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(getCountdownState(startDate, endDate));
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [endDate, startDate]);

  if (countdown?.isComplete) {
    const completeCopy =
      countdown.label === "Knight Hacks IX has wrapped"
        ? "Thanks for spending the weekend with us."
        : "The grove is open. Come find us.";

    return (
      <div className={styles.countdownComplete} aria-live="polite">
        <span className={styles.countdownBloom} aria-hidden="true" />
        <span className={styles.countdownCompleteLabel}>{countdown.label}</span>
        <span className={styles.countdownCompleteCopy}>{completeCopy}</span>
      </div>
    );
  }

  return (
    <div
      className={styles.countdownPanel}
      aria-label={countdownAccessibleLabel}
      aria-live="polite"
      role="timer"
    >
      {showLabel ? (
        <p className={styles.countdownEyebrow}>
          {countdown?.label ?? "Knight Hacks IX starts in"}
        </p>
      ) : null}
      <div className={styles.countdownGrid} aria-hidden="true">
        <CountdownUnit label="days" value={countdown?.days} />
        <CountdownUnit label="hrs" value={countdown?.hours} />
        <CountdownUnit label="min" value={countdown?.minutes} />
        <CountdownUnit label="sec" value={countdown?.seconds} />
      </div>
    </div>
  );
}

function CountdownUnit({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <span className={styles.countdownUnit}>
      <span className={styles.countdownValue}>
        {value == null ? "--" : String(value).padStart(2, "0")}
      </span>
      <span className={styles.countdownLabel}>{label}</span>
    </span>
  );
}

function StatusStage({
  action,
  body,
  countdown,
  greeting,
  headline,
  statusClassName,
  statusLabel,
}: {
  action?: ReactNode;
  body: string;
  countdown?: ReactNode;
  greeting?: string;
  headline: string;
  statusClassName?: string;
  statusLabel?: string;
}) {
  const isAcceptedStatus = statusClassName === styles.statusAccepted;
  const isAttendanceStatus =
    statusClassName === styles.statusConfirmed ||
    statusClassName === styles.statusCheckedin;

  return (
    <section
      id="application-status"
      className={joinClasses(
        styles.statusStage,
        isAcceptedStatus && styles.acceptedStatusStage,
        isAttendanceStatus && styles.attendanceStatusStage,
      )}
      aria-labelledby="khix-dashboard-title"
    >
      {greeting ? <p className={styles.greeting}>{greeting}</p> : null}
      <h1 id="khix-dashboard-title" className={styles.headline}>
        {headline.split("\n").map((line) => (
          <span key={line} className={styles.headlineLine}>
            {line}
          </span>
        ))}
      </h1>
      <p className={styles.subcopy}>{body}</p>
      {countdown ? (
        <>
          <div className={styles.countdownSlot}>{countdown}</div>
          <p className={styles.eventDetails}>{KHIX_EVENT_DETAILS}</p>
        </>
      ) : null}
      {statusLabel ? (
        <span className={joinClasses(styles.statusPill, statusClassName)}>
          {statusLabel}
        </span>
      ) : null}
      {action ? (
        <div
          className={joinClasses(
            styles.actionRow,
            isAcceptedStatus && styles.acceptedActionRow,
          )}
        >
          {action}
        </div>
      ) : null}
    </section>
  );
}

function StatusAction({
  actionPending,
  atCapacity,
  confirmationClosed,
  loadQRCode,
  onConfirm,
  onWithdraw,
  qrAvailable,
  qrCode,
  qrErrorMessage,
  qrLoading,
  status,
  termsUrl,
}: {
  actionPending: boolean;
  atCapacity: boolean;
  confirmationClosed: boolean;
  loadQRCode: () => Promise<unknown>;
  onConfirm: () => Promise<void>;
  onWithdraw: () => Promise<void>;
  qrAvailable: boolean;
  qrCode: string | undefined;
  qrErrorMessage: string | null;
  qrLoading: boolean;
  status: HackerStatus;
  termsUrl: string;
}) {
  if (status === "accepted") {
    const disabled = actionPending || confirmationClosed || atCapacity;
    return (
      <>
        <Button
          className={joinClasses(
            styles.primaryButton,
            styles.acceptedConfirmButton,
          )}
          disabled={disabled}
          onClick={() => void onConfirm()}
          type="button"
        >
          {actionPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {confirmationClosed || atCapacity
            ? "Confirmation closed"
            : "Agree and confirm"}
        </Button>
        <Button
          asChild
          variant="outline"
          className={joinClasses(
            styles.ghostButton,
            styles.acceptedTermsButton,
          )}
        >
          <a href={termsUrl} target="_blank" rel="noopener noreferrer">
            Terms and conditions
            <ExternalLink className="size-4" />
          </a>
        </Button>
      </>
    );
  }

  if (status === "confirmed" || status === "checkedin") {
    return (
      <>
        <QrDialog
          available={qrAvailable}
          errorMessage={qrErrorMessage}
          isLoading={qrLoading}
          loadQRCode={loadQRCode}
          qrCode={qrCode}
          triggerClassName={joinClasses(
            styles.primaryButton,
            styles.checkInButton,
          )}
          triggerContent={
            <span className={styles.checkInQrTrigger}>
              <QrCode className={styles.checkInQrIcon} aria-hidden="true" />
              <span>Open check-in QR</span>
            </span>
          }
        />
        {status === "confirmed" ? (
          <HoldToWithdrawButton
            disabled={actionPending}
            onWithdraw={onWithdraw}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <Button asChild className={styles.primaryButton}>
        <a
          href="https://discord.gg/2W2HCvkKAy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Join Discord <ExternalLink className="size-4" />
        </a>
      </Button>
      <Button
        variant="outline"
        className={styles.ghostButton}
        disabled
        type="button"
      >
        Hackers guide <LockKeyhole className="size-4" />
      </Button>
    </>
  );
}

function HoldToWithdrawButton({
  disabled,
  onWithdraw,
}: {
  disabled: boolean;
  onWithdraw: () => Promise<void>;
}) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdFrameRef = useRef<number | null>(null);
  const holdStartedAtRef = useRef<number | null>(null);
  const holdPointerIdRef = useRef<number | null>(null);
  const holdCompletedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (holdFrameRef.current !== null) {
        window.cancelAnimationFrame(holdFrameRef.current);
      }
    };
  }, []);

  const resetHold = () => {
    if (holdFrameRef.current !== null) {
      window.cancelAnimationFrame(holdFrameRef.current);
      holdFrameRef.current = null;
    }

    holdStartedAtRef.current = null;
    holdPointerIdRef.current = null;
    holdCompletedRef.current = false;
    setIsHolding(false);
    setHoldProgress(0);
  };

  const completeHold = () => {
    if (holdCompletedRef.current) return;

    holdCompletedRef.current = true;
    holdFrameRef.current = null;
    setIsHolding(true);
    setHoldProgress(1);

    void onWithdraw().finally(() => {
      if (!mountedRef.current) return;

      window.setTimeout(() => {
        if (mountedRef.current) resetHold();
      }, 180);
    });
  };

  const updateHold = (now: number) => {
    if (holdStartedAtRef.current === null) return;

    const progress = Math.min(
      (now - holdStartedAtRef.current) / WITHDRAW_HOLD_READY_MS,
      1,
    );
    setHoldProgress(progress);

    if (progress >= 1) {
      completeHold();
      return;
    }

    holdFrameRef.current = window.requestAnimationFrame(updateHold);
  };

  const startHold = () => {
    if (disabled || holdCompletedRef.current) return;

    resetHold();
    holdStartedAtRef.current = performance.now();
    setIsHolding(true);
    holdFrameRef.current = window.requestAnimationFrame(updateHold);
  };

  const stopHold = () => {
    if (disabled || holdCompletedRef.current) return;
    resetHold();
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    holdPointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    startHold();
  };

  const handlePointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    if (
      holdPointerIdRef.current !== null &&
      event.pointerId !== holdPointerIdRef.current
    ) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    holdPointerIdRef.current = null;
    stopHold();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    if (event.repeat) return;

    event.preventDefault();
    startHold();
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;

    event.preventDefault();
    stopHold();
  };

  const holdStyle = {
    "--kh-withdraw-hold-angle": `${Math.round(holdProgress * 360)}deg`,
  } as CSSProperties;

  return (
    <Button
      variant="outline"
      className={joinClasses(styles.ghostButton, styles.withdrawHoldButton)}
      data-hold-active={isHolding ? "true" : undefined}
      disabled={disabled}
      onClick={(event) => event.preventDefault()}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerLeave={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
          handlePointerEnd(event);
        }
      }}
      onPointerUp={handlePointerEnd}
      style={holdStyle}
      type="button"
      aria-label={
        disabled ? "Withdrawing attendance" : "Hold to withdraw attendance"
      }
      title={
        disabled ? "Withdrawing attendance" : "Hold to withdraw attendance"
      }
    >
      <span className={styles.withdrawHoldSpinnerSlot} aria-hidden="true">
        {disabled ? <Loader2 className="size-4 animate-spin" /> : null}
      </span>
      <span>Withdraw attendance</span>
    </Button>
  );
}

function ToolDock({
  hideApplications = false,
  loadQRCode,
  qrAvailable,
  qrCode,
  qrErrorMessage,
  qrLoading,
  resumeMeta = "Locked",
  resumeText = "No resume attached yet.",
  resumeUrl,
  supportUrl,
}: {
  hideApplications?: boolean;
  loadQRCode?: () => Promise<unknown>;
  qrAvailable?: boolean;
  qrCode?: string;
  qrErrorMessage?: string | null;
  qrLoading?: boolean;
  resumeMeta?: string;
  resumeText?: string;
  resumeUrl?: string | null;
  supportUrl: string;
}) {
  return (
    <section
      id="dashboard-links"
      className={joinClasses(
        styles.toolDock,
        hideApplications && styles.toolDockFourUp,
      )}
      aria-label="Dashboard links"
    >
      <ActionTile
        description="Rules, arrival notes, and prep open closer to Knight Hacks IX."
        icon={<LockKeyhole className="size-4" />}
        label="Hackers guide"
        meta="Locked"
        disabled
      />
      {!hideApplications && (
        <>
          <ApplicationDialog
            description="Apply to help run Knight Hacks IX."
            href={applicationLinks.volunteer}
            icon={<FileText className="size-4" />}
            label="Volunteer application"
            openLabel="Open volunteer form"
            warning="Volunteers help run Knight Hacks IX. If you apply and are selected as a volunteer, you will not be able to participate as a hacker."
          />
          <ApplicationDialog
            description="Apply to support hacker teams during Knight Hacks IX."
            href={applicationLinks.mentor}
            icon={<UserRound className="size-4" />}
            label="Mentor application"
            openLabel="Open mentor form"
            warning="Mentors support teams during Knight Hacks IX. If you apply and are selected as a mentor, you will not be able to participate as a hacker."
          />
        </>
      )}
      <ActionTile
        description="Organizer updates and support."
        href={supportUrl}
        icon={<LifeBuoy className="size-4" />}
        label="Discord"
        meta="Join"
        external
      />
      <ActionTile
        description={resumeText}
        href={resumeUrl ?? undefined}
        icon={<FileText className="size-4" />}
        label="Resume"
        meta={resumeMeta}
        external={Boolean(resumeUrl)}
        disabled={!resumeUrl}
      />
      {loadQRCode ? (
        <QrDialog
          available={Boolean(qrAvailable)}
          errorMessage={qrErrorMessage ?? null}
          isLoading={Boolean(qrLoading)}
          loadQRCode={loadQRCode}
          qrCode={qrCode}
          triggerClassName={styles.toolButton}
          triggerContent={
            <>
              <span className={styles.toolTitle}>
                <QrCode className="size-4" />
                Check-in QR
              </span>
              <span className={styles.toolCopy}>Opens after confirmation.</span>
              <span className={styles.toolMeta}>
                {qrAvailable ? "Open" : "Locked"}
              </span>
            </>
          }
        />
      ) : (
        <div className={styles.toolDisabled} aria-disabled="true">
          <span className={styles.toolTitle}>
            <LockKeyhole className="size-4" />
            Check-in QR
          </span>
          <span className={styles.toolCopy}>Available after confirmation.</span>
          <span className={styles.toolMeta}>Locked</span>
        </div>
      )}
    </section>
  );
}

async function copyApplicationUrl(href: string, label: string) {
  try {
    await navigator.clipboard.writeText(href);
    toast.success(`${label} URL copied.`);
  } catch {
    toast.error(`Could not copy the ${label.toLowerCase()} URL.`);
  }
}

function ApplicationDialog({
  description,
  href,
  icon,
  label,
  openLabel,
  warning,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  label: string;
  openLabel: string;
  warning: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={styles.toolButton} type="button">
          <span className={styles.toolTitle}>
            {icon}
            {label}
          </span>
          <span className={styles.toolCopy}>{description}</span>
          <span className={styles.toolMeta}>Apply</span>
        </button>
      </DialogTrigger>
      <DialogContent className={styles.dialog}>
        <DialogHeader>
          <DialogTitle className={styles.dialogTitle}>
            Heads up before you apply
          </DialogTitle>
          <DialogDescription className={styles.dialogCopy}>
            {warning}
          </DialogDescription>
        </DialogHeader>
        <div className={styles.dialogUrlBox} aria-label={`${label} URL`}>
          <code>{href}</code>
        </div>
        <DialogFooter className={styles.dialogActionRow}>
          <Button
            className={styles.ghostButton}
            onClick={() => void copyApplicationUrl(href, label)}
            type="button"
          >
            <Copy className="size-4" />
            Copy URL
          </Button>
          <Button asChild className={styles.primaryButton}>
            <a href={href} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              {openLabel}
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActionTile({
  description,
  disabled = false,
  external = false,
  href,
  icon,
  label,
  meta,
}: {
  description: string;
  disabled?: boolean;
  external?: boolean;
  href?: string;
  icon: ReactNode;
  label: string;
  meta: string;
}) {
  const content = (
    <>
      <span className={styles.toolTitle}>
        {icon}
        {label}
      </span>
      <span className={styles.toolCopy}>{description}</span>
      <span className={styles.toolMeta}>{meta}</span>
    </>
  );

  if (disabled || !href) {
    return (
      <div className={styles.toolDisabled} aria-disabled="true">
        {content}
      </div>
    );
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.toolLink}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={styles.toolLink}>
      {content}
    </Link>
  );
}

function QrDialog({
  available,
  errorMessage,
  isLoading,
  loadQRCode,
  qrCode,
  triggerClassName,
  triggerContent,
}: {
  available: boolean;
  errorMessage: string | null;
  isLoading: boolean;
  loadQRCode: () => Promise<unknown>;
  qrCode: string | undefined;
  triggerClassName: string | undefined;
  triggerContent: ReactNode;
}) {
  if (!available) {
    return (
      <div className={styles.toolDisabled} aria-disabled="true">
        <span className={styles.toolTitle}>
          <LockKeyhole className="size-4" />
          Check-in QR
        </span>
        <span className={styles.toolCopy}>Available after confirmation.</span>
        <span className={styles.toolMeta}>Locked</span>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={triggerClassName}
          onClick={() => void loadQRCode().catch(() => undefined)}
        >
          {triggerContent}
        </button>
      </DialogTrigger>
      <DialogContent className={styles.dialog}>
        <DialogHeader>
          <DialogTitle className={styles.dialogTitle}>
            Your check-in QR code
          </DialogTitle>
          <DialogDescription className={styles.dialogCopy}>
            Show this at an organizer check-in station.
          </DialogDescription>
        </DialogHeader>
        <div className={styles.qrFrame} aria-live="polite">
          {qrCode ? (
            <Image
              src={qrCode}
              alt="Knight Hacks IX hacker QR code"
              width={288}
              height={288}
              className={styles.qrImage}
              unoptimized
            />
          ) : isLoading ? (
            <Loader2 className="size-8 animate-spin" />
          ) : errorMessage ? (
            <div className="flex max-w-72 flex-col items-center gap-3 text-center">
              <AlertCircle className="size-8 text-[#ff9c8f]" />
              <p className={styles.dialogCopy}>{errorMessage}</p>
              <Button
                className={styles.primaryButton}
                onClick={() => void loadQRCode().catch(() => undefined)}
                type="button"
              >
                Try again
              </Button>
            </div>
          ) : (
            <Loader2 className="size-8 animate-spin" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IssueDialog({
  isOpen,
  isPending,
  issue,
  onChange,
  onOpenChange,
  onReport,
  trigger,
}: {
  isOpen: boolean;
  isPending: boolean;
  issue: string;
  onChange: (issue: string) => void;
  onOpenChange: (open: boolean) => void;
  onReport: () => Promise<void>;
  trigger: ReactNode;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={styles.dialog}>
        <DialogHeader>
          <DialogTitle className={styles.dialogTitle}>
            Report an issue
          </DialogTitle>
          <DialogDescription className={styles.dialogCopy}>
            Tell the organizer team what is happening and where you are.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          aria-label="Issue details"
          className={styles.issueTextarea}
          maxLength={2000}
          value={issue}
          onChange={(event) => onChange(event.target.value)}
        />
        <DialogFooter>
          <Button
            className={joinClasses(
              styles.primaryButton,
              styles.reportSubmitButton,
            )}
            disabled={!issue.trim() || isPending}
            onClick={() => void onReport()}
            type="button"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileSkeleton() {
  return (
    <section className={styles.profileSection} aria-label="Loading profile">
      <div className={styles.profileForm}>
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className={joinClasses(styles.skeleton, styles.profileFormBlock)}
          />
        ))}
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <section className={styles.statusStage} aria-label="Loading dashboard">
        <div
          className={joinClasses(
            styles.skeleton,
            styles.skeletonLine,
            "mx-auto w-72",
          )}
        />
        <div
          className={joinClasses(styles.skeleton, styles.skeletonTitle, "mt-6")}
        />
        <div
          className={joinClasses(
            styles.skeleton,
            styles.skeletonLine,
            "mx-auto mt-6 w-full max-w-xl",
          )}
        />
        <div className="mt-6 flex justify-center gap-3">
          <div
            className={joinClasses(styles.skeleton, styles.skeletonButton)}
          />
          <div
            className={joinClasses(styles.skeleton, styles.skeletonButton)}
          />
        </div>
      </section>
      <section className={styles.toolDock} aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className={joinClasses(styles.skeleton, styles.toolDisabled)}
          />
        ))}
      </section>
    </>
  );
}
