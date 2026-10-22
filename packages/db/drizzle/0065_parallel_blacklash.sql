CREATE TABLE "knight_hacks_case_study_study" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"owner_user_id" uuid,
	"published_revision_id" uuid,
	"visibility" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_case_study_study_slug_unique" UNIQUE("slug"),
	CONSTRAINT "case_study_visibility_check" CHECK ("knight_hacks_case_study_study"."visibility" IN ('active', 'suspended', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_case_study_consent_decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_study_id" uuid NOT NULL,
	"subject_user_id" uuid NOT NULL,
	"confirmer_user_id" uuid,
	"attribution_hash" varchar(64) NOT NULL,
	"policy_version" integer NOT NULL,
	"action" varchar(16) NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_study_consent_action_check" CHECK ("knight_hacks_case_study_consent_decision"."action" IN ('accept', 'decline', 'revoke')),
	CONSTRAINT "case_study_consent_policy_check" CHECK ("knight_hacks_case_study_consent_decision"."policy_version" > 0),
	CONSTRAINT "case_study_consent_hash_check" CHECK ("knight_hacks_case_study_consent_decision"."attribution_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_case_study_contributor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_study_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"attribution" jsonb NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"display" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_study_contributor_account_unique" UNIQUE("case_study_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_case_study_draft" (
	"case_study_id" uuid PRIMARY KEY NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_study_draft_version_check" CHECK ("knight_hacks_case_study_draft"."version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_case_study_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_study_id" uuid NOT NULL,
	"token_hash" varchar(64),
	"attribution_hash" varchar(64) NOT NULL,
	"target_user_id" uuid,
	"redeemer_user_id" uuid,
	"confirming_user_id" uuid,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_case_study_invitation_tokenHash_unique" UNIQUE("token_hash"),
	CONSTRAINT "case_study_invitation_status_check" CHECK ("knight_hacks_case_study_invitation"."status" IN ('pending', 'redeemed', 'confirmed', 'consumed', 'revoked')),
	CONSTRAINT "case_study_invitation_expiry_check" CHECK ("knight_hacks_case_study_invitation"."expires_at" <= "knight_hacks_case_study_invitation"."created_at" + interval '14 days'),
	CONSTRAINT "case_study_invitation_token_check" CHECK (("knight_hacks_case_study_invitation"."status" IN ('consumed', 'revoked')) = ("knight_hacks_case_study_invitation"."token_hash" IS NULL)),
	CONSTRAINT "case_study_invitation_hash_check" CHECK ("knight_hacks_case_study_invitation"."attribution_hash" ~ '^[0-9a-f]{64}$' AND ("knight_hacks_case_study_invitation"."token_hash" IS NULL OR "knight_hacks_case_study_invitation"."token_hash" ~ '^[0-9a-f]{64}$'))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_case_study_publication_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"action" varchar(16) NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"reason_code" varchar(64) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_study_publication_action_check" CHECK ("knight_hacks_case_study_publication_event"."action" IN ('publish', 'suspend', 'withdraw', 'transfer', 'anonymize')),
	CONSTRAINT "case_study_publication_reason_check" CHECK ("knight_hacks_case_study_publication_event"."reason_code" IN ('owner_request', 'consent_revoked', 'eligibility_failed', 'editorial_hold', 'ownership_transfer', 'privacy_request', 'policy_violation', 'correction'))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_case_study_review_decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"stage" varchar(16) NOT NULL,
	"outcome" varchar(24) NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"feedback" text,
	"eligibility" varchar(24),
	"evidence_basis" varchar(32),
	"claims_verified" boolean,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"redacted_at" timestamp with time zone,
	CONSTRAINT "case_study_review_stage_unique" UNIQUE("revision_id","stage"),
	CONSTRAINT "case_study_review_stage_check" CHECK ("knight_hacks_case_study_review_decision"."stage" IN ('technical', 'editorial')),
	CONSTRAINT "case_study_review_outcome_check" CHECK ("knight_hacks_case_study_review_decision"."outcome" IN ('approve', 'changes_requested', 'reject')),
	CONSTRAINT "case_study_review_editorial_check" CHECK (("knight_hacks_case_study_review_decision"."stage" = 'technical' AND "knight_hacks_case_study_review_decision"."eligibility" IS NULL AND "knight_hacks_case_study_review_decision"."evidence_basis" IS NULL AND "knight_hacks_case_study_review_decision"."claims_verified" IS NULL) OR ("knight_hacks_case_study_review_decision"."stage" = 'editorial' AND "knight_hacks_case_study_review_decision"."eligibility" IS NOT NULL AND "knight_hacks_case_study_review_decision"."eligibility" IN ('verified', 'unable_to_verify') AND "knight_hacks_case_study_review_decision"."evidence_basis" IS NOT NULL AND "knight_hacks_case_study_review_decision"."claims_verified" IS NOT NULL AND ("knight_hacks_case_study_review_decision"."outcome" <> 'approve' OR ("knight_hacks_case_study_review_decision"."eligibility" = 'verified' AND "knight_hacks_case_study_review_decision"."claims_verified" IS TRUE)))),
	CONSTRAINT "case_study_review_evidence_basis_check" CHECK ("knight_hacks_case_study_review_decision"."evidence_basis" IS NULL OR "knight_hacks_case_study_review_decision"."evidence_basis" IN ('member_record', 'role_record', 'event_record', 'supporting_evidence', 'community_attestation', 'insufficient'))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_case_study_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_study_id" uuid NOT NULL,
	"revision_no" integer NOT NULL,
	"content" jsonb,
	"content_hash" varchar(64) NOT NULL,
	"private_evidence" jsonb,
	"author_connection" varchar(32) NOT NULL,
	"attribution_subject_ids" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
	"attribution_hashes" varchar(64)[] DEFAULT ARRAY[]::varchar(64)[] NOT NULL,
	"submitter_user_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"redacted_at" timestamp with time zone,
	CONSTRAINT "case_study_revision_number_unique" UNIQUE("case_study_id","revision_no"),
	CONSTRAINT "case_study_revision_id_study_unique" UNIQUE("id","case_study_id"),
	CONSTRAINT "case_study_revision_no_check" CHECK ("knight_hacks_case_study_revision"."revision_no" > 0),
	CONSTRAINT "case_study_revision_hash_check" CHECK ("knight_hacks_case_study_revision"."content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "case_study_revision_payload_check" CHECK ("knight_hacks_case_study_revision"."content" IS NOT NULL OR "knight_hacks_case_study_revision"."redacted_at" IS NOT NULL),
	CONSTRAINT "case_study_revision_connection_check" CHECK ("knight_hacks_case_study_revision"."author_connection" IN ('member', 'alumni', 'community', 'other')),
	CONSTRAINT "case_study_revision_attribution_pair_check" CHECK (cardinality("knight_hacks_case_study_revision"."attribution_subject_ids") = cardinality("knight_hacks_case_study_revision"."attribution_hashes") AND array_position("knight_hacks_case_study_revision"."attribution_subject_ids", NULL) IS NULL AND array_position("knight_hacks_case_study_revision"."attribution_hashes", NULL) IS NULL AND (cardinality("knight_hacks_case_study_revision"."attribution_hashes") = 0 OR array_to_string("knight_hacks_case_study_revision"."attribution_hashes", ',') ~ '^([0-9a-f]{64})(,[0-9a-f]{64})*$'))
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_case_study_study" ADD CONSTRAINT "knight_hacks_case_study_study_owner_user_id_auth_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_case_study_study" ADD CONSTRAINT "case_study_published_revision_same_study_fk" FOREIGN KEY ("published_revision_id","id") REFERENCES "public"."knight_hacks_case_study_revision"("id","case_study_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_case_study_consent_decision" ADD CONSTRAINT "knight_hacks_case_study_consent_decision_case_study_id_knight_hacks_case_study_study_id_fk" FOREIGN KEY ("case_study_id") REFERENCES "public"."knight_hacks_case_study_study"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_case_study_contributor" ADD CONSTRAINT "knight_hacks_case_study_contributor_case_study_id_knight_hacks_case_study_study_id_fk" FOREIGN KEY ("case_study_id") REFERENCES "public"."knight_hacks_case_study_study"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_case_study_contributor" ADD CONSTRAINT "knight_hacks_case_study_contributor_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_case_study_draft" ADD CONSTRAINT "knight_hacks_case_study_draft_case_study_id_knight_hacks_case_study_study_id_fk" FOREIGN KEY ("case_study_id") REFERENCES "public"."knight_hacks_case_study_study"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_case_study_draft" ADD CONSTRAINT "knight_hacks_case_study_draft_owner_user_id_auth_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_case_study_invitation" ADD CONSTRAINT "knight_hacks_case_study_invitation_case_study_id_knight_hacks_case_study_study_id_fk" FOREIGN KEY ("case_study_id") REFERENCES "public"."knight_hacks_case_study_study"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_case_study_invitation" ADD CONSTRAINT "knight_hacks_case_study_invitation_target_user_id_auth_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_case_study_invitation" ADD CONSTRAINT "knight_hacks_case_study_invitation_redeemer_user_id_auth_user_id_fk" FOREIGN KEY ("redeemer_user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_case_study_invitation" ADD CONSTRAINT "knight_hacks_case_study_invitation_confirming_user_id_auth_user_id_fk" FOREIGN KEY ("confirming_user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_case_study_publication_event" ADD CONSTRAINT "knight_hacks_case_study_publication_event_revision_id_knight_hacks_case_study_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."knight_hacks_case_study_revision"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_case_study_review_decision" ADD CONSTRAINT "knight_hacks_case_study_review_decision_revision_id_knight_hacks_case_study_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."knight_hacks_case_study_revision"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_case_study_revision" ADD CONSTRAINT "knight_hacks_case_study_revision_case_study_id_knight_hacks_case_study_study_id_fk" FOREIGN KEY ("case_study_id") REFERENCES "public"."knight_hacks_case_study_study"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_study_owner_idx" ON "knight_hacks_case_study_study" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "case_study_consent_subject_idx" ON "knight_hacks_case_study_consent_decision" USING btree ("case_study_id","subject_user_id","decided_at");--> statement-breakpoint
CREATE INDEX "case_study_contributor_user_idx" ON "knight_hacks_case_study_contributor" USING btree ("user_id");--> statement-breakpoint
CREATE FUNCTION case_study_guard_slug() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'case-study slug is immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER case_study_slug_immutable BEFORE UPDATE ON knight_hacks_case_study_study
FOR EACH ROW EXECUTE FUNCTION case_study_guard_slug();
--> statement-breakpoint
CREATE FUNCTION case_study_guard_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'submitted revisions are append-only';
  END IF;
  IF (to_jsonb(NEW) - 'content' - 'private_evidence' - 'redacted_at') IS DISTINCT FROM
     (to_jsonb(OLD) - 'content' - 'private_evidence' - 'redacted_at')
     OR NOT (OLD.content IS NOT NULL AND NEW.content IS NULL OR NEW.content IS NOT DISTINCT FROM OLD.content)
     OR NOT (OLD.private_evidence IS NOT NULL AND NEW.private_evidence IS NULL OR NEW.private_evidence IS NOT DISTINCT FROM OLD.private_evidence)
     OR (NEW.content IS NOT DISTINCT FROM OLD.content AND NEW.private_evidence IS NOT DISTINCT FROM OLD.private_evidence)
     OR NEW.redacted_at IS NULL
     OR (OLD.redacted_at IS NOT NULL AND NEW.redacted_at IS DISTINCT FROM OLD.redacted_at) THEN
    RAISE EXCEPTION 'submitted revisions are append-only except for one-way redaction';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER case_study_revision_immutable BEFORE UPDATE OR DELETE ON knight_hacks_case_study_revision
FOR EACH ROW EXECUTE FUNCTION case_study_guard_revision();
--> statement-breakpoint
CREATE FUNCTION case_study_guard_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'review decisions are append-only';
  END IF;
  IF (to_jsonb(NEW) - 'feedback' - 'redacted_at') IS DISTINCT FROM
     (to_jsonb(OLD) - 'feedback' - 'redacted_at')
     OR OLD.feedback IS NULL OR NEW.feedback IS NOT NULL
     OR NEW.redacted_at IS NULL
     OR (OLD.redacted_at IS NOT NULL AND NEW.redacted_at IS DISTINCT FROM OLD.redacted_at) THEN
    RAISE EXCEPTION 'review decisions are append-only except for one-way feedback redaction';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER case_study_review_immutable BEFORE UPDATE OR DELETE ON knight_hacks_case_study_review_decision
FOR EACH ROW EXECUTE FUNCTION case_study_guard_review();
--> statement-breakpoint
CREATE TRIGGER case_study_consent_immutable BEFORE UPDATE OR DELETE ON knight_hacks_case_study_consent_decision
FOR EACH ROW EXECUTE FUNCTION audit_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER case_study_publication_event_immutable BEFORE UPDATE OR DELETE ON knight_hacks_case_study_publication_event
FOR EACH ROW EXECUTE FUNCTION audit_reject_mutation();
