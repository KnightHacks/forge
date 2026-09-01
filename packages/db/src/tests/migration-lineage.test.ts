import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migrationsDirectory = new URL("../../drizzle/", import.meta.url);
const metadataDirectory = new URL("../../drizzle/meta/", import.meta.url);

const PRODUCTION_MAIN_MIGRATION = {
  createdAt: 1783110594620,
  file: "0010_wooden_supreme_intelligence.sql",
  hash: "a620ea7e117ff3305c25d2acd1ac8f84ae504b838ec93c45791ee1aab3fc7d01",
} as const;

const REBASED_MIGRATION_HASHES = {
  "0011_silent_toxin.sql":
    "ada3c22b60707ccc1e02380b71ee4027084a08e5ea6d2cbe7ea6984195234123",
  "0012_bouncy_frightful_four.sql":
    "0b21531837f8631948c64242cf2a13df1560989eb15bddc216d27def9d272365",
  "0013_marvelous_patriot.sql":
    "472e47c8c598a2f05c73a6a84bd5f22688e3c21d20f0acbf433b6ac36bfc1f39",
  "0014_outgoing_betty_brant.sql":
    "172608635798b594c5a96330115ab2213b643b84c2820d27f8cd014ffac7eb7d",
  "0015_serious_stryfe.sql":
    "7668f341bddd22f400e0f94c3a7f2827c13367f18532f9915762190fce8dadf7",
  "0016_forms_response_indexes.sql":
    "1c74c375cbe097d94181f7e8ac67a587e002f7295be4fdd417bed96f4121383a",
  "0017_breezy_sphinx.sql":
    "5dcb56610a68c9e6e3b71ca29c7e68da026b6e8e4ed520223b17b4d66d911fbe",
  "0018_nice_vulture.sql":
    "f6fb797af4e048114d2c09340318de8b8ccd865b502cf3408dfc7dd2373e2cd7",
  "0019_guild_career_network.sql":
    "e4231114f746eca51cb75f16d4caeed3ba6a793d7b6da126c940e8fe56776966",
  "0020_panoramic_silk_fever.sql":
    "faea203c042f34a4a782fac4b1fda61fee9b3a13d4cd2a27f5c91b83e71fc56f",
  "0021_superb_cannonball.sql":
    "3d45763e7fc081a2d48558c07bb702a1a0e43070ab4bedfc0d9f30c1f35f6bca",
  "0022_confused_the_enforcers.sql":
    "7fa36c41eeb8a9cf71ed3916a8417a942a6deb0285ca802b577ed1cef651c7bf",
  "0023_amazing_morgan_stark.sql":
    "f52fc540677105f6d0076e252b2759ae92c9b4de8428dabb05679ef2ae1554e6",
  "0024_email_manual_exclusions.sql":
    "ade45dcd24dca946172d31218834bb060c3a2e48028cd940c27c7264c9065fb6",
  "0025_fat_wasp.sql":
    "2ac6e4021e1e64a4ecbfda78341ce7c49c97befdd9c95997a9609f11e480687a",
  "0026_broad_amazoness.sql":
    "bfbf9bce7c9cc33aa4b94e881789154438aa94ce2be8e5616a97c94883e42335",
  "0027_cute_sersi.sql":
    "6314651c5573099c5ccec37a99d145f7af215acb363a8f40eda2854837768433",
  "0028_worried_monster_badoon.sql":
    "978e097163cc1774e8a0c305ddc5bf07071d420491965a47e2bb3be4a051f5b2",
  "0029_fat_guardsmen.sql":
    "e660584e6246398360544f719f67f54d13d91078f6c1dd7d6d744e3ac19af924",
  "0030_backfill_email_template_domain.sql":
    "f5dbf6f167a5f8ec69f3a1b95fc28f99cdf04f7199bee4934ddee6f234c4576f",
  "0031_peaceful_mattie_franklin.sql":
    "a64c4cc357cb5c5921d99900f20052b780e37fa6fb5ef5a4dc7f389c2c604110",
  "0032_amused_steve_rogers.sql":
    "b050ae0a2fe53226010ce0fbbb0ae865e3be4fcc6d9d1c0e5d893683cf0d9672",
  "0033_puzzling_smasher.sql":
    "5d0c292d7ba364ef9523733cce4d86c47ff339d0d9afc06468bc723cbb5a71f8",
  "0034_dry_shriek.sql":
    "6a8a7b342612d47bbc45462a2c1b65ed829b161aa0e60e3e3d4d96c9d91c4440",
  "0035_narrow_tattoo.sql":
    "b3cbf6df8ccf1cd67c3715ea915e6860c756e9e0620bba6dce9e24356847fca5",
  "0036_motionless_captain_britain.sql":
    "0eb8aee59a9ba1e2acdc206a3bc10e12ed65c2fae5402012652a8260cdf52a7f",
  "0037_sudden_slyde.sql":
    "2aa00c4ac92a9ccd76f521bc4d017309de78e0d87126006c410d1b82ba4f525d",
  "0038_left_nocturne.sql":
    "b9e3600ea9ef590ea8aaa9accfa5447fc4f12d89d40800e22c9e98da36d370d7",
} as const;

interface JournalEntry {
  idx: number;
  tag: string;
  when: number;
}

interface Snapshot {
  id: string;
  prevId: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

describe("canonical production migration lineage", () => {
  it("retains production main 0010 and every rebased migration byte-for-byte", async () => {
    const productionSql = await readFile(
      new URL(PRODUCTION_MAIN_MIGRATION.file, migrationsDirectory),
      "utf8",
    );
    expect(sha256(productionSql)).toBe(PRODUCTION_MAIN_MIGRATION.hash);

    for (const [file, expectedHash] of Object.entries(
      REBASED_MIGRATION_HASHES,
    )) {
      const sql = await readFile(new URL(file, migrationsDirectory), "utf8");
      expect(sha256(sql), file).toBe(expectedHash);
    }
  });

  it("has one ordered journal entry and one linear snapshot for every migration", async () => {
    const journal = JSON.parse(
      await readFile(new URL("_journal.json", metadataDirectory), "utf8"),
    ) as { entries: JournalEntry[] };

    expect(journal.entries).toHaveLength(42);
    expect(journal.entries[10]).toMatchObject({
      idx: 10,
      tag: "0010_wooden_supreme_intelligence",
      when: PRODUCTION_MAIN_MIGRATION.createdAt,
    });
    expect(journal.entries.at(-1)).toMatchObject({
      idx: 41,
      tag: "0041_salty_bastion",
    });

    for (const [position, entry] of journal.entries.entries()) {
      expect(entry.idx).toBe(position);
      if (position > 0) {
        const previousEntry = journal.entries.at(position - 1);
        if (!previousEntry)
          throw new Error("Previous journal entry is missing.");
        expect(entry.when).toBeGreaterThan(previousEntry.when);
      }

      const prefix = String(position).padStart(4, "0");
      expect(entry.tag.startsWith(`${prefix}_`)).toBe(true);
      await expect(
        readFile(new URL(`${entry.tag}.sql`, migrationsDirectory), "utf8"),
      ).resolves.toBeTypeOf("string");

      const snapshot = JSON.parse(
        await readFile(
          new URL(`${prefix}_snapshot.json`, metadataDirectory),
          "utf8",
        ),
      ) as Snapshot;
      if (position > 0) {
        const previousPrefix = String(position - 1).padStart(4, "0");
        const previous = JSON.parse(
          await readFile(
            new URL(`${previousPrefix}_snapshot.json`, metadataDirectory),
            "utf8",
          ),
        ) as Snapshot;
        expect(snapshot.prevId).toBe(previous.id);
      }
    }
  });
});
