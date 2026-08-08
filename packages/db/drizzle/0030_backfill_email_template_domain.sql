-- Backfill `email_template.domain` for templates that predate the column.
--
-- 0027 added `domain text DEFAULT 'club' NOT NULL`, which stamped every
-- existing template `club`. That is wrong for a subset of them: before this
-- branch the personalization catalog was flat, so `hacker.status`,
-- `hackathon.displayName`, and `hackathon.name` were legal in ANY template.
-- Scoping the catalog by domain made those three illegal in a club template --
-- so a pre-existing template using one is now stamped with the one domain that
-- forbids it.
--
-- No call site can see this and no type checks it, because the breakage lives
-- entirely in row data. `previewTemplate`, `sendTest`, `saveTemplateDraft` and
-- the campaign send path all reach `assertFieldsAllowedForDomain`, so such a
-- template becomes unpreviewable, unsavable, and unsendable at once -- including
-- a campaign that sent fine last week. The officer sees an error naming a field,
-- never naming `domain`, so there is no path to self-diagnose it.
--
-- A template is re-stamped `hackathon` when it declares a `hacker.*` or
-- `hackathon.*` field in ANY revision and no `member.*`/`team.*` field in any
-- revision. Any revision rather than the newest, because `previewTemplate` can
-- render an older one and would hit the same assertion.
--
-- The second condition matters. A template mixing both families was legal under
-- the old flat catalog and is legal under neither domain now, so stamping it
-- `hackathon` would not fix it — it would only change which field the error
-- names, while also making it selectable in the hackathon status-email picker,
-- where it could be bound to mail an applicant receives. Those stay `club`:
-- still broken, but broken somewhere an officer can see rather than promoted
-- into the applicant path. They need a human decision, not a guess.
--
-- This only ever moves `club` -> `hackathon`, so it cannot demote a template an
-- officer classified by hand: `hackathon` is never the default and can only
-- have been set deliberately.
UPDATE "email_template" AS t
SET "domain" = 'hackathon'
WHERE t."domain" = 'club'
  AND EXISTS (
    SELECT 1
    FROM "email_template_revision" AS r,
         jsonb_array_elements(r."personalization_contract") AS c
    WHERE r."template_id" = t."id"
      AND c ->> 'field' ~ '^(hacker|hackathon)\.'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "email_template_revision" AS r,
         jsonb_array_elements(r."personalization_contract") AS c
    WHERE r."template_id" = t."id"
      AND c ->> 'field' ~ '^(member|team)\.'
  );
