"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Loader2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@forge/ui/avatar";

import styles from "./hacker-admission-pass.module.css";
import { HackerDashboardLive } from "./hacker-dashboard-live";
import { HackerQRCode } from "./hacker-qr-code";
import dashboardStyles from "./khix-dashboard.module.css";

interface HackerAdmissionPassProps {
  avatarUrl: string | null;
  checkedIn: boolean;
  className: string | null;
  fullName: string;
  loadQRCode: () => Promise<unknown>;
  qrCode: string | undefined;
  qrError: string | null;
  qrLoading: boolean;
  teamName: string | null;
  teamState: "loading" | "error" | "ready";
  resume: ReactNode;
  withdrawal: ReactNode;
}

export function HackerAdmissionPass({
  avatarUrl,
  checkedIn,
  className,
  fullName,
  loadQRCode,
  qrCode,
  qrError,
  qrLoading,
  teamName,
  teamState,
  resume,
  withdrawal,
}: HackerAdmissionPassProps) {
  const displayClassName = /^(colossus|collosus)$/i.test(
    className?.trim() ?? "",
  )
    ? "Collosus"
    : className;
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current || qrCode) return;
    // Let the parent's mutation subscription settle before issuing the pass.
    // Cleanup also prevents an abandoned Strict Mode mount from issuing one.
    const request = window.setTimeout(() => {
      requested.current = true;
      void loadQRCode().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(request);
  }, [loadQRCode, qrCode]);

  const teamLabel =
    teamState === "loading"
      ? "Loading…"
      : teamState === "error"
        ? "Team unavailable"
        : (teamName ?? "Join a team");

  return (
    <section
      className={styles.experience}
      data-hacker-class={displayClassName?.trim().toLowerCase()}
      aria-label={
        checkedIn ? "Checked-in hacker pass" : "Confirmed hacker pass"
      }
    >
      <div className={styles.pass}>
        <div className={`${styles.details} ${dashboardStyles.pageReveal}`}>
          <header className={styles.identity}>
            <Avatar className={styles.avatar}>
              {avatarUrl ? (
                <AvatarImage
                  src={avatarUrl}
                  alt="Your profile picture"
                  className={styles.avatarImage}
                />
              ) : null}
              <AvatarFallback className={styles.avatarFallback}>
                <Image
                  src="/dashboard/knight-avatar-placeholder.png"
                  alt="Knight Hacks placeholder avatar"
                  fill
                  sizes="(max-width: 850px) 44px, 104px"
                  className={styles.avatarImage}
                />
              </AvatarFallback>
            </Avatar>
            <div className={styles.identityText}>
              <h1>{fullName}</h1>
              <p className={styles.identityStatus}>
                {checkedIn ? "Checked in" : "Seat confirmed"}
              </p>
            </div>
          </header>
          <dl className={styles.memberships}>
            <div className={styles.membership}>
              <dt>Class</dt>
              <dd className={styles.className}>
                {displayClassName ?? "Assigned at check-in"}
              </dd>
            </div>
            <div className={styles.membership}>
              <dt>Team</dt>
              <dd>
                <Link href="/dashboard/teams" className={styles.teamLink}>
                  {teamLabel}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </dd>
            </div>
          </dl>
          <div className={styles.resume}>{resume}</div>
        </div>
        <section className={styles.qrSection} aria-label="Your QR code">
          {qrCode && !qrError ? (
            <HackerQRCode qrCode={qrCode} qrClassName={styles.qr} />
          ) : (
            <div className={styles.qr} aria-live="polite" aria-busy={qrLoading}>
              {qrError ? (
                <div className={styles.qrState}>
                  <p>{qrError}</p>
                  <button
                    type="button"
                    onClick={() => void loadQRCode().catch(() => undefined)}
                    disabled={qrLoading}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className={styles.qrState}>
                  <Loader2 className={styles.spinner} aria-hidden="true" />
                  <p>Loading QR…</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      <HackerDashboardLive checkedIn={checkedIn} />
      {withdrawal ? (
        <div className={styles.withdrawal}>{withdrawal}</div>
      ) : null}
    </section>
  );
}
