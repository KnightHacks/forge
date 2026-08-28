"use client";

import { useHackerSession } from "@forge/hacker-sdk/react";

import { KhixEvents } from "../../_components/khix-dashboard";

export default function EventsPage() {
  const session = useHackerSession();
  return <KhixEvents sessionUser={{ name: session.data?.displayName }} />;
}
