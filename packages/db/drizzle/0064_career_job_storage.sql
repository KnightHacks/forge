CREATE TYPE "public"."job_alert_target_kind" AS ENUM('company', 'location');--> statement-breakpoint
CREATE TYPE "public"."job_application_stage" AS ENUM('saved', 'applied', 'online_assessment', 'recruiter_screen', 'interviewing', 'final_round', 'offer', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."job_application_visibility" AS ENUM('community', 'private');--> statement-breakpoint
CREATE TYPE "public"."job_category" AS ENUM('swe', 'data_ai', 'pm', 'it_security', 'quant', 'analyst', 'hardware', 'design', 'other');--> statement-breakpoint
CREATE TYPE "public"."job_delivery_state" AS ENUM('pending', 'sending', 'sent', 'uncertain', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."job_location_kind" AS ENUM('city', 'state', 'remote_us', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."job_track" AS ENUM('internship', 'new_grad');--> statement-breakpoint
CREATE TYPE "public"."job_work_arrangement" AS ENUM('onsite', 'hybrid', 'remote');--> statement-breakpoint
CREATE TABLE "knight_hacks_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_key" text NOT NULL,
	"identity_hash" text GENERATED ALWAYS AS (encode(sha256(decode(replace("identity_key", chr(92), chr(92) || chr(92)), 'escape')), 'hex')) STORED NOT NULL,
	"company_id" uuid,
	"company_label" varchar(200) NOT NULL,
	"company_key" varchar(120) NOT NULL,
	"title" text NOT NULL,
	"track" "job_track" NOT NULL,
	"category" "job_category",
	"apply_url" text NOT NULL,
	"description" text,
	"compensation" text,
	"work_arrangement" "job_work_arrangement",
	"posted_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"inactive_at" timestamp with time zone,
	"delivery_state" "job_delivery_state" DEFAULT 'suppressed' NOT NULL,
	"delivery_track" "job_track",
	"discord_channel_id" varchar(20),
	"discord_message_id" varchar(20),
	"delivered_at" timestamp with time zone,
	"delivery_claim_token" uuid,
	"delivery_lease_expires_at" timestamp with time zone,
	"delivery_next_attempt_at" timestamp with time zone,
	"delivery_attempts" integer DEFAULT 0 NOT NULL,
	"delivery_error" text,
	CONSTRAINT "knight_hacks_job_identity_unique" UNIQUE("identity_hash"),
	CONSTRAINT "knight_hacks_job_discord_message_unique" UNIQUE("discord_message_id"),
	CONSTRAINT "knight_hacks_job_values_check" CHECK ("knight_hacks_job"."identity_key" ~ '[^[:space:]]' AND "knight_hacks_job"."company_label" ~ '[^[:space:]]' AND "knight_hacks_job"."company_key" ~ '[^[:space:]]' AND "knight_hacks_job"."title" ~ '[^[:space:]]' AND "knight_hacks_job"."apply_url" ~ '^https?://' AND "knight_hacks_job"."delivery_attempts" >= 0),
	CONSTRAINT "knight_hacks_job_dates_check" CHECK ("knight_hacks_job"."last_seen_at" >= "knight_hacks_job"."first_seen_at" AND ("knight_hacks_job"."active" = ("knight_hacks_job"."inactive_at" IS NULL))),
	CONSTRAINT "knight_hacks_job_channel_check" CHECK ("knight_hacks_job"."discord_channel_id" IS NULL OR "knight_hacks_job"."discord_channel_id" ~ '^[0-9]{17,20}$'),
	CONSTRAINT "knight_hacks_job_message_check" CHECK ("knight_hacks_job"."discord_message_id" IS NULL OR "knight_hacks_job"."discord_message_id" ~ '^[0-9]{17,20}$'),
	CONSTRAINT "knight_hacks_job_lease_check" CHECK (("knight_hacks_job"."delivery_claim_token" IS NULL) = ("knight_hacks_job"."delivery_lease_expires_at" IS NULL)),
	CONSTRAINT "knight_hacks_job_destination_check" CHECK ("knight_hacks_job"."delivery_state" = 'suppressed' OR ("knight_hacks_job"."discord_channel_id" IS NOT NULL AND "knight_hacks_job"."delivery_track" IS NOT NULL)),
	CONSTRAINT "knight_hacks_job_receipt_check" CHECK (("knight_hacks_job"."delivery_state" = 'sent') = ("knight_hacks_job"."discord_message_id" IS NOT NULL AND "knight_hacks_job"."delivered_at" IS NOT NULL) AND ("knight_hacks_job"."discord_message_id" IS NULL) = ("knight_hacks_job"."delivered_at" IS NULL)),
	CONSTRAINT "knight_hacks_job_sending_check" CHECK ("knight_hacks_job"."delivery_state" <> 'sending' OR "knight_hacks_job"."delivery_claim_token" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_job_alert_preference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"track" "job_track" NOT NULL,
	"kind" "job_alert_target_kind" NOT NULL,
	"target_key" varchar(120) NOT NULL,
	"custom_value" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_job_alert_member_target_unique" UNIQUE("member_id","track","kind","target_key"),
	CONSTRAINT "knight_hacks_job_alert_values_check" CHECK ("knight_hacks_job_alert_preference"."target_key" ~ '[^[:space:]]' AND ("knight_hacks_job_alert_preference"."custom_value" IS NULL OR "knight_hacks_job_alert_preference"."custom_value" ~ '[^[:space:]]'))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_job_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"stage" "job_application_stage" DEFAULT 'saved' NOT NULL,
	"round" integer,
	"visibility" "job_application_visibility" DEFAULT 'community' NOT NULL,
	"private_notes" varchar(2000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_job_application_member_job_unique" UNIQUE("member_id","job_id"),
	CONSTRAINT "knight_hacks_job_application_round_check" CHECK ("knight_hacks_job_application"."round" IS NULL OR ("knight_hacks_job_application"."stage" = 'interviewing' AND "knight_hacks_job_application"."round" BETWEEN 1 AND 10))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_job_digest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track" "job_track" NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"discord_channel_id" varchar(20) NOT NULL,
	"discord_message_id" varchar(20),
	"delivery_state" "job_delivery_state" DEFAULT 'pending' NOT NULL,
	"delivered_at" timestamp with time zone,
	"claim_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	CONSTRAINT "knight_hacks_job_digest_schedule_unique" UNIQUE("track","scheduled_at"),
	CONSTRAINT "knight_hacks_job_digest_message_unique" UNIQUE("discord_message_id"),
	CONSTRAINT "knight_hacks_job_digest_values_check" CHECK ("knight_hacks_job_digest"."window_start" < "knight_hacks_job_digest"."window_end" AND "knight_hacks_job_digest"."window_end" <= "knight_hacks_job_digest"."scheduled_at" AND "knight_hacks_job_digest"."attempts" >= 0 AND "knight_hacks_job_digest"."discord_channel_id" ~ '^[0-9]{17,20}$' AND ("knight_hacks_job_digest"."discord_message_id" IS NULL OR "knight_hacks_job_digest"."discord_message_id" ~ '^[0-9]{17,20}$')),
	CONSTRAINT "knight_hacks_job_digest_lease_check" CHECK (("knight_hacks_job_digest"."claim_token" IS NULL) = ("knight_hacks_job_digest"."lease_expires_at" IS NULL)),
	CONSTRAINT "knight_hacks_job_digest_receipt_check" CHECK (("knight_hacks_job_digest"."delivery_state" = 'sent') = ("knight_hacks_job_digest"."discord_message_id" IS NOT NULL AND "knight_hacks_job_digest"."delivered_at" IS NOT NULL) AND ("knight_hacks_job_digest"."discord_message_id" IS NULL) = ("knight_hacks_job_digest"."delivered_at" IS NULL)),
	CONSTRAINT "knight_hacks_job_digest_sending_check" CHECK ("knight_hacks_job_digest"."delivery_state" <> 'sending' OR "knight_hacks_job_digest"."claim_token" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_job_location" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"source_text" text NOT NULL,
	"kind" "job_location_kind" NOT NULL,
	"city_key" varchar(8),
	"state" varchar(2),
	CONSTRAINT "knight_hacks_job_location_values_check" CHECK ("knight_hacks_job_location"."source_text" ~ '[^[:space:]]' AND ("knight_hacks_job_location"."state" IS NULL OR "knight_hacks_job_location"."state" ~ '^[A-Z]{2}$') AND ("knight_hacks_job_location"."city_key" IS NULL OR "knight_hacks_job_location"."city_key" ~ '^[0-9]{2}-[0-9]{5}$')),
	CONSTRAINT "knight_hacks_job_location_shape_check" CHECK (("knight_hacks_job_location"."kind" = 'city' AND "knight_hacks_job_location"."city_key" IS NOT NULL AND "knight_hacks_job_location"."state" IS NOT NULL) OR ("knight_hacks_job_location"."kind" = 'state' AND "knight_hacks_job_location"."state" IS NOT NULL AND "knight_hacks_job_location"."city_key" IS NULL) OR ("knight_hacks_job_location"."kind" IN ('remote_us', 'unknown') AND "knight_hacks_job_location"."city_key" IS NULL AND "knight_hacks_job_location"."state" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_job_observation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"external_id_hash" text GENERATED ALWAYS AS (encode(sha256(decode(replace("external_id", chr(92), chr(92) || chr(92)), 'escape')), 'hex')) STORED NOT NULL,
	"source_url" text,
	"source_data" jsonb,
	"posted_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"inactive_at" timestamp with time zone,
	CONSTRAINT "knight_hacks_job_observation_source_external_unique" UNIQUE("source_id","external_id_hash"),
	CONSTRAINT "knight_hacks_job_observation_values_check" CHECK ("knight_hacks_job_observation"."external_id" ~ '[^[:space:]]' AND "knight_hacks_job_observation"."last_seen_at" >= "knight_hacks_job_observation"."first_seen_at")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_job_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(64) NOT NULL,
	"board_key" text NOT NULL,
	"board_key_hash" text GENERATED ALWAYS AS (encode(sha256(decode(replace("board_key", chr(92), chr(92) || chr(92)), 'escape')), 'hex')) STORED NOT NULL,
	"label" varchar(200) NOT NULL,
	"company_id" uuid,
	"enabled" boolean DEFAULT false NOT NULL,
	"poll_interval_seconds" integer DEFAULT 900 NOT NULL,
	"next_poll_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"baseline_completed_at" timestamp with time zone,
	"etag" text,
	"last_modified" text,
	"last_error" text,
	"claim_token" uuid,
	"lease_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_job_source_provider_board_unique" UNIQUE("provider","board_key_hash"),
	CONSTRAINT "knight_hacks_job_source_values_check" CHECK ("knight_hacks_job_source"."provider" ~ '^[a-z][a-z0-9_]*$' AND "knight_hacks_job_source"."board_key" ~ '[^[:space:]]' AND "knight_hacks_job_source"."label" ~ '[^[:space:]]' AND "knight_hacks_job_source"."poll_interval_seconds" > 0),
	CONSTRAINT "knight_hacks_job_source_lease_check" CHECK (("knight_hacks_job_source"."claim_token" IS NULL) = ("knight_hacks_job_source"."lease_expires_at" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_member" ADD COLUMN "job_internship_digest_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_member" ADD COLUMN "job_new_grad_digest_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "knight_hacks_job" ADD CONSTRAINT "knight_hacks_job_company_id_knight_hacks_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."knight_hacks_company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_job_alert_preference" ADD CONSTRAINT "knight_hacks_job_alert_preference_member_id_knight_hacks_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."knight_hacks_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_job_application" ADD CONSTRAINT "knight_hacks_job_application_member_id_knight_hacks_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."knight_hacks_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_job_application" ADD CONSTRAINT "knight_hacks_job_application_job_id_knight_hacks_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."knight_hacks_job"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_job_location" ADD CONSTRAINT "knight_hacks_job_location_job_id_knight_hacks_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."knight_hacks_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_job_observation" ADD CONSTRAINT "knight_hacks_job_observation_source_id_knight_hacks_job_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."knight_hacks_job_source"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_job_observation" ADD CONSTRAINT "knight_hacks_job_observation_job_id_knight_hacks_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."knight_hacks_job"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_job_source" ADD CONSTRAINT "knight_hacks_job_source_company_id_knight_hacks_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."knight_hacks_company"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_job_company_idx" ON "knight_hacks_job" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_company_search_idx" ON "knight_hacks_job" USING btree ("company_key","track");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_search_idx" ON "knight_hacks_job" USING btree ("active","track","first_seen_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_posted_idx" ON "knight_hacks_job" USING btree ("active","posted_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_delivery_idx" ON "knight_hacks_job" USING btree ("delivery_state","delivery_next_attempt_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_digest_idx" ON "knight_hacks_job" USING btree ("discord_channel_id","delivered_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_alert_matching_idx" ON "knight_hacks_job_alert_preference" USING btree ("kind","target_key","track");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_application_community_idx" ON "knight_hacks_job_application" USING btree ("job_id","visibility","stage");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_digest_pending_idx" ON "knight_hacks_job_digest" USING btree ("delivery_state","next_attempt_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_location_job_idx" ON "knight_hacks_job_location" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_location_city_idx" ON "knight_hacks_job_location" USING btree ("city_key","job_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_location_state_idx" ON "knight_hacks_job_location" USING btree ("state","job_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_location_kind_idx" ON "knight_hacks_job_location" USING btree ("kind","job_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_observation_job_idx" ON "knight_hacks_job_observation" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_observation_seen_idx" ON "knight_hacks_job_observation" USING btree ("source_id","last_seen_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_source_schedule_idx" ON "knight_hacks_job_source" USING btree ("enabled","next_poll_at");--> statement-breakpoint
CREATE INDEX "knight_hacks_job_source_company_idx" ON "knight_hacks_job_source" USING btree ("company_id");