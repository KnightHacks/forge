"use client";

import { useHackerSession } from "@forge/hacker-sdk/react";

import { KhixDashboard } from "../_components/khix-dashboard";

export default function DashboardPage() {
  const session = useHackerSession();
  return <KhixDashboard sessionUser={{ name: session.data?.displayName }} />;
}
