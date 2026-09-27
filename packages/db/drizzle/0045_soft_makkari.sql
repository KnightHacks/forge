CREATE TABLE "knight_hacks_issue_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid,
	"draft_key" uuid,
	"team_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"object_name" varchar(512) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"content_type" varchar(255) NOT NULL,
	"size" integer NOT NULL,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_issue_attachment_objectName_unique" UNIQUE("object_name"),
	CONSTRAINT "knight_hacks_issue_attachment_owner_check" CHECK (NOT ("knight_hacks_issue_attachment"."issue_id" IS NOT NULL AND "knight_hacks_issue_attachment"."draft_key" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_issue_attachment_reference" (
	"attachment_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	CONSTRAINT "knight_hacks_issue_attachment_reference_attachment_id_issue_id_pk" PRIMARY KEY("attachment_id","issue_id")
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_form_attachment" DROP CONSTRAINT "knight_hacks_form_attachment_purpose_check";--> statement-breakpoint
ALTER TABLE "knight_hacks_issue_attachment" ADD CONSTRAINT "knight_hacks_issue_attachment_issue_id_knight_hacks_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."knight_hacks_issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue_attachment" ADD CONSTRAINT "knight_hacks_issue_attachment_team_id_auth_roles_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."auth_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue_attachment" ADD CONSTRAINT "knight_hacks_issue_attachment_owner_user_id_auth_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue_attachment_reference" ADD CONSTRAINT "knight_hacks_issue_attachment_reference_attachment_id_knight_hacks_issue_attachment_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."knight_hacks_issue_attachment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue_attachment_reference" ADD CONSTRAINT "knight_hacks_issue_attachment_reference_issue_id_knight_hacks_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."knight_hacks_issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knight_hacks_issue_attachment_issue_idx" ON "knight_hacks_issue_attachment" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "knight_hacks_issue_attachment_draft_idx" ON "knight_hacks_issue_attachment" USING btree ("draft_key");--> statement-breakpoint
CREATE INDEX "issue_attachment_reference_issue_idx" ON "knight_hacks_issue_attachment_reference" USING btree ("issue_id");--> statement-breakpoint
ALTER TABLE "knight_hacks_form_attachment" ADD CONSTRAINT "knight_hacks_form_attachment_purpose_check" CHECK ("knight_hacks_form_attachment"."purpose" IN ('banner', 'instruction', 'response'));