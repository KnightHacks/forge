import { describe, expect, it } from "vitest";

import { DISCORD } from "@forge/consts";
import { discordConfigUpdateSchema } from "@forge/validators";

const draft = {
  description: "Optional Career source-failure alerts.",
  developmentId: "",
  key: "career_source_health_channel",
  label: "Career source-health alert channel",
  productionId: "",
};

describe("TC-648-009: optional Career configuration validation", () => {
  it.each(["", "   ", null])(
    "normalizes an unset failure destination (%s) to null",
    (productionId) => {
      expect(
        discordConfigUpdateSchema.parse({ ...draft, productionId }),
      ).toMatchObject({
        productionId: null,
        developmentId: null,
      });
    },
  );

  it("trims real IDs and allows a development-only failure destination", () => {
    expect(
      discordConfigUpdateSchema.parse({
        ...draft,
        productionId: " 999999999999999999 ",
      }).productionId,
    ).toBe("999999999999999999");
    expect(
      discordConfigUpdateSchema.parse({
        ...draft,
        developmentId: " 888888888888888888 ",
      }),
    ).toMatchObject({
      productionId: null,
      developmentId: "888888888888888888",
    });
  });

  it("rejects empty production IDs for every required setting with a field error", () => {
    for (const key of DISCORD.CONFIG_KEYS.filter(
      (key) => key !== "career_source_health_channel",
    )) {
      for (const productionId of ["", "  ", null]) {
        const parsed = discordConfigUpdateSchema.safeParse({
          ...draft,
          key,
          productionId,
        });
        expect(parsed.success, key).toBe(false);
        if (!parsed.success)
          expect(parsed.error.issues[0]?.path).toEqual(["productionId"]);
      }
    }
  });

  it.each(["123", "<@&1537949002031562862>", "1537949209867583499x"])(
    "rejects malformed optional IDs (%s)",
    (productionId) => {
      expect(
        discordConfigUpdateSchema.safeParse({ ...draft, productionId }).success,
      ).toBe(false);
    },
  );

  it("rejects omitted fields and attempts to change the key's kind", () => {
    const { productionId: _productionId, ...missingProduction } = draft;
    expect(discordConfigUpdateSchema.safeParse(missingProduction).success).toBe(
      false,
    );
    expect(
      discordConfigUpdateSchema.safeParse({ ...draft, kind: "role" }).success,
    ).toBe(false);
  });
});
