import { TRPCError } from "@trpc/server";

import { and, asc, eq, isNull, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  HackerAttendee,
  PointStoreItem,
  PointStorePurchase,
} from "@forge/db/schemas/knight-hacks";

import type { WriteDb } from "../db";
import { pointStoreImageUrl } from "./images";

export async function pointStoreSettings(hackathonId: string) {
  const [settings] = await db
    .select({
      catalogVisible: Hackathon.storeCatalogVisible,
      open: Hackathon.storeOpen,
      location: Hackathon.storeLocation,
    })
    .from(Hackathon)
    .where(eq(Hackathon.id, hackathonId));
  if (!settings)
    throw new TRPCError({ code: "NOT_FOUND", message: "Hackathon not found." });
  return settings;
}

export async function pointStoreBalance(
  hackathonId: string,
  attendeeId: string,
  client: WriteDb = db,
) {
  const [attendee] = await client
    .select({ points: HackerAttendee.points })
    .from(HackerAttendee)
    .where(
      and(
        eq(HackerAttendee.id, attendeeId),
        eq(HackerAttendee.hackathonId, hackathonId),
      ),
    );
  if (!attendee)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Hacker not found in this hackathon.",
    });
  const [result] = await client
    .select({
      spent: sql<number>`coalesce(sum(${PointStorePurchase.total}), 0)`.mapWith(
        Number,
      ),
    })
    .from(PointStorePurchase)
    .where(
      and(
        eq(PointStorePurchase.attendeeId, attendeeId),
        eq(PointStorePurchase.hackathonId, hackathonId),
        isNull(PointStorePurchase.voidedAt),
      ),
    );
  const earned = Math.max(0, attendee.points);
  const spent = result?.spent ?? 0;
  return { earned, spent, available: Math.max(0, earned - spent) };
}

export async function pointStoreItems(
  hackathonId: string,
  includeArchived = false,
) {
  const items = await db
    .select()
    .from(PointStoreItem)
    .where(
      and(
        eq(PointStoreItem.hackathonId, hackathonId),
        includeArchived ? undefined : eq(PointStoreItem.archived, false),
      ),
    )
    .orderBy(
      asc(PointStoreItem.archived),
      asc(PointStoreItem.name),
      asc(PointStoreItem.id),
    );
  return Promise.all(
    items.map(async (item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      stock: item.stock,
      soldOut: item.stock === null ? item.soldOut : item.stock === 0,
      archived: item.archived,
      revision: item.revision,
      imageUrl: await pointStoreImageUrl(item.imageObjectName),
    })),
  );
}
