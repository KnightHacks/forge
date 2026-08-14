CREATE TABLE "knight_hacks_dues_entitlement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"source_payment_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_dues_entitlement_memberId_year_unique" UNIQUE("member_id","year"),
	CONSTRAINT "knight_hacks_dues_entitlement_source_payment_id_unique" UNIQUE("source_payment_id")
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_dues_payment" DROP CONSTRAINT "knight_hacks_dues_payment_memberId_year_unique";--> statement-breakpoint
ALTER TABLE "knight_hacks_dues_entitlement" ADD CONSTRAINT "knight_hacks_dues_entitlement_member_id_knight_hacks_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."knight_hacks_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_dues_entitlement" ADD CONSTRAINT "knight_hacks_dues_entitlement_source_payment_id_knight_hacks_dues_payment_id_fk" FOREIGN KEY ("source_payment_id") REFERENCES "public"."knight_hacks_dues_payment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Legacy Blade stored the UTC calendar year. Normalize January-July payments
-- to the academic year that began the previous August before backfilling.
UPDATE "knight_hacks_dues_payment"
SET "year" = "year" - 1
WHERE "year" = extract(year FROM "payment_date")::integer
	AND extract(month FROM "payment_date") < 8;--> statement-breakpoint
INSERT INTO "knight_hacks_dues_entitlement" (
	"member_id",
	"year",
	"active",
	"source_payment_id",
	"created_at",
	"updated_at"
)
SELECT
	"member_id",
	"year",
	bool_or("active"),
	(array_agg("id" ORDER BY "active" DESC, "payment_date" DESC, "id"))[1],
	min("payment_date"),
	max("payment_date")
FROM "knight_hacks_dues_payment"
GROUP BY "member_id", "year";--> statement-breakpoint
ALTER TABLE "knight_hacks_dues_payment" DROP COLUMN "active";
