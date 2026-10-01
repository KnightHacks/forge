import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import { and, asc, desc, eq, ilike, or, sql } from "@forge/db";
import { db } from "@forge/db/client";
import {
  Hackathon,
  Hacker,
  HackerAttendee,
  PointStoreItem,
  PointStorePurchase,
} from "@forge/db/schemas/knight-hacks";
import {
  pointStoreBalanceSchema,
  pointStoreHistorySchema,
  pointStoreImageSchema,
  pointStoreItemSchema,
  pointStorePurchaseSchema,
  pointStoreScopeSchema,
  pointStoreSearchSchema,
  pointStoreSettingsSchema,
  pointStoreVoidSchema,
} from "@forge/validators";

import { permProcedure } from "../trpc";
import { createAdminAuditEvent } from "../utils/audit/service";
import { requirePointStoreEdit } from "../utils/point-store/access";
import {
  removePointStoreImage,
  uploadPointStoreImage,
} from "../utils/point-store/images";
import {
  pointStoreBalance,
  pointStoreItems,
  pointStoreSettings,
} from "../utils/point-store/queries";

export const pointStoreRouter = {
  hackathons: permProcedure.query(async ({ ctx }) => {
    requirePointStoreEdit(ctx);
    return db
      .select({
        id: Hackathon.id,
        name: Hackathon.displayName,
        startDate: Hackathon.startDate,
      })
      .from(Hackathon)
      .orderBy(desc(Hackathon.startDate));
  }),
  workspace: permProcedure
    .input(pointStoreScopeSchema)
    .query(async ({ ctx, input }) => {
      requirePointStoreEdit(ctx);
      const [settings, items] = await Promise.all([
        pointStoreSettings(input.hackathonId),
        pointStoreItems(input.hackathonId, true),
      ]);
      return { settings, items };
    }),
  searchHackers: permProcedure
    .input(pointStoreSearchSchema)
    .query(async ({ ctx, input }) => {
      requirePointStoreEdit(ctx);
      if (!input.query) return [];
      const search = `%${input.query.replace(/[\\%_]/g, "\\$&")}%`;
      return db
        .select({
          id: HackerAttendee.id,
          firstName: Hacker.firstName,
          lastName: Hacker.lastName,
          email: Hacker.email,
        })
        .from(HackerAttendee)
        .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
        .where(
          and(
            eq(HackerAttendee.hackathonId, input.hackathonId),
            eq(HackerAttendee.status, "checkedin"),
            or(
              ilike(
                sql`concat(${Hacker.firstName}, ' ', ${Hacker.lastName})`,
                search,
              ),
              ilike(Hacker.email, search),
            ),
          ),
        )
        .orderBy(
          asc(Hacker.firstName),
          asc(Hacker.lastName),
          asc(HackerAttendee.id),
        )
        .limit(30);
    }),
  balance: permProcedure
    .input(pointStoreBalanceSchema)
    .query(({ ctx, input }) => {
      requirePointStoreEdit(ctx);
      return pointStoreBalance(input.hackathonId, input.attendeeId);
    }),
  history: permProcedure
    .input(pointStoreHistorySchema)
    .query(async ({ ctx, input }) => {
      requirePointStoreEdit(ctx);
      const rows = await db
        .select({
          id: PointStorePurchase.id,
          hackerName: PointStorePurchase.hackerName,
          itemName: PointStorePurchase.itemName,
          quantity: PointStorePurchase.quantity,
          unitPrice: PointStorePurchase.unitPrice,
          total: PointStorePurchase.total,
          actorName: PointStorePurchase.actorName,
          createdAt: PointStorePurchase.createdAt,
          voidedAt: PointStorePurchase.voidedAt,
          voidReason: PointStorePurchase.voidReason,
          voidedByName: PointStorePurchase.voidedByName,
          restocked: PointStorePurchase.restocked,
          canRestock: sql<boolean>`${PointStorePurchase.stockTracked} AND ${PointStoreItem.stock} IS NOT NULL`,
        })
        .from(PointStorePurchase)
        .innerJoin(
          PointStoreItem,
          eq(PointStoreItem.id, PointStorePurchase.itemId),
        )
        .where(eq(PointStorePurchase.hackathonId, input.hackathonId))
        .orderBy(
          desc(PointStorePurchase.createdAt),
          desc(PointStorePurchase.id),
        )
        .limit(51)
        .offset(input.offset);
      return { rows: rows.slice(0, 50), hasMore: rows.length > 50 };
    }),
  saveSettings: permProcedure
    .input(pointStoreSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      requirePointStoreEdit(ctx);
      return db.transaction(async (tx) => {
        const [hackathon] = await tx
          .update(Hackathon)
          .set({
            storeCatalogVisible: input.catalogVisible,
            storeOpen: input.open,
            storeLocation: input.location,
          })
          .where(eq(Hackathon.id, input.hackathonId))
          .returning({ id: Hackathon.id, name: Hackathon.displayName });
        if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });
        await createAdminAuditEvent(
          {
            actionKey: "point_store.settings_updated",
            actor: ctx.session.user,
            metadata: {
              catalogVisible: input.catalogVisible,
              open: input.open,
              location: input.location,
            },
            subjects: [
              {
                relation: "primary",
                targetType: "hackathon",
                targetId: hackathon.id,
                targetLabel: hackathon.name,
              },
            ],
          },
          tx,
        );
        return { id: hackathon.id };
      });
    }),
  saveItem: permProcedure
    .input(pointStoreItemSchema)
    .mutation(async ({ ctx, input }) => {
      requirePointStoreEdit(ctx);
      const { id, revision, ...fields } = input;
      await pointStoreSettings(input.hackathonId);
      return db.transaction(async (tx) => {
        const values = {
          ...fields,
          soldOut: fields.stock === null && fields.soldOut,
        };
        const [item] = id
          ? await tx
              .update(PointStoreItem)
              .set({ ...values, revision: sql`${PointStoreItem.revision} + 1` })
              .where(
                and(
                  eq(PointStoreItem.id, id),
                  eq(PointStoreItem.hackathonId, input.hackathonId),
                  eq(PointStoreItem.revision, revision ?? 0),
                ),
              )
              .returning({
                id: PointStoreItem.id,
                revision: PointStoreItem.revision,
              })
          : await tx.insert(PointStoreItem).values(values).returning({
              id: PointStoreItem.id,
              revision: PointStoreItem.revision,
            });
        if (!item)
          throw new TRPCError({
            code: "CONFLICT",
            message: "This item changed. Refresh before editing it again.",
          });
        await createAdminAuditEvent(
          {
            actionKey: "point_store.item_saved",
            actor: ctx.session.user,
            metadata: {
              hackathonId: input.hackathonId,
              price: input.price,
              stock: input.stock,
              soldOut: values.soldOut,
              archived: input.archived,
            },
            subjects: [
              {
                relation: "primary",
                targetType: "point_store_item",
                targetId: item.id,
                targetLabel: input.name,
              },
            ],
          },
          tx,
        );
        return item;
      });
    }),
  setImage: permProcedure
    .input(pointStoreImageSchema)
    .mutation(async ({ ctx, input }) => {
      requirePointStoreEdit(ctx);
      const [item] = await db
        .select({
          id: PointStoreItem.id,
          name: PointStoreItem.name,
          imageObjectName: PointStoreItem.imageObjectName,
          revision: PointStoreItem.revision,
        })
        .from(PointStoreItem)
        .where(
          and(
            eq(PointStoreItem.id, input.itemId),
            eq(PointStoreItem.hackathonId, input.hackathonId),
          ),
        );
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      if (item.revision !== input.revision)
        throw new TRPCError({
          code: "CONFLICT",
          message: "This item changed. Refresh before uploading.",
        });
      // Storage is outside the transaction. A rejected revision removes the new object.
      const imageObjectName =
        input.fileContent === null
          ? null
          : await uploadPointStoreImage(
              item.id,
              input.fileContent,
              input.fileName,
            );
      try {
        await db.transaction(async (tx) => {
          const [updated] = await tx
            .update(PointStoreItem)
            .set({
              imageObjectName,
              revision: sql`${PointStoreItem.revision} + 1`,
            })
            .where(
              and(
                eq(PointStoreItem.id, item.id),
                eq(PointStoreItem.revision, input.revision),
              ),
            )
            .returning({ id: PointStoreItem.id });
          if (!updated)
            throw new TRPCError({
              code: "CONFLICT",
              message: "This item changed. Refresh and try again.",
            });
          await createAdminAuditEvent(
            {
              actionKey: "point_store.image_updated",
              actor: ctx.session.user,
              metadata: { removed: imageObjectName === null },
              subjects: [
                {
                  relation: "primary",
                  targetType: "point_store_item",
                  targetId: item.id,
                  targetLabel: item.name,
                },
              ],
            },
            tx,
          );
        });
      } catch (error) {
        await removePointStoreImage(imageObjectName);
        throw error;
      }
      await removePointStoreImage(item.imageObjectName);
      return { id: item.id };
    }),
  purchase: permProcedure
    .input(pointStorePurchaseSchema)
    .mutation(async ({ ctx, input }) => {
      requirePointStoreEdit(ctx);
      return db.transaction(async (tx) => {
        // Every spend/void locks the attendee first, then the item. Point awards
        // also lock this row, so all balance decisions see committed earnings.
        const [attendee] = await tx
          .select({
            id: HackerAttendee.id,
            status: HackerAttendee.status,
            firstName: Hacker.firstName,
            lastName: Hacker.lastName,
          })
          .from(HackerAttendee)
          .innerJoin(Hacker, eq(Hacker.id, HackerAttendee.hackerId))
          .where(
            and(
              eq(HackerAttendee.id, input.attendeeId),
              eq(HackerAttendee.hackathonId, input.hackathonId),
            ),
          )
          .for("update", { of: HackerAttendee });
        if (!attendee)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Hacker not found in this hackathon.",
          });
        const [existing] = await tx
          .select()
          .from(PointStorePurchase)
          .where(eq(PointStorePurchase.id, input.id));
        if (existing) {
          if (
            existing.hackathonId !== input.hackathonId ||
            existing.attendeeId !== input.attendeeId ||
            existing.itemId !== input.itemId ||
            existing.quantity !== input.quantity ||
            existing.unitPrice !== input.unitPrice
          )
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "This purchase ID was already used for another transaction.",
            });
          return { id: existing.id };
        }
        if (attendee.status !== "checkedin")
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Only checked-in hackers can purchase items.",
          });
        const [item] = await tx
          .select()
          .from(PointStoreItem)
          .where(
            and(
              eq(PointStoreItem.id, input.itemId),
              eq(PointStoreItem.hackathonId, input.hackathonId),
            ),
          )
          .for("update");
        if (!item || item.archived)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "This item is no longer available.",
          });
        if (item.price !== input.unitPrice)
          throw new TRPCError({
            code: "CONFLICT",
            message: "The price changed. Refresh and review the new total.",
          });
        if (item.stock === null ? item.soldOut : item.stock < input.quantity)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "There is not enough stock for this purchase.",
          });
        const balance = await pointStoreBalance(
          input.hackathonId,
          input.attendeeId,
          tx,
        );
        const total = item.price * input.quantity;
        if (total > balance.available)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This hacker does not have enough spending power.",
          });
        await tx.insert(PointStorePurchase).values({
          id: input.id,
          hackathonId: input.hackathonId,
          attendeeId: input.attendeeId,
          itemId: item.id,
          itemName: item.name,
          hackerName: `${attendee.firstName} ${attendee.lastName}`,
          unitPrice: item.price,
          quantity: input.quantity,
          total,
          stockTracked: item.stock !== null,
          actorId: ctx.session.user.id,
          actorName: ctx.session.user.name,
        });
        if (item.stock !== null)
          await tx
            .update(PointStoreItem)
            .set({
              stock: item.stock - input.quantity,
              revision: sql`${PointStoreItem.revision} + 1`,
            })
            .where(eq(PointStoreItem.id, item.id));
        await createAdminAuditEvent(
          {
            actionKey: "point_store.purchased",
            actor: ctx.session.user,
            metadata: {
              hackathonId: input.hackathonId,
              itemId: item.id,
              quantity: input.quantity,
              total,
            },
            subjects: [
              {
                relation: "primary",
                targetType: "point_store_purchase",
                targetId: input.id,
                targetLabel: item.name,
              },
              {
                relation: "secondary",
                targetType: "hacker_attendee",
                targetId: attendee.id,
                targetLabel: `${attendee.firstName} ${attendee.lastName}`,
              },
            ],
          },
          tx,
        );
        return { id: input.id };
      });
    }),
  voidPurchase: permProcedure
    .input(pointStoreVoidSchema)
    .mutation(async ({ ctx, input }) => {
      requirePointStoreEdit(ctx);
      return db.transaction(async (tx) => {
        const [initial] = await tx
          .select({ attendeeId: PointStorePurchase.attendeeId })
          .from(PointStorePurchase)
          .where(
            and(
              eq(PointStorePurchase.id, input.id),
              eq(PointStorePurchase.hackathonId, input.hackathonId),
            ),
          );
        if (!initial) throw new TRPCError({ code: "NOT_FOUND" });
        if (initial.attendeeId)
          await tx
            .select({ id: HackerAttendee.id })
            .from(HackerAttendee)
            .where(eq(HackerAttendee.id, initial.attendeeId))
            .for("update");
        const [purchase] = await tx
          .select()
          .from(PointStorePurchase)
          .where(
            and(
              eq(PointStorePurchase.id, input.id),
              eq(PointStorePurchase.hackathonId, input.hackathonId),
            ),
          )
          .for("update");
        if (!purchase) throw new TRPCError({ code: "NOT_FOUND" });
        if (purchase.voidedAt) return { id: purchase.id };
        const [item] = await tx
          .select()
          .from(PointStoreItem)
          .where(eq(PointStoreItem.id, purchase.itemId))
          .for("update");
        if (!item) throw new TRPCError({ code: "NOT_FOUND" });
        if (input.restock && (!purchase.stockTracked || item.stock === null))
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "This purchase cannot be restocked because inventory was or is untracked.",
          });
        if (input.restock && item.stock !== null) {
          if (item.stock + purchase.quantity > 1_000_000)
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Restocking would exceed the inventory limit.",
            });
          await tx
            .update(PointStoreItem)
            .set({
              stock: item.stock + purchase.quantity,
              revision: sql`${PointStoreItem.revision} + 1`,
            })
            .where(eq(PointStoreItem.id, item.id));
        }
        await tx
          .update(PointStorePurchase)
          .set({
            voidedAt: new Date(),
            voidedBy: ctx.session.user.id,
            voidedByName: ctx.session.user.name,
            voidReason: input.reason,
            restocked: input.restock,
          })
          .where(eq(PointStorePurchase.id, purchase.id));
        await createAdminAuditEvent(
          {
            actionKey: "point_store.voided",
            actor: ctx.session.user,
            metadata: {
              reason: input.reason,
              restocked: input.restock,
              total: purchase.total,
            },
            subjects: [
              {
                relation: "primary",
                targetType: "point_store_purchase",
                targetId: purchase.id,
                targetLabel: purchase.itemName,
              },
            ],
          },
          tx,
        );
        return { id: purchase.id };
      });
    }),
} satisfies TRPCRouterRecord;
