CREATE TYPE "public"."company_review_state" AS ENUM('pending', 'approved', 'rejected', 'merged');--> statement-breakpoint
CREATE TYPE "public"."employment_experience_type" AS ENUM('internship', 'full_time', 'part_time', 'co_op', 'contract', 'fellowship', 'self_employed', 'other');--> statement-breakpoint
CREATE TYPE "public"."employment_state" AS ENUM('current', 'past', 'unknown');--> statement-breakpoint
CREATE TABLE "knight_hacks_company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"normalized_display_name" varchar(120) NOT NULL,
	"legal_name" varchar(120),
	"domain" varchar(253),
	"aliases" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"review_state" "company_review_state" DEFAULT 'pending' NOT NULL,
	"merged_into_company_id" uuid,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_company_normalized_display_name_unique" UNIQUE("normalized_display_name"),
	CONSTRAINT "knight_hacks_company_merged_state_consistency" CHECK (("knight_hacks_company"."review_state" = 'merged') = ("knight_hacks_company"."merged_into_company_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_employment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"title" varchar(120),
	"experience_type" "employment_experience_type",
	"state" "employment_state" NOT NULL,
	"start_month" varchar(7),
	"end_month" varchar(7),
	"city_key" varchar(8),
	"guild_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_employment_current_has_no_end" CHECK ("knight_hacks_employment"."state" <> 'current' OR "knight_hacks_employment"."end_month" IS NULL),
	CONSTRAINT "knight_hacks_employment_start_month_shape" CHECK ("knight_hacks_employment"."start_month" IS NULL OR "knight_hacks_employment"."start_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "knight_hacks_employment_end_month_shape" CHECK ("knight_hacks_employment"."end_month" IS NULL OR "knight_hacks_employment"."end_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "knight_hacks_employment_date_order" CHECK ("knight_hacks_employment"."start_month" IS NULL OR "knight_hacks_employment"."end_month" IS NULL OR "knight_hacks_employment"."end_month" >= "knight_hacks_employment"."start_month"),
	CONSTRAINT "knight_hacks_employment_city_key_shape" CHECK ("knight_hacks_employment"."city_key" IS NULL OR "knight_hacks_employment"."city_key" ~ '^[0-9]{2}-[0-9]{5}$')
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_member" ADD COLUMN "current_city_key" varchar(8);--> statement-breakpoint
ALTER TABLE "knight_hacks_member" ADD COLUMN "guild_location_visible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_company" ADD CONSTRAINT "knight_hacks_company_created_by_user_id_auth_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_company" ADD CONSTRAINT "knight_hacks_company_merged_into_fk" FOREIGN KEY ("merged_into_company_id") REFERENCES "public"."knight_hacks_company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_employment" ADD CONSTRAINT "knight_hacks_employment_member_id_knight_hacks_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."knight_hacks_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_employment" ADD CONSTRAINT "knight_hacks_employment_company_id_knight_hacks_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."knight_hacks_company"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_company_review_state_idx" ON "knight_hacks_company" USING btree ("review_state");--> statement-breakpoint
CREATE INDEX "knight_hacks_company_domain_idx" ON "knight_hacks_company" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "knight_hacks_company_created_by_user_idx" ON "knight_hacks_company" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_employment_member_idx" ON "knight_hacks_employment" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_employment_company_idx" ON "knight_hacks_employment" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_employment_company_state_idx" ON "knight_hacks_employment" USING btree ("company_id","state");--> statement-breakpoint
WITH raw_normalized_members AS (
	SELECT
		"id" AS "member_id",
		trim("company") AS "display_name",
		trim(
			regexp_replace(
				regexp_replace(lower(trim("company")), '[''’]', '', 'g'),
				'[^a-z0-9]+',
				' ',
				'g'
			)
		) AS "normalized_display_name"
	FROM "knight_hacks_member"
	WHERE "company" IS NOT NULL
		AND trim("company") <> ''
),
normalized_members AS (
	SELECT
		"member_id",
		CASE
			WHEN "normalized_display_name" = 'advanced micro devices' THEN 'AMD'
			ELSE "display_name"
		END AS "display_name",
		CASE
			WHEN "normalized_display_name" = 'advanced micro devices' THEN 'amd'
			ELSE "normalized_display_name"
		END AS "normalized_display_name",
		"display_name" AS "legacy_display_name"
	FROM raw_normalized_members
),
company_groups AS (
	SELECT
		"normalized_display_name",
		(array_agg("display_name" ORDER BY length("display_name"), "display_name"))[1] AS "display_name",
		array_agg(DISTINCT "legacy_display_name") AS "legacy_names"
	FROM normalized_members
	WHERE "normalized_display_name" <> ''
	GROUP BY "normalized_display_name"
)
INSERT INTO "knight_hacks_company" (
	"display_name",
	"normalized_display_name",
	"aliases",
	"review_state"
)
SELECT
	"display_name",
	"normalized_display_name",
	ARRAY(
		SELECT "legacy_name"
		FROM unnest("legacy_names") AS "legacy_name"
		WHERE "legacy_name" <> "display_name"
	),
	'approved'
FROM company_groups
ON CONFLICT ("normalized_display_name") DO NOTHING;--> statement-breakpoint
INSERT INTO "knight_hacks_employment" (
	"member_id",
	"company_id",
	"state",
	"guild_visible"
)
SELECT
	"knight_hacks_member"."id",
	"knight_hacks_company"."id",
	'unknown',
	true
FROM "knight_hacks_member"
INNER JOIN "knight_hacks_company"
	ON "knight_hacks_company"."normalized_display_name" = CASE
		WHEN trim(
			regexp_replace(
				regexp_replace(lower(trim("knight_hacks_member"."company")), '[''’]', '', 'g'),
				'[^a-z0-9]+',
				' ',
				'g'
			)
		) = 'advanced micro devices' THEN 'amd'
		ELSE trim(
			regexp_replace(
				regexp_replace(lower(trim("knight_hacks_member"."company")), '[''’]', '', 'g'),
				'[^a-z0-9]+',
				' ',
				'g'
			)
		)
	END
WHERE "knight_hacks_member"."company" IS NOT NULL
	AND trim("knight_hacks_member"."company") <> ''
	AND NOT EXISTS (
		SELECT 1
		FROM "knight_hacks_employment"
		WHERE "knight_hacks_employment"."member_id" = "knight_hacks_member"."id"
			AND "knight_hacks_employment"."company_id" = "knight_hacks_company"."id"
			AND "knight_hacks_employment"."state" = 'unknown'
	);
