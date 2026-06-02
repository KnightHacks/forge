DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "knight_hacks_hackathon"
    GROUP BY "name"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add knight_hacks_hackathon_name_unique because duplicate hackathon names exist.';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "knight_hacks_hackathon" ADD CONSTRAINT "knight_hacks_hackathon_name_unique" UNIQUE("name");
