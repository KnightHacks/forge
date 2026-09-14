"use client";

import { useEffect, useState } from "react";
import { redirect, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Clock,
  MapPin,
  Search,
  UserPlus,
  Users,
} from "lucide-react";

import type { HackerJudgingDto } from "@forge/hacker-sdk/contracts";
import {
  useClaimProject,
  useHackerDashboard,
  useHackerJudging,
  useHackerSdkClient,
  useInviteProjectMember,
  useProjectClaim,
} from "@forge/hacker-sdk/react";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { toast } from "@forge/ui/toast";

import styles from "./hacker-judging.module.css";
import { KhixDashboardShell } from "./khix-dashboard";
import dashboardStyles from "./khix-dashboard.module.css";

const statusLabels = {
  future: "Upcoming",
  pending: "In progress",
  incomplete: "Incomplete",
  missed: "Missed appointment",
  complete: "Judged",
};
const missedMessage =
  "You missed your judging appointment. Expect a message from an organizer. You must respond to avoid disqualification across all challenges.";

export function HackerJudging({ token }: { token: string | null }) {
  const router = useRouter();
  const { client, portalKey } = useHackerSdkClient();
  const dashboard = useHackerDashboard();
  const [projectId, setProjectId] = useState<string>();
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const access = useHackerJudging();
  const judging = useHackerJudging(
    access.data?.emergency ? projectId : undefined,
  );
  const claim = useProjectClaim(token);
  const selectMember = useClaimProject();
  const invite = useInviteProjectMember();
  const data =
    dashboard.error || access.error || judging.error ? undefined : judging.data;
  const checkedIn = dashboard.data?.application?.status === "checkedin";
  const searchResults = useQuery({
    queryKey: ["forge-hacker-sdk", "v1", portalKey, "judging-search", search],
    queryFn: () => client.searchJudgingProjects({ query: search }),
    enabled: checkedIn && !!data?.emergency && !!data.published,
    gcTime: 0,
  });
  const endsAt = data?.appointments
    .filter(
      (appointment) =>
        Date.parse(appointment.endsAt) > Date.parse(data.serverNow),
    )
    .map((appointment) => Date.parse(appointment.endsAt));
  const nextEnd = endsAt?.length ? Math.min(...endsAt) : null;
  const refetch = judging.refetch;
  const serverNow = data?.serverNow;
  useEffect(() => {
    if (!nextEnd || !serverNow) return;
    // Verify with the server after the deadline; never turn red from the local clock alone.
    const timer = window.setTimeout(
      () => {
        void refetch();
      },
      Math.min(
        2_147_483_647,
        Math.max(0, nextEnd - Date.parse(serverNow)) + 100,
      ),
    );
    return () => window.clearTimeout(timer);
  }, [nextEnd, serverNow, refetch]);
  const missed =
    data?.appointments.filter(
      (appointment) => appointment.status === "missed",
    ) ?? [];
  const warningKey = missed
    .map((appointment) => `${appointment.id}:${appointment.endsAt}`)
    .sort()
    .join("|");
  const formatTime = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: data?.timezone,
    }).format(new Date(value));
  async function claimMember(memberId: string) {
    if (!token) return;
    try {
      await selectMember.mutateAsync({ token, memberId });
      toast.success("Project claimed. You're on the team.");
      router.replace("/dashboard/judging");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not claim this member.",
      );
    }
  }
  async function sendInvite() {
    try {
      const result = await invite.mutateAsync({ email });
      if (result.sent) {
        toast.success(result.message);
        setInviteOpen(false);
        setEmail("");
      } else toast.error(result.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Invitation failed.",
      );
    }
  }
  if (!dashboard.error && dashboard.data && !checkedIn) redirect("/dashboard");
  if (
    checkedIn &&
    data &&
    !data.claimsOpen &&
    !(data.published && data.emergency) &&
    !token
  )
    redirect("/dashboard");
  return (
    <KhixDashboardShell activeItem="judging">
      <section className={styles.page}>
        <header className={styles.header}>
          <h1>Judging</h1>
          <p>Know where to go and what to present.</p>
        </header>
        {dashboard.error ? (
          <div className={styles.panel} role="alert">
            <p>{dashboard.error.message}</p>
            <Button
              className={styles.action}
              onClick={() => void dashboard.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : dashboard.isPending ? (
          <div className={styles.panel}>Loading your hacker profile…</div>
        ) : (
          <>
            {token && !data?.emergency && (
              <section className={styles.panel} aria-label="Claim your project">
                <h2>{claim.data?.title ?? "Claim your project"}</h2>
                <p>
                  Select your name to link this project to your hacker profile.
                </p>
                {claim.isPending && <p>Loading team members…</p>}
                {claim.error && <p role="alert">{claim.error.message}</p>}
                <div className={styles.members}>
                  {claim.data?.members.map((member) => (
                    <button
                      type="button"
                      key={member.id}
                      disabled={!member.available || selectMember.isPending}
                      onClick={() => void claimMember(member.id)}
                    >
                      <Users size={18} />
                      <span>{member.name}</span>
                      <small>
                        {member.claimed
                          ? "Claimed"
                          : member.available
                            ? "This is me →"
                            : "Invited teammate"}
                      </small>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {judging.isPending && (
              <div className={styles.panel}>
                Loading your judging itinerary…
              </div>
            )}
            {(access.error ?? judging.error) && (
              <div className={styles.panel} role="alert">
                <p>{(access.error ?? judging.error)?.message}</p>
                <Button
                  className={styles.action}
                  onClick={() => {
                    void access.refetch();
                    void judging.refetch();
                  }}
                >
                  Retry
                </Button>
              </div>
            )}
            {data && (
              <>
                {!data.published && (
                  <section className={styles.panel}>
                    <Clock />
                    <h2>Your schedule is being prepared</h2>
                    <p>
                      {data.project
                        ? "Your project is claimed. Times and rooms will appear here when organizers open the schedule."
                        : "Use the link sent to your Devpost email to claim your project. Organizers will publish times and rooms here."}
                    </p>
                  </section>
                )}
                {data.published && data.emergency && (
                  <section className={styles.panel}>
                    <Label
                      htmlFor="project-search"
                      className={styles.searchLabel}
                    >
                      Find your project
                    </Label>
                    <div className={styles.search}>
                      <Search size={18} />
                      <Input
                        id="project-search"
                        value={search}
                        onChange={(event) => {
                          setSearch(event.target.value);
                          setProjectId(undefined);
                        }}
                        placeholder="Search project names"
                      />
                    </div>
                    <Label htmlFor="project-select">Project</Label>
                    <select
                      id="project-select"
                      className={styles.select}
                      value={projectId ?? ""}
                      onChange={(event) =>
                        setProjectId(event.target.value || undefined)
                      }
                    >
                      <option value="">Select your project</option>
                      {searchResults.data?.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </select>
                    {searchResults.error && (
                      <p role="alert">{searchResults.error.message}</p>
                    )}
                    <p className={styles.muted}>
                      Choose your team's project to see its itinerary. Results
                      are unavailable in this mode.
                    </p>
                  </section>
                )}
                {data.published &&
                  !data.emergency &&
                  !data.project &&
                  !token && (
                    <section className={styles.panel}>
                      <Users />
                      <h2>Claim your project first</h2>
                      <p>
                        Open the claim link sent to your Devpost email. If it
                        hasn't arrived, ask an organizer for your link.
                      </p>
                    </section>
                  )}
                {data.project && (
                  <>
                    <section className={styles.team}>
                      <div>
                        <h2>{data.project.title}</h2>
                        {!data.emergency && (
                          <p>
                            {data.project.members
                              .map((member) => member.name)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                      {!data.emergency && (
                        <Button
                          className={styles.action}
                          variant="outline"
                          onClick={() => setInviteOpen(true)}
                          disabled={!data.project.canInvite}
                        >
                          <UserPlus className="mr-2 size-4" />
                          {data.project.canInvite
                            ? "Invite hacker"
                            : "Team full · 4/4"}
                        </Button>
                      )}
                    </section>
                    {!!missed.length && (
                      <div className={styles.warning} role="alert">
                        <AlertTriangle size={20} />
                        <p>{missedMessage}</p>
                      </div>
                    )}
                    {data.published && (
                      <>
                        <div className={styles.itinerary}>
                          {data.appointments.map((appointment) => (
                            <article
                              key={appointment.id}
                              className={styles.appointment}
                              data-status={appointment.status}
                            >
                              <div className={styles.time}>
                                <Clock size={16} />
                                <strong>
                                  {formatTime(appointment.startsAt)}
                                </strong>
                                <span>to {formatTime(appointment.endsAt)}</span>
                              </div>
                              <div className={styles.destination}>
                                <div className={styles.status}>
                                  {appointment.status === "complete" && (
                                    <Check size={14} />
                                  )}{" "}
                                  {statusLabels[appointment.status]}
                                </div>
                                <h3>{appointment.challenge}</h3>
                                <p className={styles.room}>
                                  <MapPin size={18} />
                                  {appointment.room}
                                </p>
                                {!!appointment.children.length && (
                                  <div className={styles.challenges}>
                                    <p>Prepare for</p>
                                    <ul>
                                      {appointment.children.map((child) => (
                                        <li key={child}>{child}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {appointment.status === "complete" &&
                                  !data.emergency && (
                                    <JudgingFeedback
                                      feedback={data.feedback.filter(
                                        (entry) =>
                                          entry.challengeId ===
                                          appointment.challengeId,
                                      )}
                                      challenge={appointment.challenge}
                                    />
                                  )}
                              </div>
                            </article>
                          ))}
                        </div>
                        {!data.appointments.length && (
                          <p className={styles.muted}>
                            No scheduled appointments are available for this
                            project yet.
                          </p>
                        )}
                        <div className={styles.itinerary}>
                          {data.unscheduled.map((entry) => (
                            <article
                              className={styles.appointment}
                              key={entry.challengeId}
                              data-status={entry.judged ? "complete" : "future"}
                            >
                              <div className={styles.time}>
                                <Clock size={16} />
                                <strong>
                                  When you have time - unscheduled
                                </strong>
                              </div>
                              <div className={styles.destination}>
                                {entry.judged && (
                                  <div className={styles.status}>
                                    <Check size={14} /> Judged
                                  </div>
                                )}
                                <h3>{entry.challenge}</h3>
                                <p className={styles.room}>
                                  <MapPin size={18} />
                                  {entry.rooms.join(" / ") ||
                                    "Ask an organizer for the room"}
                                </p>
                                {!!entry.children.length && (
                                  <div className={styles.challenges}>
                                    <p>Prepare for</p>
                                    <ul>
                                      {entry.children.map((child) => (
                                        <li key={child}>{child}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {entry.judged && !data.emergency && (
                                  <JudgingFeedback
                                    feedback={data.feedback.filter(
                                      (evaluation) =>
                                        evaluation.challengeId ===
                                        entry.challengeId,
                                    )}
                                    challenge={entry.challenge}
                                  />
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                        <p className={styles.muted}>
                          Times shown in {data.timezone}. Updates every two
                          minutes.
                        </p>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
        <Dialog
          open={!!warningKey && !acknowledged.includes(warningKey)}
          onOpenChange={(open) => {
            if (!open) setAcknowledged((previous) => [...previous, warningKey]);
          }}
        >
          <DialogContent
            className={`${dashboardStyles.dialog} ${styles.dialog}`}
          >
            <DialogHeader>
              <DialogTitle className={styles.dialogTitle}>
                Missed judging appointment
              </DialogTitle>
              <DialogDescription className={styles.dialogCopy}>
                {missedMessage}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:space-x-0">
              <Button
                className={styles.action}
                onClick={() =>
                  setAcknowledged((previous) => [...previous, warningKey])
                }
              >
                I understand
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={inviteOpen}
          onOpenChange={(open) => {
            if (!invite.isPending) setInviteOpen(open);
          }}
        >
          <DialogContent
            className={`${dashboardStyles.dialog} ${styles.dialog}`}
          >
            <DialogHeader>
              <DialogTitle className={styles.dialogTitle}>
                Invite a teammate
              </DialogTitle>
              <DialogDescription className={styles.dialogCopy}>
                Use the email on their hacker profile. They must be checked in
                to this event. The invitation reserves one of your team's four
                places.
              </DialogDescription>
            </DialogHeader>
            <Label htmlFor="invite-email">Hacker email</Label>
            <Input
              className={styles.input}
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@example.com"
            />
            <DialogFooter className="gap-2 sm:space-x-0">
              <Button
                className={styles.action}
                variant="outline"
                disabled={invite.isPending}
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className={styles.action}
                disabled={!email || invite.isPending}
                onClick={() => void sendInvite()}
              >
                {invite.isPending ? "Sending…" : "Send invitation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </KhixDashboardShell>
  );
}

function JudgingFeedback({
  feedback,
  challenge,
}: {
  feedback: HackerJudgingDto["feedback"];
  challenge: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className={styles.action}>
          View feedback
        </Button>
      </DialogTrigger>
      <DialogContent className={`${dashboardStyles.dialog} ${styles.dialog}`}>
        <DialogHeader>
          <DialogTitle className={styles.dialogTitle}>
            {challenge} feedback
          </DialogTitle>
          <DialogDescription className={styles.dialogCopy}>
            Completed rubric scores and written feedback. Judge identities are
            private.
          </DialogDescription>
        </DialogHeader>
        {!feedback.length && <p>Completed feedback is not available yet.</p>}
        {feedback.map((evaluation, index) => (
          <section
            className={styles.feedback}
            key={index}
            aria-label={`Evaluation ${index + 1}`}
          >
            {feedback.length > 1 && <h3>Evaluation {index + 1}</h3>}
            <dl>
              {evaluation.ratings.map((rating) => (
                <div key={rating.label}>
                  <dt>{rating.label}</dt>
                  <dd>{rating.value} / 5</dd>
                </div>
              ))}
            </dl>
            {evaluation.responses.map((response) => (
              <div className={styles.response} key={response.label}>
                <h3>{response.label}</h3>
                <p>{response.value}</p>
              </div>
            ))}
          </section>
        ))}
      </DialogContent>
    </Dialog>
  );
}
