# Utils Package Migration Status

## Overview
This document tracks the progress of migrating utility functions from various locations into the centralized `@forge/utils` package.

## What Has Been Done ✅

### 1. Created `@forge/utils` Package
- Created new package at `packages/utils/`
- Set up package.json with proper dependencies
- Configured TypeScript, ESLint, and build setup

### 2. Migrated Functions to `@forge/utils`

#### Discord Utilities (`packages/utils/src/discord.ts`)
- ✅ `api` - Discord REST API client
- ✅ `addRoleToMember`
- ✅ `removeRoleFromMember`
- ✅ `addMemberToServer`
- ✅ `handleDiscordOAuthCallback`
- ✅ `resolveDiscordUserId`
- ✅ `isDiscordAdmin`
- ✅ `isDiscordMember`
- ✅ `isDiscordVIP`
- ✅ `log` - Discord logging function

#### Permissions (`packages/utils/src/permissions.ts`)
- ✅ `hasPermission`
- ✅ `controlPerms` (with `or` and `and` methods)
- ✅ `isJudgeAdmin`
- ✅ `getJudgeSessionFromCookie`
- ✅ `getPermsAsList`

#### Time Utilities (`packages/utils/src/time.ts`)
- ✅ `formatHourTime`
- ✅ `formatDateRange`

#### Other Utilities
- ✅ `logger` (`packages/utils/src/logger.ts`) - Console logger wrapper
- ✅ `stripe` (`packages/utils/src/stripe.ts`) - Stripe client
- ✅ `env` (`packages/utils/src/env.ts`) - Environment variables

### 3. Updated Imports Across Codebase
- ✅ All API package routers now import from `@forge/utils`
- ✅ Auth package updated to use `@forge/utils`
- ✅ Email package updated to use `@forge/utils`
- ✅ DB scripts updated to use `@forge/utils`
- ✅ No remaining imports from old `../utils` path in API package

### 4. Email Package Migration
- ✅ Moved `sendEmail` function to `@forge/email` package
- ✅ Updated email package to use `@forge/utils` logger

## What's Left To Do ⚠️

### 1. Duplicate Functions (High Priority)

#### `formatDateRange` - NAMING CONFLICT ⚠️
- **Location 1**: `apps/blade/src/lib/utils.ts:29`
  - Formats date ranges: "Jan 1 - Jan 15, 2024" (dates only)
  - Uses `toLocaleDateString` with month/day/year
- **Location 2**: `packages/utils/src/time.ts:36`
  - Formats time ranges: "9:00am - 5:00pm" (times only)
  - Uses `formatHourTime` helper
- **Status**: These are DIFFERENT functions with the same name!
- **Action Required**: 
  - Rename one of them to avoid confusion
  - Recommended: Rename utils version to `formatTimeRange` (more accurate)
  - Or: Rename blade version to `formatDateRangeOnly` or similar
  - These serve different purposes and both should exist

#### `getPermsAsList`
- **Location 1**: `apps/blade/src/lib/utils.ts:120`
- **Location 2**: `packages/utils/src/permissions.ts:95`
- **Status**: Function exists in both places
- **Used in**:
  - `apps/blade/src/app/_components/admin/roles/roleedit.tsx`
  - `apps/blade/src/app/_components/admin/roles/roletable.tsx`
  - `apps/blade/src/app/_components/navigation/session-navbar.tsx`
- **Action Required**:
  - Update all imports in blade app to use `@forge/utils`
  - Remove duplicate definition from `apps/blade/src/lib/utils.ts`

### 2. Remaining Functions in Old `packages/api/src/utils.ts`

The following functions are still in the old utils file and may need to be migrated or kept:

- `gmail` - Google Gmail API client (may stay in API package)
- `calendar` - Google Calendar API client (may stay in API package)
- `generateJsonSchema` - Form schema generation (form-specific, may stay)
- `regenerateMediaUrls` - Form media URL regeneration (form-specific, may stay)
- `CreateFormSchema` - Form schema type (form-specific, may stay)
- `createForm` - Form creation function (form-specific, may stay)

**Decision Needed**: These are form-specific utilities. Should they:
1. Stay in API package (recommended - they're domain-specific)
2. Move to a separate `@forge/forms` package
3. Move to `@forge/utils` (not recommended - too domain-specific)

### 3. Other App-Specific Utils

#### `apps/blade/src/lib/utils.ts`
Contains app-specific utilities that should likely stay:
- `formatDateTime` - Blade-specific date formatting
- `getFormattedDate` - Blade-specific date formatting
- `getTagColor` - Event tag color mapping (Blade-specific)
- `getClassTeam` - Hackathon class team mapping (Blade-specific)
- `extractProcedures` - tRPC procedure extraction (Blade-specific)

**Status**: These are app-specific and should remain in the blade app.

## Migration Statistics

- **Old utils.ts exports**: 6 items (mostly form-specific)
- **New @forge/utils exports**: 21 items
- **Files importing from old utils**: 0 ✅
- **Files importing from new utils**: 23 ✅
- **Duplicate utility functions**: 2 ⚠️

## Next Steps

1. **Immediate Actions**:
   - [ ] **Resolve naming conflict**: Rename `formatDateRange` in `@forge/utils` to `formatTimeRange` (or rename blade version)
   - [ ] Update `apps/blade/src/lib/utils.ts` to import `getPermsAsList` from `@forge/utils`
   - [ ] Update all blade app files using `getPermsAsList` to import from `@forge/utils`
   - [ ] Remove duplicate `getPermsAsList` definition from `apps/blade/src/lib/utils.ts`

2. **Verification**:
   - [ ] Test all affected components after migration
   - [ ] Run static analysis again to confirm no duplicates remain
   - [ ] Verify both date/time formatting functions work correctly after renaming

3. **Documentation**:
   - [ ] Update any documentation referencing old utils paths
   - [ ] Document which utilities belong in `@forge/utils` vs app-specific utils

## Running Analysis

To re-run the analysis scripts:

```bash
# Find duplicate functions and code blocks
npx tsx scripts/analyze-duplicates.ts

# Find utils migration status
npx tsx scripts/analyze-utils-migration.ts
```
