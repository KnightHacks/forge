"use client";

import { useEffect, useState } from "react";
import { Dot, Loader } from "lucide-react";

import type { HackerClass } from "@forge/db/schemas/knight-hacks";
import { HACKER_TEAMS } from "@forge/db/schemas/knight-hacks";

import type { api as serverCall } from "~/trpc/server";
import { getClassTeam } from "~/lib/utils";
import { api } from "~/trpc/react";

interface LeaderboardEntry {
  firstName: string;
  lastName: string;
  points: number;
  class: HackerClass | null;
  id: string;
}

export function PointLeaderboard({
  hacker,
  hId,
}: {
  hacker: Awaited<ReturnType<(typeof serverCall.hacker)["getHacker"]>>;
  hId: string;
}) {
  const dummy: HackerClass[] = [
    "Operator",
    "Harbinger",
    "Mechanist",
    "Sentinel",
    "Monstologist",
  ];

  const { data: data } = api.hacker.getTopHackers.useQuery({
    hackathonName: hId,
    hPoints: hacker?.points || 0,
    hClass: hacker?.class || "Alchemist",
  });
  const team = getClassTeam(hacker?.class || "Alchemist");

  const [overall, setOverall] = useState<LeaderboardEntry[]>();
  const [showYours, setShowYours] = useState(false);

  const [activeInd, setInd] = useState(-1);
  const [activeTop, setTop] = useState(overall);

  const { data: isAdmin } = api.roles.hasPermission.useQuery({
    or: ["READ_CLUB_DATA"],
  });

  const targetDate = new Date("2025-10-25T23:00:00").getTime();

  useEffect(() => {
    if (data) {
      setOverall(
        data.topA
          .concat(data.topB)
          .sort((a, b) => b.points - a.points)
          .splice(0, 5),
      );
      setInd(1);
    }
  }, [data]);

  useEffect(() => {
    switch (activeInd) {
      case 0:
        setTop(data?.topA ?? []);
        break;
      case 1:
        setTop(overall ?? []);
        break;
      case 2:
        setTop(data?.topB ?? []);
        break;
    }
  }, [activeInd, data, overall]);

  useEffect(() => {
    if (activeTop)
      setShowYours(
        !activeTop.find((v) => v.id == hacker?.id) &&
          (data?.place[activeInd] ?? -1) != -1,
      );
  }, [activeTop, hacker?.id, data?.place, activeInd]);

  return targetDate <= Date.now() && !isAdmin ? (
    <>
      <p>
        The leaderboard has been hidden while we decide who gets to be crowned{" "}
        <b>Most Involved Hacker.</b>
      </p>
      <p>
        However, the fight's not over yet. Keep on earning points! Everything
        will still be counted until the end of the event.
      </p>
      <p>
        Make sure to come to the <b>Closing Ceremony</b> to see the winners!
      </p>
      <div
        className="rounded-lg border p-1 text-center text-xl shadow-md"
        style={{ backgroundColor: team.teamColor + "22" }}
      >
        You have{" "}
        <b
          style={{
            color: team.teamColor,
            textShadow: `0 0 10px ${team.teamColor}, 0 0 20px ${team.teamColor}`,
          }}
        >
          {hacker?.points}
        </b>{" "}
        points.
      </div>
    </>
  ) : (
    <>
      <div className="grid w-full grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setInd(0)}
          className={`cursor-pointer rounded-lg border px-2 py-1 text-center text-xs font-semibold uppercase duration-200 sm:text-sm ${activeInd == 0 ? "bg-[#228be690]" : "hover:bg-[#228be650]"}`}
        >
          {HACKER_TEAMS[0]}
        </button>
        <button
          type="button"
          onClick={() => setInd(1)}
          className={`cursor-pointer rounded-lg border px-2 py-1 text-center text-xs font-semibold uppercase duration-200 sm:text-sm ${activeInd == 1 ? "bg-[#6C26D990]" : "hover:bg-[#6C26D950]"}`}
        >
          Overall
        </button>
        <button
          type="button"
          onClick={() => setInd(2)}
          className={`cursor-pointer rounded-lg border px-2 py-1 text-center text-xs font-semibold uppercase duration-200 sm:text-sm ${activeInd == 2 ? "bg-[#e0313190]" : "hover:bg-[#e0313150]"}`}
        >
          {HACKER_TEAMS[1]}
        </button>
      </div>
      <div className="flex w-full flex-col gap-1 rounded-xl border p-1">
        {!activeTop ? (
          dummy.map((v, i) => {
            const t = getClassTeam(v);
            return (
              <div
                className={`flex flex-row justify-between border p-1.5 px-2 ${i == 0 ? "rounded-t-lg font-semibold" : i == dummy.length - 1 ? "rounded-b-lg" : ""}`}
                style={{
                  backgroundColor: t.teamColor + `${i == 0 ? "30" : "30"}`,
                  borderColor: t.teamColor + "50",
                }}
              >
                <Loader className="my-auto size-5 animate-spin" />
                <Loader className="my-auto size-5 animate-spin" />
              </div>
            );
          })
        ) : (
          <>
            {activeTop.map((v, i) => {
              const t = getClassTeam(v.class || "Alchemist");
              return (
                <div
                  className={`flex flex-row justify-between border p-1 px-2 ${i == 0 ? "rounded-t-lg font-semibold" : i == activeTop.length - 1 && !showYours ? "rounded-b-lg" : ""}`}
                  style={{
                    backgroundColor: t.teamColor + `${i == 0 ? "30" : "30"}`,
                    borderColor: t.teamColor + "50",
                  }}
                >
                  <div
                    className={`flex flex-row gap-1 ${v.id == hacker?.id ? "underline" : ""}`}
                  >
                    {`${i + 1}. ${v.firstName} ${v.lastName}`}
                    <div
                      className="my-auto hidden rounded-lg bg-card/50 px-1 py-0.5 text-sm"
                      style={{
                        color: t.teamColor,
                      }}
                    >
                      {v.class}
                    </div>
                  </div>
                  <div className="my-auto text-sm">{`${v.points} pts.`}</div>
                </div>
              );
            })}
            {showYours && (
              <>
                <div className="flex w-full flex-row justify-center p-1 px-2">
                  <Dot />
                  <Dot />
                  <Dot />
                </div>
                <div
                  className={`flex flex-row justify-between rounded-b-lg border border-dashed p-1 px-2`}
                  style={{
                    backgroundColor: team.teamColor + `30`,
                    borderColor: team.teamColor + "50",
                  }}
                >
                  <div>{`${(data?.place[activeInd] ?? 0) + 1}. ${hacker?.firstName} ${hacker?.lastName}`}</div>
                  <div className="my-auto text-sm">{`${hacker?.points} pts.`}</div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
