"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

import { usePortalConfig } from "~/lib/hacker-portal";
import styles from "./Hero.module.css";

interface HeroApplyButtonProps {
  className?: string;
  cursorReactive?: boolean;
}

export function HeroApplyButton({
  className,
  cursorReactive = false,
}: HeroApplyButtonProps) {
  const config = usePortalConfig();
  const cursorIdleTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (cursorIdleTimerRef.current !== null) {
        window.clearTimeout(cursorIdleTimerRef.current);
      }
    },
    [],
  );

  const clearCursorIdleTimer = () => {
    if (cursorIdleTimerRef.current === null) {
      return;
    }

    window.clearTimeout(cursorIdleTimerRef.current);
    cursorIdleTimerRef.current = null;
  };

  const updateCursorGlow = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (!cursorReactive || event.pointerType !== "mouse") {
      return;
    }

    const button = event.currentTarget;
    const bounds = button.getBoundingClientRect();
    const offsetX = event.clientX - bounds.left;
    const offsetY = event.clientY - bounds.top;
    const pointerX = Math.min(100, Math.max(0, (offsetX / bounds.width) * 100));
    const pointerY = Math.min(
      100,
      Math.max(0, (offsetY / bounds.height) * 100),
    );
    const deltaX = offsetX - bounds.width / 2;
    const deltaY = offsetY - bounds.height / 2;
    const glowAngle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI + 180;

    button.style.setProperty("--khix-apply-pointer-x", `${pointerX}%`);
    button.style.setProperty("--khix-apply-pointer-y", `${pointerY}%`);
    button.style.setProperty("--khix-apply-glow-angle", `${glowAngle}deg`);
    button.dataset.cursorActive = "true";
    button.dataset.cursorIdle = "false";

    clearCursorIdleTimer();
    cursorIdleTimerRef.current = window.setTimeout(() => {
      if (button.dataset.cursorActive === "true") {
        button.dataset.cursorIdle = "true";
      }
    }, 550);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (!cursorReactive || event.pointerType !== "mouse") {
      return;
    }

    clearCursorIdleTimer();
    event.currentTarget.dataset.cursorActive = "false";
    event.currentTarget.dataset.cursorIdle = "false";
  };

  return (
    <Link
      href={config.routes.dashboard}
      className={[styles.heroApplyButton, className].filter(Boolean).join(" ")}
      data-cursor-active={cursorReactive ? "false" : undefined}
      data-cursor-idle={cursorReactive ? "false" : undefined}
      onPointerEnter={cursorReactive ? updateCursorGlow : undefined}
      onPointerMove={cursorReactive ? updateCursorGlow : undefined}
      onPointerLeave={cursorReactive ? handlePointerLeave : undefined}
      onPointerCancel={cursorReactive ? handlePointerLeave : undefined}
    >
      <span>Log into Dashboard</span>
    </Link>
  );
}

export function HeroTitle() {
  return (
    <div className={styles.titleLockup} data-hero-title>
      <div className={styles.titleLogoWrap} aria-hidden="true">
        <Image
          src="https://assets.knighthacks.org/khix/khlogo.svg"
          alt=""
          width={1858}
          height={666}
          priority
          draggable={false}
          className={styles.titleLogo}
          data-hero-title-logo
        />
      </div>
      <p className={styles.eventDetails}>
        <span>October 9 - 11, 2026</span>
        <span>University of Central Florida</span>
      </p>
      <HeroApplyButton className={styles.titleApplyButton} cursorReactive />
    </div>
  );
}
