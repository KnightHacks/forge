CREATE TABLE "knight_hacks_club_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"label" varchar(64) NOT NULL,
	"heading" varchar(128) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"display_order" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_club_team_slug_unique" UNIQUE("slug"),
	CONSTRAINT "knight_hacks_club_team_kind_check" CHECK ("knight_hacks_club_team"."kind" IN ('executive', 'director', 'team'))
);
--> statement-breakpoint
CREATE TABLE "knight_hacks_club_team_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"kind" varchar(16) NOT NULL,
	"rank" integer NOT NULL,
	"team_id" uuid,
	"roster_label" varchar(64),
	"callout_label" varchar(64),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knight_hacks_club_team_role_roleId_unique" UNIQUE("role_id"),
	CONSTRAINT "knight_hacks_club_team_role_kind_check" CHECK ("knight_hacks_club_team_role"."kind" IN ('executive', 'director', 'team')),
	CONSTRAINT "knight_hacks_club_team_role_team_check" CHECK ("knight_hacks_club_team_role"."kind" <> 'team' OR "knight_hacks_club_team_role"."team_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "knight_hacks_club_team_role" ADD CONSTRAINT "knight_hacks_club_team_role_role_id_auth_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."auth_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knight_hacks_club_team_role" ADD CONSTRAINT "knight_hacks_club_team_role_team_id_knight_hacks_club_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."knight_hacks_club_team"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_club_team_display_order_unique" ON "knight_hacks_club_team" USING btree ("display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "knight_hacks_club_team_kind_unique" ON "knight_hacks_club_team" USING btree ("kind") WHERE "knight_hacks_club_team"."kind" <> 'team';--> statement-breakpoint
-- Backfill: the club roster exactly as `@forge/consts` described it immediately
-- before this migration, so moving the configuration into the database is a
-- no-op for what the public Club site renders.
INSERT INTO "knight_hacks_club_team" ("slug", "label", "heading", "kind", "display_order") VALUES
	('executive', 'Executive', 'Executive Officers', 'executive', 0),
	('directors', 'Directors', 'Directors', 'director', 1),
	('hackathon', 'Hackathon', 'Hackathon Team', 'team', 2),
	('sponsorship', 'Sponsorship', 'Sponsorship Team', 'team', 3),
	('workshop', 'Workshop', 'Workshop Team', 'team', 4),
	('design', 'Design', 'Design Team', 'team', 5),
	('outreach', 'Outreach', 'Outreach Team', 'team', 6),
	('development', 'Development', 'Development Team', 'team', 7)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
-- Role classification is the half that cannot be written as a plain INSERT.
-- The old configuration identified roles by name, this table identifies them by
-- `auth_roles.id`, and that translation can only happen against real rows — so
-- it happens here, once, and then never again.
--
-- What happens when a name matches nothing is the whole point. A team whose
-- role name does not resolve can never be populated: it renders as an empty tab
-- on the public site with no error anywhere, which is precisely the bug this
-- migration exists to fix. So that case raises, naming the roles, rather than
-- committing a roster that is quietly missing a team.
--
-- Two deliberate exceptions to raising:
--
-- * When *none* of the names resolve, the database simply has no club roster in
--   it — a freshly created database, or a disposable one in a test. Raising
--   there would make `drizzle-kit migrate` impossible to run on a new
--   environment, so it is a no-op instead.
-- * A missing *executive* or *director* role name is a notice, not an error.
--   "Officers" is the live example: it is an aggregate role that exists in
--   Discord but has never been linked in Blade, and its absence removes nobody
--   from the Executive Officers bucket, which President, Vice President,
--   Treasurer and Secretary already fill.
DO $$
DECLARE
	role_seed CONSTANT jsonb := '[
		{"role_name": "President",            "kind": "executive", "rank": 0, "team_slug": null,          "roster_label": null,       "callout_label": null},
		{"role_name": "Vice President",       "kind": "executive", "rank": 1, "team_slug": null,          "roster_label": null,       "callout_label": null},
		{"role_name": "Treasurer",            "kind": "executive", "rank": 2, "team_slug": null,          "roster_label": null,       "callout_label": null},
		{"role_name": "Secretary",            "kind": "executive", "rank": 3, "team_slug": null,          "roster_label": null,       "callout_label": null},
		{"role_name": "Hack Lead",            "kind": "executive", "rank": 4, "team_slug": "hackathon",   "roster_label": null,       "callout_label": null},
		{"role_name": "Dev Lead",             "kind": "executive", "rank": 5, "team_slug": "development", "roster_label": null,       "callout_label": null},
		{"role_name": "Officers",             "kind": "executive", "rank": 6, "team_slug": null,          "roster_label": null,       "callout_label": "Officer"},
		{"role_name": "Design Director",      "kind": "director",  "rank": 0, "team_slug": "design",      "roster_label": null,       "callout_label": null},
		{"role_name": "Sponsorship Director", "kind": "director",  "rank": 1, "team_slug": "sponsorship", "roster_label": null,       "callout_label": null},
		{"role_name": "Mentorship Director",  "kind": "director",  "rank": 2, "team_slug": null,          "roster_label": null,       "callout_label": null},
		{"role_name": "Outreach Director",    "kind": "director",  "rank": 3, "team_slug": "outreach",    "roster_label": null,       "callout_label": null},
		{"role_name": "Workshop Director",    "kind": "director",  "rank": 4, "team_slug": "workshop",    "roster_label": null,       "callout_label": null},
		{"role_name": "Directors",            "kind": "director",  "rank": 5, "team_slug": null,          "roster_label": "Director", "callout_label": "Director"},
		{"role_name": "KH IX Team",           "kind": "team",      "rank": 1, "team_slug": "hackathon",   "roster_label": null,       "callout_label": "Organizer"},
		{"role_name": "Sponsorship Team",     "kind": "team",      "rank": 1, "team_slug": "sponsorship", "roster_label": null,       "callout_label": null},
		{"role_name": "Workshop Team",        "kind": "team",      "rank": 1, "team_slug": "workshop",    "roster_label": null,       "callout_label": null},
		{"role_name": "Design Team",          "kind": "team",      "rank": 1, "team_slug": "design",      "roster_label": null,       "callout_label": null},
		{"role_name": "Outreach Team",        "kind": "team",      "rank": 1, "team_slug": "outreach",    "roster_label": null,       "callout_label": null},
		{"role_name": "Dev Team",             "kind": "team",      "rank": 1, "team_slug": "development", "roster_label": null,       "callout_label": null}
	]';
	resolved_count integer;
	missing_team_roles text;
	missing_other_roles text;
BEGIN
	CREATE TEMP TABLE "forge_club_role_seed" ON COMMIT DROP AS
	SELECT *
	FROM jsonb_to_recordset(role_seed) AS seed(
		role_name text,
		kind text,
		"rank" integer,
		team_slug text,
		roster_label text,
		callout_label text
	);

	SELECT count(*) INTO resolved_count
	FROM "forge_club_role_seed" AS seed
	WHERE EXISTS (
		SELECT 1 FROM "auth_roles" AS role WHERE role."name" = seed.role_name
	);

	IF resolved_count = 0 THEN
		RAISE NOTICE 'Club team backfill: no linked Blade role matches any configured club roster role, so there is nothing to classify. This is expected on a new database.';
		RETURN;
	END IF;

	SELECT string_agg(quote_literal(seed.role_name), ', ' ORDER BY seed.role_name)
	INTO missing_team_roles
	FROM "forge_club_role_seed" AS seed
	WHERE seed.kind = 'team'
		AND NOT EXISTS (
			SELECT 1 FROM "auth_roles" AS role WHERE role."name" = seed.role_name
		);

	IF missing_team_roles IS NOT NULL THEN
		RAISE EXCEPTION
			'Club team backfill: no auth_roles row is named %. Each of these names is the only membership role for a club team, so classifying without it would publish that team empty. Link or rename the Blade role, then re-run the migration.',
			missing_team_roles;
	END IF;

	SELECT string_agg(quote_literal(seed.role_name), ', ' ORDER BY seed.role_name)
	INTO missing_other_roles
	FROM "forge_club_role_seed" AS seed
	WHERE seed.kind <> 'team'
		AND NOT EXISTS (
			SELECT 1 FROM "auth_roles" AS role WHERE role."name" = seed.role_name
		);

	IF missing_other_roles IS NOT NULL THEN
		RAISE NOTICE 'Club team backfill: no auth_roles row is named %. Those roles are left unclassified; nobody is removed from a bucket by their absence.', missing_other_roles;
	END IF;

	INSERT INTO "knight_hacks_club_team_role"
		("role_id", "kind", "rank", "team_id", "roster_label", "callout_label")
	SELECT role."id", seed.kind, seed."rank", team."id", seed.roster_label, seed.callout_label
	FROM "forge_club_role_seed" AS seed
	INNER JOIN "auth_roles" AS role ON role."name" = seed.role_name
	LEFT JOIN "knight_hacks_club_team" AS team ON team."slug" = seed.team_slug
	ON CONFLICT ("role_id") DO NOTHING;
END $$;
