CREATE TYPE "public"."issue_reminder_channel" AS ENUM('Teams', 'Directors', 'Design', 'HackOrg');--> statement-breakpoint
CREATE TYPE "public"."event_tag" AS ENUM('GBM', 'Social', 'Kickstart', 'Project Launch', 'Hello World', 'Sponsorship', 'Tech Exploration', 'Class Support', 'Workshop', 'OPS', 'Collabs', 'Check-in', 'Merch', 'Food', 'Ceremony', 'CAREER-FAIR', 'RSO-FAIR');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('Man', 'Woman', 'Non-binary', 'Prefer to self-describe', 'Prefer not to answer');--> statement-breakpoint
CREATE TYPE "public"."hackathon_application_state" AS ENUM('withdrawn', 'pending', 'accepted', 'waitlisted', 'checkedin', 'confirmed', 'denied');--> statement-breakpoint
CREATE TYPE "public"."issue_priority" AS ENUM('LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST');--> statement-breakpoint
CREATE TYPE "public"."issue_status" AS ENUM('BACKLOG', 'PLANNING', 'IN_PROGRESS', 'FINISHED');--> statement-breakpoint
CREATE TYPE "public"."race_or_ethnicity" AS ENUM('White', 'Black or African American', 'Hispanic / Latino / Spanish Origin', 'Asian', 'Native Hawaiian or Other Pacific Islander', 'Native American or Alaskan Native', 'Middle Eastern', 'Prefer not to answer', 'Other');--> statement-breakpoint
CREATE TYPE "public"."shirt_size" AS ENUM('XS', 'S', 'M', 'L', 'XL', '2XL', '3XL');--> statement-breakpoint
CREATE TYPE "public"."sponsor_tier" AS ENUM('gold', 'silver', 'bronze', 'other');--> statement-breakpoint
CREATE TABLE "auth_account" (
	"id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" varchar(255),
	"access_token" text,
	"expires_at" timestamp with time zone,
	"scope" varchar(255),
	"id_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_account_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "auth_judge_session" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"room_name" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar DEFAULT '' NOT NULL,
	"discord_role_id" varchar NOT NULL,
	"permissions" varchar NOT NULL,
	"issue_reminder_channel" "issue_reminder_channel",
	CONSTRAINT "auth_roles_discordRoleId_unique" UNIQUE("discord_role_id")
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	"ip_address" varchar(255),
	"user_agent" varchar(1024),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_user_id" varchar(255) NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"description" text NOT NULL,
	"sponsor" text NOT NULL,
	CONSTRAINT "knight_hacks_challenges_title_hackathonId_unique" UNIQUE("title","hackathon_id")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_dues_payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"payment_date" timestamp NOT NULL,
	"year" integer NOT NULL,
	CONSTRAINT "knight_hacks_dues_payment_memberId_year_unique" UNIQUE("member_id","year")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_id" varchar(255) NOT NULL,
	"google_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"tag" "event_tag" NOT NULL,
	"description" text NOT NULL,
	"start_datetime" timestamp NOT NULL,
	"end_datetime" timestamp NOT NULL,
	"location" varchar(255) NOT NULL,
	"dues_paying" boolean DEFAULT false NOT NULL,
	"is_operations_calendar" boolean DEFAULT false NOT NULL,
	"roles" varchar(255)[] DEFAULT '{}' NOT NULL,
	"points" integer,
	"hackathon_id" uuid,
	"discord_channel_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_event_attendee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"event_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_event_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"overall_event_rating" integer NOT NULL,
	"fun_rating" integer NOT NULL,
	"learned_rating" integer NOT NULL,
	"heard_about_us" text NOT NULL,
	"additional_feedback" text,
	"similar_event" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_form_response" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"response_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"edited_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_form_response_roles" (
	"form_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "knight_hacks_form_response_roles_form_id_role_id_pk" PRIMARY KEY("form_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_form_section_roles" (
	"section_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "knight_hacks_form_section_roles_section_id_role_id_pk" PRIMARY KEY("section_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_form_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_form_sections_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_form_schemas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug_name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"dues_only" boolean DEFAULT false NOT NULL,
	"allow_resubmission" boolean DEFAULT false NOT NULL,
	"allow_edit" boolean DEFAULT false NOT NULL,
	"form_data" jsonb NOT NULL,
	"form_validator_json" jsonb NOT NULL,
	"section" varchar(255) DEFAULT 'General' NOT NULL,
	"section_id" uuid,
	"is_closed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "knight_hacks_form_schemas_slugName_unique" UNIQUE("slug_name")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hackathon" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"display_name" varchar(255) DEFAULT '' NOT NULL,
	"theme" varchar(255) NOT NULL,
	"application_open" timestamp DEFAULT now() NOT NULL,
	"application_deadline" timestamp DEFAULT now() NOT NULL,
	"confirmation_deadline" timestamp DEFAULT now() NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hackathon_sponsor" (
	"hackathon_id" uuid NOT NULL,
	"sponsor_id" uuid NOT NULL,
	"tier" "sponsor_tier" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hacker" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"gender" "gender" DEFAULT 'Prefer not to answer' NOT NULL,
	"discord_user" varchar(255) NOT NULL,
	"age" integer NOT NULL,
	"country" text DEFAULT 'United States of America' NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone_number" varchar(255),
	"school" text NOT NULL,
	"level_of_study" text NOT NULL,
	"major" text DEFAULT 'Computer Science' NOT NULL,
	"race_or_ethnicity" "race_or_ethnicity" DEFAULT 'Prefer not to answer' NOT NULL,
	"shirt_size" "shirt_size" NOT NULL,
	"github_profile_url" varchar(255),
	"linkedin_profile_url" varchar(255),
	"website_url" varchar(255),
	"resume_url" varchar(255),
	"dob" date NOT NULL,
	"grad_date" date NOT NULL,
	"survey_1" text NOT NULL,
	"survey_2" text NOT NULL,
	"is_first_time" boolean DEFAULT false,
	"food_allergies" text,
	"agrees_to_receive_emails_from_mlh" boolean DEFAULT false,
	"agrees_to_mlh_code_of_conduct" boolean DEFAULT false,
	"agrees_to_mlh_data_sharing" boolean DEFAULT false,
	"date_created" date DEFAULT now() NOT NULL,
	"time_created" time DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hacker_attendee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hacker_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"time_applied" timestamp DEFAULT now() NOT NULL,
	"time_confirmed" timestamp,
	"points" integer DEFAULT 0 NOT NULL,
	"class" varchar(20) DEFAULT null
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_hacker_event_attendee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hacker_att_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"event_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_issue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "issue_status" NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"links" text[],
	"event" uuid,
	"date" timestamp,
	"priority" "issue_priority" NOT NULL,
	"team" uuid NOT NULL,
	"creator" uuid NOT NULL,
	"parent" uuid
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_issues_to_teams_visibility" (
	"issue_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	CONSTRAINT "knight_hacks_issues_to_teams_visibility_issue_id_team_id_pk" PRIMARY KEY("issue_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_issues_to_users_assignment" (
	"issue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "knight_hacks_issues_to_users_assignment_issue_id_user_id_pk" PRIMARY KEY("issue_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_judged_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"judge_id" uuid NOT NULL,
	"private_feedback" varchar(255) NOT NULL,
	"public_feedback" varchar(255) NOT NULL,
	"originality_rating" integer NOT NULL,
	"design_rating" integer NOT NULL,
	"technical_understanding_rating" integer NOT NULL,
	"implementation_rating" integer NOT NULL,
	"wow_factor_rating" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_judges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"room_name" text NOT NULL,
	"challenge_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"discord_user" varchar(255) NOT NULL,
	"age" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone_number" varchar(255),
	"school" text NOT NULL,
	"level_of_study" text NOT NULL,
	"major" text DEFAULT 'Computer Science' NOT NULL,
	"gender" "gender" DEFAULT 'Prefer not to answer' NOT NULL,
	"race_or_ethnicity" "race_or_ethnicity" DEFAULT 'Prefer not to answer' NOT NULL,
	"guild_profile_visible" boolean DEFAULT true NOT NULL,
	"tagline" varchar(80),
	"about" varchar(500),
	"profile_picture_url" varchar(512),
	"shirt_size" "shirt_size" NOT NULL,
	"github_profile_url" varchar(255),
	"linkedin_profile_url" varchar(255),
	"website_url" varchar(255),
	"resume_url" varchar(255),
	"dob" date NOT NULL,
	"grad_date" date NOT NULL,
	"company" varchar(255),
	"points" integer DEFAULT 0 NOT NULL,
	"date_created" date DEFAULT now() NOT NULL,
	"time_created" time DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_member_email_unique" UNIQUE("email"),
	CONSTRAINT "knight_hacks_member_phoneNumber_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_companies" (
	"name" varchar(255) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_sponsor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"logo_url" varchar(255) NOT NULL,
	"website_url" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"hackathon_id" uuid NOT NULL,
	CONSTRAINT "knight_hacks_submissions_teamId_challengeId_unique" UNIQUE("team_id","challenge_id")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hackathon_id" uuid NOT NULL,
	"project_title" text NOT NULL,
	"submission_url" text,
	"project_created_at" timestamp NOT NULL,
	"is_project_submitted" boolean DEFAULT false NOT NULL,
	"devpost_url" text,
	"notes" text,
	"universities" text,
	"emails" text,
	"match_key" text,
	CONSTRAINT "knight_hacks_teams_matchKey_unique" UNIQUE("match_key")
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"body" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_trpc_form_connection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form" uuid NOT NULL,
	"proc" varchar NOT NULL,
	"connections" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_permissions" ADD CONSTRAINT "auth_permissions_role_id_auth_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."auth_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_permissions" ADD CONSTRAINT "auth_permissions_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_challenges" ADD CONSTRAINT "knight_hacks_challenges_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_dues_payment" ADD CONSTRAINT "knight_hacks_dues_payment_member_id_knight_hacks_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."knight_hacks_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_event" ADD CONSTRAINT "knight_hacks_event_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_attendee" ADD CONSTRAINT "knight_hacks_event_attendee_member_id_knight_hacks_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."knight_hacks_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_attendee" ADD CONSTRAINT "knight_hacks_event_attendee_event_id_knight_hacks_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."knight_hacks_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_feedback" ADD CONSTRAINT "knight_hacks_event_feedback_member_id_knight_hacks_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."knight_hacks_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_event_feedback" ADD CONSTRAINT "knight_hacks_event_feedback_event_id_knight_hacks_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."knight_hacks_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_response" ADD CONSTRAINT "knight_hacks_form_response_form_knight_hacks_form_schemas_id_fk" FOREIGN KEY ("form") REFERENCES "public"."knight_hacks_form_schemas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_response" ADD CONSTRAINT "knight_hacks_form_response_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_response_roles" ADD CONSTRAINT "knight_hacks_form_response_roles_form_id_knight_hacks_form_schemas_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."knight_hacks_form_schemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_response_roles" ADD CONSTRAINT "knight_hacks_form_response_roles_role_id_auth_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."auth_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_section_roles" ADD CONSTRAINT "knight_hacks_form_section_roles_section_id_knight_hacks_form_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."knight_hacks_form_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_section_roles" ADD CONSTRAINT "knight_hacks_form_section_roles_role_id_auth_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."auth_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_form_schemas" ADD CONSTRAINT "knight_hacks_form_schemas_section_id_knight_hacks_form_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."knight_hacks_form_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_sponsor" ADD CONSTRAINT "knight_hacks_hackathon_sponsor_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon_sponsor" ADD CONSTRAINT "knight_hacks_hackathon_sponsor_sponsor_id_knight_hacks_sponsor_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."knight_hacks_sponsor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker" ADD CONSTRAINT "knight_hacks_hacker_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD CONSTRAINT "knight_hacks_hacker_attendee_hacker_id_knight_hacks_hacker_id_fk" FOREIGN KEY ("hacker_id") REFERENCES "public"."knight_hacks_hacker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_attendee" ADD CONSTRAINT "knight_hacks_hacker_attendee_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD CONSTRAINT "knight_hacks_hacker_event_attendee_hacker_att_id_knight_hacks_hacker_attendee_id_fk" FOREIGN KEY ("hacker_att_id") REFERENCES "public"."knight_hacks_hacker_attendee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD CONSTRAINT "knight_hacks_hacker_event_attendee_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_hacker_event_attendee" ADD CONSTRAINT "knight_hacks_hacker_event_attendee_event_id_knight_hacks_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."knight_hacks_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ADD CONSTRAINT "knight_hacks_issue_event_knight_hacks_event_id_fk" FOREIGN KEY ("event") REFERENCES "public"."knight_hacks_event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ADD CONSTRAINT "knight_hacks_issue_team_auth_roles_id_fk" FOREIGN KEY ("team") REFERENCES "public"."auth_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ADD CONSTRAINT "knight_hacks_issue_creator_auth_user_id_fk" FOREIGN KEY ("creator") REFERENCES "public"."auth_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_issue" ADD CONSTRAINT "issue_parent_fk" FOREIGN KEY ("parent") REFERENCES "public"."knight_hacks_issue"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_issues_to_teams_visibility" ADD CONSTRAINT "knight_hacks_issues_to_teams_visibility_issue_id_knight_hacks_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."knight_hacks_issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_issues_to_teams_visibility" ADD CONSTRAINT "knight_hacks_issues_to_teams_visibility_team_id_auth_roles_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."auth_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_issues_to_users_assignment" ADD CONSTRAINT "knight_hacks_issues_to_users_assignment_issue_id_knight_hacks_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."knight_hacks_issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_issues_to_users_assignment" ADD CONSTRAINT "knight_hacks_issues_to_users_assignment_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judged_submission" ADD CONSTRAINT "knight_hacks_judged_submission_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judged_submission" ADD CONSTRAINT "knight_hacks_judged_submission_submission_id_knight_hacks_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."knight_hacks_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judged_submission" ADD CONSTRAINT "knight_hacks_judged_submission_judge_id_knight_hacks_judges_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."knight_hacks_judges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_judges" ADD CONSTRAINT "knight_hacks_judges_challenge_id_knight_hacks_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."knight_hacks_challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_member" ADD CONSTRAINT "knight_hacks_member_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_submissions" ADD CONSTRAINT "knight_hacks_submissions_challenge_id_knight_hacks_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."knight_hacks_challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_submissions" ADD CONSTRAINT "knight_hacks_submissions_team_id_knight_hacks_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."knight_hacks_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_submissions" ADD CONSTRAINT "knight_hacks_submissions_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_teams" ADD CONSTRAINT "knight_hacks_teams_hackathon_id_knight_hacks_hackathon_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."knight_hacks_hackathon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_trpc_form_connection" ADD CONSTRAINT "knight_hacks_trpc_form_connection_form_knight_hacks_form_schemas_id_fk" FOREIGN KEY ("form") REFERENCES "public"."knight_hacks_form_schemas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_team_idx" ON "knight_hacks_issue" USING btree ("team");--> statement-breakpoint
CREATE INDEX "issue_creator_idx" ON "knight_hacks_issue" USING btree ("creator");--> statement-breakpoint
CREATE INDEX "issue_status_idx" ON "knight_hacks_issue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "issue_date_idx" ON "knight_hacks_issue" USING btree ("date");--> statement-breakpoint
CREATE INDEX "issue_parent_idx" ON "knight_hacks_issue" USING btree ("parent");--> statement-breakpoint
CREATE INDEX "issue_priority_idx" ON "knight_hacks_issue" USING btree ("priority");