CREATE TABLE "discord_archive_channel" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"parent_id" varchar(20),
	"type" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"topic" text,
	"is_thread" boolean DEFAULT false NOT NULL,
	"is_private_thread" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"discord_updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "discord_archive_checkpoint" (
	"channel_id" varchar(20) PRIMARY KEY NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"oldest_message_id" varchar(20),
	"newest_message_id" varchar(20),
	"backfill_before_message_id" varchar(20),
	"backfill_status" varchar(16) DEFAULT 'pending' NOT NULL,
	"backfill_completed_at" timestamp with time zone,
	"last_backfill_at" timestamp with time zone,
	"last_discovered_at" timestamp with time zone,
	"last_reconciled_at" timestamp with time zone,
	"processed_message_count" integer DEFAULT 0 NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error_code" varchar(64),
	"last_error_message" varchar(500),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discord_archive_checkpoint_status_check" CHECK ("discord_archive_checkpoint"."backfill_status" IN ('pending', 'running', 'complete', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "discord_archive_message" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"guild_id" varchar(20) NOT NULL,
	"channel_id" varchar(20) NOT NULL,
	"author_discord_user_id" varchar(20),
	"author_label" varchar(255),
	"author_avatar_url" text,
	"author_is_bot" boolean DEFAULT false NOT NULL,
	"webhook_id" varchar(20),
	"application_id" varchar(20),
	"message_type" integer NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"reply_to_message_id" varchar(20),
	"pinned" boolean DEFAULT false NOT NULL,
	"flags" varchar(32) DEFAULT '0' NOT NULL,
	"mentions" jsonb DEFAULT '{"everyone":false,"roleIds":[],"userIds":[]}'::jsonb NOT NULL,
	"embeds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"components" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stickers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"poll" jsonb,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discord_archive_state" (
	"guild_id" varchar(20) PRIMARY KEY NOT NULL,
	"status" varchar(16) DEFAULT 'idle' NOT NULL,
	"last_gateway_event_at" timestamp with time zone,
	"last_live_write_at" timestamp with time zone,
	"last_discovery_started_at" timestamp with time zone,
	"last_discovery_completed_at" timestamp with time zone,
	"last_reconciliation_started_at" timestamp with time zone,
	"last_reconciliation_completed_at" timestamp with time zone,
	"last_backfill_progress_at" timestamp with time zone,
	"lease_owner" varchar(128),
	"lease_expires_at" timestamp with time zone,
	"last_error_code" varchar(64),
	"last_error_message" varchar(500),
	"failure_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discord_archive_state_status_check" CHECK ("discord_archive_state"."status" IN ('disabled', 'idle', 'healthy', 'degraded', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "discord_archive_checkpoint" ADD CONSTRAINT "discord_archive_checkpoint_channel_id_discord_archive_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."discord_archive_channel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_archive_message" ADD CONSTRAINT "discord_archive_message_channel_id_discord_archive_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."discord_archive_channel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discord_archive_channel_guild_type_idx" ON "discord_archive_channel" USING btree ("guild_id","type");--> statement-breakpoint
CREATE INDEX "discord_archive_channel_parent_idx" ON "discord_archive_channel" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "discord_archive_checkpoint_guild_status_updated_idx" ON "discord_archive_checkpoint" USING btree ("guild_id","backfill_status","updated_at");--> statement-breakpoint
CREATE INDEX "discord_archive_message_author_created_idx" ON "discord_archive_message" USING btree ("author_discord_user_id","created_at");--> statement-breakpoint
CREATE INDEX "discord_archive_message_channel_created_idx" ON "discord_archive_message" USING btree ("channel_id","created_at","id");--> statement-breakpoint
CREATE INDEX "discord_archive_message_guild_created_idx" ON "discord_archive_message" USING btree ("guild_id","created_at","id");--> statement-breakpoint
CREATE INDEX "discord_archive_message_non_deleted_created_idx" ON "discord_archive_message" USING btree ("guild_id","created_at") WHERE "discord_archive_message"."deleted_at" IS NULL;
