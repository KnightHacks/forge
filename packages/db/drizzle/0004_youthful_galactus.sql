ALTER TABLE "knight_hacks_issue" ALTER COLUMN "priority" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."issue_priority";--> statement-breakpoint
CREATE TYPE "public"."issue_priority" AS ENUM('Lowest', 'Low', 'Medium', 'High', 'Highest');--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ALTER COLUMN "priority" SET DATA TYPE "public"."issue_priority" USING "priority"::"public"."issue_priority";--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."issue_status";--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('Backlog', 'Planning', 'In Progress', 'Finished');--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ALTER COLUMN "status" SET DATA TYPE "public"."issue_status" USING "status"::"public"."issue_status";