-- Email Portal schema and team-audience role configuration.
CREATE TABLE "email_send" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" varchar(200) NOT NULL,
	"template_revision_id" uuid,
	"plain_text_source" text,
	"compiled_html" text,
	"compiled_text" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"audience_definition" jsonb NOT NULL,
	"audience_version" integer DEFAULT 1 NOT NULL,
	"audience_hash" varchar(64) NOT NULL,
	"preview_version" varchar(80) NOT NULL,
	"preview_expires_at" timestamp with time zone NOT NULL,
	"raw_match_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"excluded_invalid_count" integer DEFAULT 0 NOT NULL,
	"excluded_suppressed_count" integer DEFAULT 0 NOT NULL,
	"excluded_missing_field_count" integer DEFAULT 0 NOT NULL,
	"final_recipient_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"listmonk_list_id" integer,
	"listmonk_campaign_id" integer,
	"provider_tag" varchar(80) NOT NULL,
	"provider_may_have_started" boolean DEFAULT false NOT NULL,
	"provider_sent_count" integer DEFAULT 0 NOT NULL,
	"provider_bounce_count" integer DEFAULT 0 NOT NULL,
	"retry_attempt_count" integer DEFAULT 0 NOT NULL,
	"retry_lease_expires_at" timestamp with time zone,
	"next_retry_at" timestamp with time zone,
	"safe_error" varchar(500),
	"created_by" uuid NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"terminal_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_send_provider_tag_unique" UNIQUE("provider_tag")
);
--> statement-breakpoint
CREATE TABLE "email_send_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"send_id" uuid NOT NULL,
	"type" varchar(64) NOT NULL,
	"from_status" varchar(32),
	"to_status" varchar(32),
	"actor_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_send_recipient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"send_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"normalized_email" varchar(320) NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"match_reasons" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"exclusion_reason" varchar(64),
	"listmonk_subscriber_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_send_recipient_send_id_normalized_email_unique" UNIQUE("send_id","normalized_email")
);
--> statement-breakpoint
CREATE TABLE "email_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"normalized_name" varchar(120) NOT NULL,
	"kind" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_template_normalized_name_unique" UNIQUE("normalized_name")
);
--> statement-breakpoint
CREATE TABLE "email_template_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"source" text,
	"visual_document" jsonb,
	"compiled_html" text,
	"compiled_text" text,
	"personalization_contract" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checksum" varchar(64),
	"created_by" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_template_revision_template_version_unique" UNIQUE("template_id","version")
);
--> statement-breakpoint
ALTER TABLE "auth_roles" ADD COLUMN "email_audience_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "auth_roles"
SET "email_audience_enabled" = true
WHERE "name" IN (
	'President',
	'Vice President',
	'Treasurer',
	'Secretary',
	'Hack Lead',
	'Dev Lead',
	'Officers',
	'Design Director',
	'Sponsorship Director',
	'Mentorship Director',
	'Outreach Director',
	'Workshop Director',
	'Directors',
	'KH IX Team',
	'Sponsorship Team',
	'Workshop Team',
	'Design Team',
	'Outreach Team',
	'Dev Team'
);--> statement-breakpoint
ALTER TABLE "email_send" ADD CONSTRAINT "email_send_template_revision_id_email_template_revision_id_fk" FOREIGN KEY ("template_revision_id") REFERENCES "public"."email_template_revision"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_send" ADD CONSTRAINT "email_send_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_send" ADD CONSTRAINT "email_send_cancelled_by_auth_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_send_event" ADD CONSTRAINT "email_send_event_send_id_email_send_id_fk" FOREIGN KEY ("send_id") REFERENCES "public"."email_send"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_send_event" ADD CONSTRAINT "email_send_event_actor_id_auth_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_send_recipient" ADD CONSTRAINT "email_send_recipient_send_id_email_send_id_fk" FOREIGN KEY ("send_id") REFERENCES "public"."email_send"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_updated_by_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template_revision" ADD CONSTRAINT "email_template_revision_template_id_email_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template_revision" ADD CONSTRAINT "email_template_revision_created_by_auth_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_send_status_scheduled_for_idx" ON "email_send" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "email_send_retry_idx" ON "email_send" USING btree ("status","next_retry_at","retry_lease_expires_at");--> statement-breakpoint
CREATE INDEX "email_send_event_send_created_idx" ON "email_send_event" USING btree ("send_id","created_at","id");--> statement-breakpoint
CREATE INDEX "email_send_recipient_send_id_idx" ON "email_send_recipient" USING btree ("send_id","exclusion_reason");--> statement-breakpoint
CREATE INDEX "email_template_archived_updated_idx" ON "email_template" USING btree ("archived_at","updated_at");--> statement-breakpoint
CREATE INDEX "email_template_revision_template_state_idx" ON "email_template_revision" USING btree ("template_id","state","version");
