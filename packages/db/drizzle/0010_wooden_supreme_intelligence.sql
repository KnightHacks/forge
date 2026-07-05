ALTER TABLE "knight_hacks_hackathon" ADD COLUMN "portal_base_url" varchar(512);--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon" ADD COLUMN "confirmation_capacity" integer;--> statement-breakpoint
UPDATE "knight_hacks_hackathon"
SET
  "portal_base_url" = 'https://bloom.knighthacks.org',
  "confirmation_capacity" = 1100
WHERE "name" = 'bloomknights';
