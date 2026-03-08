# Phase 2: Unit Tests Plan

## Status
- ✅ Split hasPermission tests into separate files (1 describe per file)
- 🔄 Fix testDb initialization issue in permission tests
- ⏳ Create unit tests for all utils functions

## Proposed Unit Test Coverage

### 1. Permissions (`@forge/utils/src/permissions.ts`)
- ✅ `hasPermission()` - basic bit checking
- ✅ `controlPerms.or()` - OR logic with database
- ✅ `controlPerms.and()` - AND logic with database  
- ✅ IS_OFFICER overwrite functionality
- ⏳ `getPermsAsList()` - convert permission string to list

### 2. Time Utilities (`@forge/utils/src/time.ts`)
- ⏳ `formatHourTime()` - 12-hour format with AM/PM
- ⏳ `formatTimeRange()` - time range formatting
- ⏳ `formatDateRange()` - date range formatting
- ⏳ `formatDateTime()` - date-time with timezone adjustment
- ⏳ `getFormattedDate()` - simple date formatting with +1 day adjustment

### 3. Events Utilities (`@forge/utils/src/events.ts`)
- ⏳ `getTagColor()` - Tailwind CSS color mapping for event tags

### 4. Hackathons Utilities (`@forge/utils/src/hackathons.ts`)
- ⏳ `getClassTeam()` - team info mapping for hacker classes

### 5. Forms Utilities (`@forge/utils/src/forms.ts`)
- ⏳ `createJsonSchemaValidator()` - JSON schema validation creation
- ⏳ Form field type validation (SHORT_ANSWER, PARAGRAPH, EMAIL, PHONE, DATE, TIME, NUMBER, etc.)
- ⏳ Options handling for MULTIPLE_CHOICE, DROPDOWN, CHECKBOXES
- ⏳ Min/max validation logic
- ⏳ `generateJsonSchema()` - full form schema generation
- ⏳ `regenerateMediaUrls()` - presigned URL regeneration (with mocked MinIO client)

### 6. Discord Utilities (`@forge/utils/src/discord.ts`)
- ⏳ `addRoleToMember()` - add Discord role (using dev guild)
- ⏳ `removeRoleFromMember()` - remove Discord role (using dev guild)
- ⏳ `isDiscordAdmin()` - check if user is admin (using dev guild)
- ⏳ `isDiscordMember()` - check if user is member (using dev guild)
- ⏳ `isDiscordVIP()` - check if user is VIP (using dev guild)
- ⏳ `resolveDiscordUserId()` - resolve username to Discord ID (using dev guild)
- ⏳ `log()` - Discord logging (using dev log channel)

### 7. Google Calendar Utilities (`@forge/utils/src/google.ts`)
- ⏳ Calendar client initialization
- ⏳ Event creation/management (using test calendar ID)

### 8. CronBuilder (`apps/cron/src/structs/CronBuilder.ts`)
- ⏳ Constructor - name and color initialization
- ⏳ `addCron()` - adding cron jobs (chaining)
- ⏳ `schedule()` - cron scheduling logic (mocked)
- ⏳ `_executor()` - executor wrapper with timing/error handling (mocked)

## Test Strategy

### Database Integration
- All tests that need database should use `testDb` from `setup/db.ts`
- Use fixtures from `setup/fixtures.ts` to create test data
- Query data back from database to verify, don't hardcode values
- Use `buildPermissionsMap()` helper to get permissions from database

### External Dependencies
- **Discord**: Use dev guild ID (defaults when `IS_PROD` is false)
- **Google Calendar**: Use test calendar ID from env
- **Stripe**: Skip for now (as requested)
- **MinIO**: Mock for unit tests, use real client for integration tests

### File Organization
- One `describe` block per test file
- Group related tests in same directory
- Use descriptive file names: `functionName.test.ts` or `feature.test.ts`

## Next Steps
1. Fix testDb initialization issue in permission tests
2. Complete permission tests (`getPermsAsList`)
3. Create time utility tests
4. Create events/hackathons utility tests
5. Create forms utility tests
6. Create Discord utility tests (with dev guild)
7. Create Google Calendar utility tests (with test calendar)
8. Create CronBuilder tests
