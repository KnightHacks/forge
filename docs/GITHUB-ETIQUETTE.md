# GitHub Etiquette

This guide covers how to work with GitHub in the Forge repository, including branch naming, commits, pull requests, and code review.

## Branch Naming

Branch names should follow the pattern: `app-or-package/descriptive-slug`

### Format

```
<app-or-package>/<descriptive-slug>
```

### Examples

```
blade/form-permissions
api/add-companies-router
2025/adds-sponsor-contact-button
db/user-profile-schema
ui/button-variant
guild/search-optimization
repo/deprecate-email-package
repo/update-dependencies
```

### Repository-Wide Changes

For changes that affect the entire repository (refactors, dependency updates, tooling changes), use the `repo/` prefix:

```
repo/deprecate-email-package
repo/update-dependencies
repo/migrate-to-pnpm-9
repo/add-prettier-config
```

### Guidelines

- Use the app or package name that's being modified
- For repository-wide changes, use `repo/` prefix
- Use lowercase with hyphens
- Be descriptive but concise
- Focus on what the change does, not how
- Commits will be squashed when merged into main, but to resolve conflicts on your branch, you may use either a squash merge or a rebase merge.

## Commit Messages

Keep commit messages professional and lowercase.

### Format

```
added user authentication flow
fixed event date rendering bug
updated member profile page layout
removed deprecated cron job
```

### Guidelines

- Use lowercase
- Be descriptive and clear
- No need for prefixes (feat, fix, chore)
- Keep it professional - this is a public OSS repo for a reputable nonprofit
- One logical change per commit is ideal, but not required

### Examples

**Good:**

```
added permission checks to events page
fixed typo in email template
updated dependencies to latest versions
```

**Avoid:**

```
stuff
asdfasdf
fixes
WIP DO NOT MERGE
```

## Issues

All work starts with an issue.

### Who Can Create Issues

Anyone can create issues:

- **Community members** can report bugs or request features
- **Developers** create issues for work items
- **External contributors** can create issues and pick them up

### Issue Assignment

- **During Standup**: Most issues are assigned to developers during team standups
- **Help Wanted**: Issues labeled `Help Wanted` are available for anyone to claim
- **Self-Assignment**: If you create an issue and want to work on it, assign yourself

### Issue Requirements

Every issue must have:

1. **At least one label** (see label guide below)
2. **An assignee** (if work has started or been claimed)

### Claiming an Issue

If you want to work on an issue:

1. Comment on the issue saying you're working on it
2. Assign yourself (if you have permissions) or ask a maintainer to assign you
3. Create a branch and start working

## Pull Requests

Every PR must follow specific requirements to pass automated checks.

### PR Title Format

**Required format:**

```
[#123] Description of changes
```

The title must start with `[#XYZ]` where XYZ is the issue number.

### Examples

**Good:**

```
[#45] Add event registration form
[#102] Fix member count display bug
[#87] Update permissions for club admins
```

**Bad:**

```
Add event registration form (missing issue number)
[45] Fix bug (missing # symbol)
added stuff [#45] (issue number not at start)
```

### PR Requirements

Every PR must have:

1. **Issue reference in title** - `[#123]` format
2. **At least one label** - Use labels to categorize the change
3. **At least one assignee** - Usually yourself
4. **Link to issue(s)** - Reference the issue(s) in the PR description

These are automatically validated by CI. Your PR will fail checks if any are missing.

### PR Description

A PR template is auto-populated when you create a PR. Fill it out completely:

- **What changed** - Describe your changes
- **Why** - Explain the reasoning
- **How to test** - Steps for reviewers to verify
- **Screenshots** (if applicable) - For UI changes

### Draft PRs

Draft PRs are encouraged for:

- Early feedback on approach
- Work in progress that needs discussion
- Large changes where you want direction before continuing

Mark your PR as "Ready for review" when it's complete.

## Labels

Use labels to categorize your PRs and issues. You must include at least one label.

### Scope Labels

Indicate which part of the codebase is affected:

- `API` - Changes to the global API/tRPC package
- `Blade` - Changes to Blade app
- `CRON` - Changes to CRON app
- `Database` - Changes to the DB package
- `Guild` - Changes to Guild app
- `Hack Sites` - Changes to hackathon apps (2025, gemiknights, etc.)
- `T.K` - Changes to T.K Discord bot
- `UI` - Changes to the global UI package
- `Global` - Changes affecting the entire repository

### Type Labels

Indicate the type of change:

- `Feature` - New feature or request
- `Bug` - Something isn't working
- `Documentation` - Improvements or additions to documentation

### Size Labels

Indicate the size of the change (affects number of reviewers needed):

- `Minor` - Small change, 1 reviewer required
- `Major` - Big change, 2+ reviewers required

### Status Labels

- `Help Wanted` - Needs assignment from a developer
- `Onboarding` - Good first issue for onboarding developers
- `Duplicate` - Issue or PR already exists

### Example Label Combinations

```
Issue: Add event form validation
Labels: Blade, Feature, Minor

Issue: Fix database connection timeout
Labels: Database, Bug, Minor

Issue: Refactor entire API router structure
Labels: API, Feature, Major

Issue: Update getting started guide
Labels: Documentation, Minor
```

## Code Review Process

### 1. CodeRabbit Review

All PRs are first reviewed by CodeRabbit (automated code review).

**Your responsibilities:**

- Read all CodeRabbit comments
- Either fix the issue or dismiss the comment with explanation
- Don't ignore CodeRabbit - resolve or dismiss all comments

### 2. CI Checks

All checks must pass before human review:

- **Lint** - Code follows linting rules
- **Format** - Code is properly formatted
- **Typecheck** - No TypeScript errors
- **Build** - Code builds successfully
- **PR Validation** - PR title, labels, and assignee are correct

**Run these locally before pushing:**

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm build
```

### 3. Human Review

Once CodeRabbit is resolved and CI passes, request review from the dev team.

**Review requirements:**

- **Minor changes** - 1 reviewer approval required
- **Major changes** - 2+ reviewer approvals required

**Review timeline:**

- Reviews typically take 1-3 days
- Be patient but feel free to follow up if it's been >3 days

### 4. Addressing Feedback

When reviewers request changes:

- Make the requested changes
- Respond to each comment when addressed
- Push new commits (don't force push unless necessary)
- Re-request review when ready

**Be receptive to feedback:**

- Assume good intent
- Ask questions if you don't understand
- Explain your reasoning if you disagree
- Remember: reviews make the code better

### 5. Merging

**Who can merge:**

- Maintainers can merge any PR
- Developers (including you) can merge their own PRs

**Merge requirements:**

- All CI checks must pass (no exceptions)
- Required approvals received
- CodeRabbit comments resolved or dismissed
- Conflicts resolved

**You cannot merge with failing checks.**

## Communication

### Where to Communicate

**Use PR comments for:**

- Questions about the code
- Requesting clarification
- Discussing implementation details
- Asking for help on your PR
- Responding to review feedback

**Avoid Discord for:**

- PR-specific discussions (these should be on GitHub)
- Code review feedback
- Technical implementation details

Discord is fine for general questions, but keep PR discussions on GitHub to avoid miscommunication and maintain a record.

### Tagging People

Tagging is appropriate when:

- Requesting review: `@username can you review this?`
- Asking for specific expertise: `@username do you know how this works?`
- Following up after 3+ days: `@username gentle ping on this PR`

Use tagging reasonably - don't spam tags on every comment.

### Asking for Help

If you're stuck on your PR:

1. Comment on the PR explaining what you're stuck on
2. Tag a developer: `@username could you help with X?`
3. Be specific about what you need help with
4. If urgent, mention in the dev Discord (but keep discussion on GitHub)

## Common Workflows

### Starting New Work

1. Find or create an issue for the work
2. Assign yourself to the issue
3. Create a branch: `blade/add-feature`
4. Make your changes
5. Run checks locally: `pnpm format && pnpm lint && pnpm typecheck && pnpm build`
6. Commit with descriptive message: `added feature X`
7. Push your branch

### Creating a Pull Request

1. Go to GitHub and create a PR
2. Title: `[#123] Add feature X`
3. Fill out the PR template completely
4. Add labels (at least one)
5. Add yourself as assignee
6. Reference the issue in description
7. Mark as draft if not ready for review

### Ready for Review

1. Mark PR as ready (if it was a draft)
2. Ensure all CI checks pass
3. Resolve all CodeRabbit comments
4. Request review from the team
5. Wait for feedback (1-3 days)

### After Review

1. Address all feedback
2. Respond to comments when fixed
3. Push new commits
4. Re-request review
5. Once approved and checks pass, merge!

## Best Practices

### Before Creating a PR

- Run all checks locally
- Test your changes thoroughly
- Review your own code first
- Make sure the issue is properly linked

### During Review

- Respond to feedback promptly
- Don't take feedback personally
- Ask questions if unclear
- Update your PR as needed

### After Merging

- Delete your branch
- Close the linked issue (if fully resolved)
- Celebrate! 🎉

## Getting Help

If you're unsure about any of this:

- Ask in the dev team Discord
- Comment on your PR or issue
- Tag a maintainer for clarification
- Review existing PRs for examples

## Common Mistakes

### Missing Issue Number in Title

**Wrong:** `Add event form`  
**Right:** `[#45] Add event form`

### No Labels

Every PR needs at least one label. Add them before requesting review.

### Merging with Failing Checks

You cannot merge with failing checks. Fix the issues first.

### Ignoring CodeRabbit

Resolve or dismiss all CodeRabbit comments. Don't leave them unaddressed.

### Wrong Branch Name

**Wrong:** `fix-bug`, `my-feature`  
**Right:** `blade/fix-event-bug`, `api/add-members-router`

## Examples

### Good PR

```
Title: [#123] Add event registration form to Blade
Labels: Blade, Feature, Minor
Assignee: @yourname
Description: [Filled out template completely with screenshots]
Status: All checks passing, CodeRabbit resolved
```

### Good Issue

```
Title: Add email validation to member signup
Labels: Blade, Feature, Minor
Assignee: @developer (or unassigned if Help Wanted)
Description: Clear description of the problem and expected behavior
```

### Good Commit

```
added email validation to member signup form
```

## Next Steps

- Read [CONTRIBUTING.md](../CONTRIBUTING.md) for general contribution guidelines
- Review [Getting Started](./GETTING-STARTED.md) for setup instructions
- Check out [API & Permissions](./API-AND-PERMISSIONS.md) for forge specific backend development guidelines
