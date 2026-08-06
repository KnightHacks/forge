"use client";

import { useHackerSession } from "@forge/hacker-sdk/react";

import { KhixJourney } from "../../_components/khix-dashboard";

export default function JourneyPage() {
  const session = useHackerSession();

  return <KhixJourney sessionUser={{ name: session.data?.displayName }} />;
}
