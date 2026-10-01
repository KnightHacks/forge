import { z } from "zod";

import { IMAGE_UPLOAD_POLICY, maxDataUrlLength } from "./upload-policy";

export const pointStoreScopeSchema = z
  .object({ hackathonId: z.string().uuid() })
  .strict();
export const pointStoreSettingsSchema = pointStoreScopeSchema.extend({
  catalogVisible: z.boolean(),
  open: z.boolean(),
  location: z.string().trim().max(240),
});
export const pointStoreItemSchema = pointStoreScopeSchema
  .extend({
    id: z.string().uuid().optional(),
    revision: z.number().int().positive().optional(),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000),
    price: z.number().int().min(0).max(1_000_000),
    stock: z.number().int().min(0).max(1_000_000).nullable(),
    soldOut: z.boolean(),
    archived: z.boolean(),
  })
  .refine(
    (value) => Boolean(value.id) === Boolean(value.revision),
    "An existing item requires its revision.",
  );
export const pointStoreImageSchema = pointStoreScopeSchema.extend({
  itemId: z.string().uuid(),
  revision: z.number().int().positive(),
  fileContent: z.string().max(maxDataUrlLength(IMAGE_UPLOAD_POLICY)).nullable(),
  fileName: z.string().min(1).max(255).optional(),
});
export const pointStoreSearchSchema = pointStoreScopeSchema.extend({
  query: z.string().trim().max(120),
});
export const pointStoreBalanceSchema = pointStoreScopeSchema.extend({
  attendeeId: z.string().uuid(),
});
export const pointStoreHistorySchema = pointStoreScopeSchema.extend({
  offset: z.number().int().min(0).default(0),
});
export const pointStorePurchaseSchema = pointStoreBalanceSchema.extend({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(1000),
  unitPrice: z.number().int().min(0).max(1_000_000),
});
export const pointStoreVoidSchema = pointStoreScopeSchema.extend({
  id: z.string().uuid(),
  restock: z.boolean(),
  reason: z.string().trim().min(1).max(500),
});
export const pointStoreCatalogDtoSchema = z
  .object({
    catalogVisible: z.boolean(),
    open: z.boolean(),
    location: z.string(),
    earned: z.number().int().min(0),
    spent: z.number().int().min(0),
    available: z.number().int().min(0),
    items: z.array(
      z
        .object({
          id: z.string().uuid(),
          name: z.string(),
          description: z.string(),
          price: z.number().int().min(0),
          stock: z.number().int().min(0).nullable(),
          soldOut: z.boolean(),
          imageUrl: z.string().url().nullable(),
        })
        .strict(),
    ),
  })
  .strict();
