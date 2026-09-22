"use client";

import { useHackerSession } from "@forge/hacker-sdk/react";

import { KhixVenueMap } from "../../_components/khix-venue-map";

export default function MapPage() {
  const session = useHackerSession();
  return <KhixVenueMap sessionUser={{ name: session.data?.displayName }} />;
}
