# Blade navigation review media

Screenshots and videos are hosted as attachments on [PR #537](https://github.com/KnightHacks/forge/pull/537), not stored in the repository.

Captured from a local development server in Chromium. The full behavioral suite passed in headed mode; the final navigation videos use headless mode to capture the complete viewport. Navigation recordings use an isolated local database containing only the synthetic fixture from `apps/blade/src/tests/e2e/responsive-navigation.spec.ts`.

The tests deliberately hold route responses to verify feedback before completion. These clips demonstrate behavior, not production response times. Recording uses Playwright's 100 ms action pacing to make the steps readable; videos preserve the recorded timing.

| Evidence                                                                                                         | What to look for                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [Desktop navigation screenshot](https://github.com/user-attachments/assets/8e3d60f2-78b5-4c99-9012-4fc7a96c9b5b) | The Members destination highlights and the top progress bar appears while the current Forms page remains usable.                   |
| [Desktop navigation video](https://github.com/user-attachments/assets/a84c2db5-d4fd-4c5d-82da-5d2b8971b468)      | Immediate feedback, completed navigation, browser back, and a repeated navigation without stuck loading.                           |
| [Mobile navigation screenshot](https://github.com/user-attachments/assets/680d6b59-6730-4a79-a93b-a274df958362)  | The 320px drawer closes immediately, with a static progress indicator in reduced-motion mode.                                      |
| [Mobile navigation video](https://github.com/user-attachments/assets/2c5fe6c4-1715-4531-82c6-c952653b516c)       | Mobile menu selection, immediate dismissal, and the completed destination. The clip begins after the test's desktop sign-in setup. |
| [Desktop skeleton](https://github.com/user-attachments/assets/ff1f66c5-3079-4b7a-83c9-e257b12f2fa3)              | Blade's root fallback at 1440px, using the existing logo, tokens, and inset rows.                                                  |
| [Mobile skeleton](https://github.com/user-attachments/assets/08498076-fa25-4b76-aaa7-c16bc5d67051)               | The same fallback at 320px without horizontal overflow.                                                                            |

The root skeleton was captured by rendering the real `apps/blade/src/app/loading.tsx` through a temporary preview route, with reduced motion enabled for a stable frame. That preview route is not included in the change. The Next.js development indicator is visible in the captures.

To repeat the behavioral checks against a local test database:

```bash
pnpm --filter=@forge/blade run e2e responsive-navigation.spec.ts --headed
```

The standard Playwright configuration retains video only on failure. For these passing-run recordings, a temporary configuration enabled video recording; no permanent test configuration changed.
