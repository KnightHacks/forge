ALTER TABLE "knight_hacks_dues_payment" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_dues_payment" ADD COLUMN "stripe_payment_intent_id" varchar(255);--> statement-breakpoint
UPDATE "knight_hacks_dues_payment" SET "amount" = 2500 WHERE "amount" = 25;--> statement-breakpoint
ALTER TABLE "knight_hacks_dues_payment" ADD CONSTRAINT "knight_hacks_dues_payment_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id");
