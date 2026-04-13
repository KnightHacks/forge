ALTER TABLE "auth_roles" ALTER COLUMN "issue_reminder_channel" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "auth_roles" ALTER COLUMN "issue_reminder_channel" SET DEFAULT '1459204271655489567';--> statement-breakpoint
ALTER TABLE "auth_roles" ALTER COLUMN "issue_reminder_channel" SET NOT NULL;--> statement-breakpoint
DROP TYPE "public"."issue_reminder_channel";