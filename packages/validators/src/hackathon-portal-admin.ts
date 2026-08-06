import { z } from "zod";

export const productionPortalOriginSchema = z
  .string()
  .trim()
  .max(2_048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        url.port === "" &&
        url.pathname === "/" &&
        url.search === "" &&
        url.hash === "" &&
        /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.knighthacks\.org$/.test(url.hostname)
      );
    } catch {
      return false;
    }
  }, "Use an exact HTTPS Knight Hacks subdomain origin without a path or port.");

export const hackathonPortalConfigInputSchema = z
  .object({ hackathonId: z.string().uuid() })
  .strict();

export const hackathonPortalClientUpsertSchema = z
  .object({
    enabled: z.boolean(),
    hackathonId: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    productionOrigin: productionPortalOriginSchema,
  })
  .strict();

export const hackathonAgreementDefinitionCreateSchema = z
  .object({
    active: z.boolean(),
    hackathonId: z.string().uuid(),
    key: z.string().trim().min(1).max(64),
    legalText: z.string().trim().min(1).nullable().optional(),
    required: z.boolean(),
    stage: z.enum(["application", "confirmation"]),
    title: z.string().trim().min(1).max(255),
    url: z.string().trim().url().max(2_048).nullable().optional(),
    version: z.string().trim().min(1).max(64),
  })
  .strict()
  .refine(
    (definition) => Boolean(definition.legalText) || Boolean(definition.url),
    {
      message: "Agreement legal text or URL is required.",
      path: ["legalText"],
    },
  );

export const hackathonAgreementSetActiveSchema = z
  .object({
    active: z.boolean(),
    definitionId: z.string().uuid(),
    hackathonId: z.string().uuid(),
  })
  .strict();
