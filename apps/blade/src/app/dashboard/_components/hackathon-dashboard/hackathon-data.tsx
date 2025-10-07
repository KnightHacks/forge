"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CircleCheckBig } from "lucide-react";

import type { api as serverCall } from "~/trpc/server";
import { HACKER_STATUS_MAP } from "~/consts";
import { api } from "~/trpc/react";
import { HackerQRCodePopup } from "../hacker-dashboard/hacker-qr-button";

type StatusKey = keyof typeof HACKER_STATUS_MAP | null | undefined;

export function HackathonData({
  data,
}: {
  data: Awaited<ReturnType<(typeof serverCall.hacker)["getHacker"]>>;
}) {
  const [hackerStatus, setHackerStatus] = useState<string | null>("");
  const [hackerStatusColor, setHackerStatusColor] = useState<string>("");

  const { data: currentHackathon } =
    api.hackathon.getCurrentHackathon.useQuery();

  const { data: hacker, isError } = api.hacker.getHacker.useQuery(
    {},
    {
      initialData: data,
    },
  );

  const { data: hackathonData } = api.hackathon.getHackathon.useQuery({
    hackathonName: undefined,
  });

  function getStatusName(status: StatusKey) {
    if (!status) return "";
    return HACKER_STATUS_MAP[status].name;
  }

  function getStatusColor(status: StatusKey) {
    if (!status) return "";
    return HACKER_STATUS_MAP[status].color;
  }

  useEffect(() => {
    setHackerStatus(getStatusName(hacker?.status));
    setHackerStatusColor(getStatusColor(hacker?.status));
  }, [hacker]);

  if (isError) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        Something went wrong. Please refresh and try again.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-8 p-5 sm:p-7 lg:flex-row">
      {/* Left Section */}
      <div className="flex flex-1 flex-col gap-6">
        {/* Name and Status */}
        <div>
          {hacker?.firstName && hacker.lastName && (
            <div className="animate-fade-in pb-2 text-4xl font-bold">
              {hacker.firstName} {hacker.lastName}
            </div>
          )}
          <div className="animate-fade-in text-lg font-bold">
            Status for {hackathonData?.displayName}
          </div>
          <div className="flex gap-x-2">
            <div
              className={`text-xl font-bold ${hackerStatusColor} animate-fade-in`}
            >
              {hackerStatus}
            </div>
            {hackerStatus === "Confirmed" && (
              <CircleCheckBig
                className="animate-fade-in mt-[2px]"
                color="#00C9A7"
              />
            )}
          </div>
        </div>

        {/* QR Code Button */}
        <div className="flex items-center gap-4">
          <HackerQRCodePopup />
        </div>
      </div>

      {/* Right Section - Image */}
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-fade-in relative h-64 w-64 overflow-hidden rounded-lg">
          <Image
            src="/tk-dashboard-img.svg"
            alt="Image of TK"
            fill
            style={{ objectFit: "contain" }}
            priority
            sizes="100%"
          />
        </div>
      </div>
    </div>
  );
}
