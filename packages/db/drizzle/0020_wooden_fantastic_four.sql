CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"action_key" varchar(128) NOT NULL,
	"domain" varchar(32) NOT NULL,
	"outcome" varchar(32) NOT NULL,
	"operation_id" uuid,
	"actor_user_id" uuid NOT NULL,
	"actor_member_id" uuid,
	"actor_discord_user_id" varchar(255),
	"actor_label" varchar(255) NOT NULL,
	"actor_role_label" varchar(255),
	"actor_role_color" varchar(7),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "audit_event_actor_role_color_check" CHECK ("audit_event"."actor_role_color" IS NULL OR "audit_event"."actor_role_color" ~ '^#[0-9A-Fa-f]{6}$'),
	CONSTRAINT "audit_event_outcome_check" CHECK ("audit_event"."outcome" IN ('committed', 'partial_external'))
);
--> statement-breakpoint
CREATE TABLE "audit_subject" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"relation" varchar(16) NOT NULL,
	"target_type" varchar(64) NOT NULL,
	"target_id" varchar(255) NOT NULL,
	"target_label" varchar(512) NOT NULL,
	"member_id" uuid,
	"result_outcome" varchar(32),
	"position" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "audit_subject_relation_check" CHECK ("audit_subject"."relation" IN ('primary', 'secondary', 'result')),
	CONSTRAINT "audit_subject_result_outcome_check" CHECK ("audit_subject"."result_outcome" IS NULL OR "audit_subject"."result_outcome" IN ('succeeded', 'skipped', 'failed_external', 'failed_internal', 'compensated')),
	CONSTRAINT "audit_subject_result_outcome_shape_check" CHECK (("audit_subject"."relation" = 'result') = ("audit_subject"."result_outcome" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "audit_subject" ADD CONSTRAINT "audit_subject_event_id_audit_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."audit_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_event_action_occurred_idx" ON "audit_event" USING btree ("action_key","occurred_at","id");--> statement-breakpoint
CREATE INDEX "audit_event_actor_occurred_idx" ON "audit_event" USING btree ("actor_user_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "audit_event_actor_member_occurred_idx" ON "audit_event" USING btree ("actor_member_id","occurred_at","id");--> statement-breakpoint
CREATE INDEX "audit_event_domain_occurred_idx" ON "audit_event" USING btree ("domain","occurred_at","id");--> statement-breakpoint
CREATE INDEX "audit_event_occurred_idx" ON "audit_event" USING btree ("occurred_at","id");--> statement-breakpoint
CREATE INDEX "audit_event_operation_idx" ON "audit_event" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "audit_event_outcome_occurred_idx" ON "audit_event" USING btree ("outcome","occurred_at","id");--> statement-breakpoint
CREATE INDEX "audit_subject_event_position_idx" ON "audit_subject" USING btree ("event_id","position","id");--> statement-breakpoint
CREATE INDEX "audit_subject_member_event_idx" ON "audit_subject" USING btree ("member_id","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_subject_one_primary_idx" ON "audit_subject" USING btree ("event_id") WHERE "audit_subject"."relation" = 'primary';--> statement-breakpoint
CREATE INDEX "audit_subject_target_event_idx" ON "audit_subject" USING btree ("target_type","target_id","event_id");--> statement-breakpoint
CREATE FUNCTION "audit_reject_mutation"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'Admin audit history is append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER "audit_event_reject_update_delete"
BEFORE UPDATE OR DELETE ON "audit_event"
FOR EACH ROW EXECUTE FUNCTION "audit_reject_mutation"();--> statement-breakpoint
CREATE TRIGGER "audit_subject_reject_update_delete"
BEFORE UPDATE OR DELETE ON "audit_subject"
FOR EACH ROW EXECUTE FUNCTION "audit_reject_mutation"();
