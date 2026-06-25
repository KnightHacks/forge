# Forge Inventory

Status: Draft.

This document owns monorepo inventory findings relevant to Blade Reforge.

## Current public repo shape observed

```txt
apps/
  2025
  blade
  bloomknights
  club
  cron
  gemiknights
  guild
  khix
  tk

packages/
  api
  auth
  consts
  db
  email
  ui
  utils
  validators
```

## Important coupling observation

Blade depends on many shared packages, including API, auth, consts, db, email, ui, utils, and validators. Shared package changes can affect other apps, so Reforge must treat package boundaries and compatibility as first-class concerns.

## Inventory tasks

- Map `@forge/*` imports per app.
- Identify shared package exports used by multiple apps.
- Identify legacy API/database behavior that must be preserved or adapted.
- Classify apps by migration risk: static/light, API-consuming, DB-writing, operational/cron.
