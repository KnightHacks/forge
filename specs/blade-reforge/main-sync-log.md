# Main Sync Log

Use this file to record each merge from `main` into `reforge/main`.

## Template

```md
## YYYY-MM-DD

Merged main commit: `<sha>`

### Conflicts
- `<file>`
  - Resolution: <took reforge | took main | reconciled | ported fix>
  - Reason: <why>
  - Related specs/tests: <IDs or paths>

### Main changes ported
- <change>

### Main changes intentionally not ported
- <change>
  - Reason: <why>

### Follow-ups
- [ ] <task>
```
