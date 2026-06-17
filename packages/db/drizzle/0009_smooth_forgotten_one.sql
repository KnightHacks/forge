UPDATE "knight_hacks_hacker" SET "phone_number" = '' WHERE "phone_number" IS NULL;
ALTER TABLE "knight_hacks_hacker" ALTER COLUMN "phone_number" SET NOT NULL;