"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin, Phone } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import { formatScheduleTimeRange } from "~/lib/event-schedule";
import { useCurrentEvents } from "~/lib/use-current-events";
import styles from "./hacker-dashboard-live.module.css";
import dashboardStyles from "./khix-dashboard.module.css";

export function HackerDashboardLive({ checkedIn }: { checkedIn: boolean }) {
  const { events, loading, error, refreshing, retry, timezone } =
    useCurrentEvents(checkedIn);

  return (
    <div className={`${styles.live} ${dashboardStyles.pageReveal}`}>
      <section aria-labelledby="happening-now-title">
        <header className={styles.heading}>
          <h2 id="happening-now-title">Happening now</h2>
          {checkedIn && (
            <Link href="/dashboard/events" className={styles.scheduleLink}>
              Schedule <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          )}
        </header>
        <div aria-live="polite" aria-busy={checkedIn && loading}>
          {!checkedIn ? (
            <p className={styles.message}>Check in to see live events here.</p>
          ) : error ? (
            <div className={styles.message}>
              <p>Couldn’t load current events.</p>
              <button
                type="button"
                disabled={refreshing}
                onClick={() => void retry()}
              >
                {refreshing ? "Refreshing…" : "Try again"}
              </button>
            </div>
          ) : loading ? (
            <p className={styles.message}>Checking the schedule…</p>
          ) : events.length === 0 ? (
            <p className={styles.message}>No events are happening right now.</p>
          ) : (
            <ul className={styles.events}>
              {events.map((event) => (
                <li key={event.id} className={styles.event}>
                  <p className={styles.time}>
                    <span className={styles.liveDot} aria-hidden="true" />
                    {formatScheduleTimeRange(
                      new Date(event.startAt),
                      new Date(event.endAt),
                      timezone,
                    )}
                  </p>
                  <h3>{event.name}</h3>
                  {event.location && (
                    <p className={styles.location}>
                      <MapPin size={14} aria-hidden="true" /> {event.location}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section aria-labelledby="dashboard-help-title">
        <header className={styles.heading}>
          <h2 id="dashboard-help-title">Need help?</h2>
        </header>
        <dl className={styles.contacts}>
          <div>
            <dt>
              Emergency <span>Immediate danger or medical help</span>
            </dt>
            <dd>
              <PhoneConfirmation name="Emergency" number="911" href="tel:911" />
            </dd>
          </div>
          <div>
            <dt>
              UCF Police <span>Non-emergency</span>
            </dt>
            <dd>
              <PhoneConfirmation
                name="UCF Police"
                number="407-823-5555"
                href="tel:+14078235555"
              />
            </dd>
          </div>
          <div>
            <dt>
              MLH <span>Report harassment or a conduct concern</span>
            </dt>
            <dd>
              <PhoneConfirmation
                name="MLH"
                number="409-202-6060"
                href="tel:+14092026060"
              />
            </dd>
          </div>
        </dl>
        <p className={styles.contactLinks}>
          <a href="mailto:incidents@mlh.io">Email MLH</a>
          <a
            href="https://www.police.ucf.edu/"
            target="_blank"
            rel="noopener noreferrer"
          >
            UCF safety <ArrowUpRight size={13} aria-hidden="true" />
          </a>
          <a
            href="https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            MLH conduct policy <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </p>
      </section>
    </div>
  );
}

function PhoneConfirmation({
  name,
  number,
  href,
}: {
  name: string;
  number: string;
  href: `tel:${string}`;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={styles.phoneButton}
          aria-label={`Call ${name}: ${number}`}
        >
          <Phone size={14} aria-hidden="true" /> {number}
        </button>
      </DialogTrigger>
      <DialogContent className={dashboardStyles.dialog}>
        <DialogHeader>
          <DialogTitle className={dashboardStyles.dialogTitle}>
            Call {name}?
          </DialogTitle>
          <DialogDescription className={dashboardStyles.dialogCopy}>
            This will open your phone app to call {number}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className={dashboardStyles.dialogActionRow}>
          <DialogClose asChild>
            <button type="button" className={dashboardStyles.ghostButton}>
              Cancel
            </button>
          </DialogClose>
          <DialogClose asChild>
            <a
              href={href}
              className={dashboardStyles.primaryButton}
              aria-label={`Confirm call to ${number}`}
            >
              <Phone size={16} aria-hidden="true" /> Call
            </a>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
