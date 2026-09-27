import type { Locator, Page } from "playwright/test";
import { expect } from "playwright/test";

/**
 * Shared determinism harness for the visual-regression baselines.
 *
 * These baselines exist to catch one specific regression class that nothing
 * else in the repo can catch: Blade's layout leans on sibling-scoped Tailwind
 * (`space-y-*` compiles to `> * + *`, plus `divide-y`, `first:border-l-0`,
 * `last:border-r-0`, and flex/grid `gap`). Wrapping a run of siblings in a new
 * `<div>` during a component extraction silently deletes a gap or a divider.
 * That produces no type error, no lint error, and no unit-test failure — only
 * a pixel difference.
 *
 * Everything in this file exists to make that pixel difference the *only*
 * difference between two runs.
 */

/**
 * The instant the browser reports for `Date.now()` and `new Date()`.
 *
 * This only controls the *client*. Blade renders these surfaces from React
 * Server Components on a dev server running on the real system clock, so any
 * value the server derives from "now" is beyond reach here. The fixture data
 * and the URL filters are therefore pinned to absolute dates rather than
 * relying on this clock — see `visual-fixtures.ts`. This is the belt to that
 * pair of braces, and it covers client-side formatting.
 */
export const VISUAL_CLOCK = new Date("2026-01-15T17:00:00.000Z");

export const DESKTOP_VIEWPORT = { height: 1000, width: 1440 } as const;
export const MOBILE_VIEWPORT = { height: 844, width: 390 } as const;

/**
 * Kills every source of sub-pixel drift we can reach from CSS.
 *
 * Playwright's `toHaveScreenshot` already disables animations and hides the
 * caret, and it re-shoots until two consecutive frames match. This stylesheet
 * covers what that stabilisation cannot: layout that depends on whether a
 * scrollbar happens to be present. Chromium renders a classic 15px scrollbar
 * that consumes layout width, so a page that is one pixel taller than the
 * viewport reflows its entire content column. Removing scrollbars entirely
 * makes the content width a function of the viewport alone.
 */
const DETERMINISM_STYLE = `
  *, *::before, *::after {
    animation-delay: 0s !important;
    animation-duration: 0s !important;
    animation-iteration-count: 1 !important;
    transition-delay: 0s !important;
    transition-duration: 0s !important;
    scroll-behavior: auto !important;
    caret-color: transparent !important;
  }

  html { scrollbar-width: none !important; }
  *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }

  /*
   * The Next.js dev-overlay indicator. These baselines can only be generated
   * against \`next dev\` (the Playwright webServer runs it), so the badge is
   * always present and would otherwise be baked into every full-page capture —
   * where it also moves and changes shape as route compilation progresses.
   */
  nextjs-portal { display: none !important; }
`;

/**
 * Applies the page-level determinism controls that must be in place *before*
 * the first navigation.
 */
export async function preparePage(page: Page) {
  await page.clock.setFixedTime(VISUAL_CLOCK);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.addInitScript(`
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.setAttribute("data-visual-harness", "true");
      style.textContent = ${JSON.stringify(DETERMINISM_STYLE)};
      document.head.append(style);
    });
  `);
}

/**
 * Parks the pointer somewhere harmless and clears focus.
 *
 * The admin rail no longer expands from hover or focus — R-03 replaced that
 * with an explicit click-to-open toggle — so this only prevents a stray
 * focus ring from bleeding into a screenshot. The page gutter, outside the
 * `container`'s 1400px max-width, has no interactive content at desktop
 * widths.
 */
async function parkPointer(page: Page) {
  const viewport = page.viewportSize();
  if (!viewport) return;
  await page.mouse.move(viewport.width - 2, Math.round(viewport.height / 2));
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  });
}

/**
 * Waits for everything that would otherwise be captured mid-flight.
 */
export async function settle(page: Page) {
  await page.waitForLoadState("load");
  // Suspense fallbacks. Every admin route has a `loading.tsx` built from
  // `Skeleton`, which is `animate-pulse`; capturing one means capturing the
  // wrong tree entirely, not merely a wrong frame.
  await expect(page.locator(".animate-pulse")).toHaveCount(0);
  await expect(page.locator(".animate-spin")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await parkPointer(page);
}

/**
 * Signs in through the e2e auth route and lands on `callbackURL`.
 */
export async function signInAs(
  page: Page,
  userId: string,
  callbackURL: string,
) {
  await page.goto(
    `/api/e2e/signin?userId=${encodeURIComponent(userId)}&callbackURL=${encodeURIComponent(callbackURL)}`,
  );
  await settle(page);
}

/**
 * The screenshot assertion every baseline goes through.
 *
 * `maxDiffPixels` is deliberately small. The regression this suite hunts —
 * a deleted `space-y-6` gap — shifts every element below the wrapper by 24px,
 * which diffs in the tens of thousands of pixels on a content-rich page. A
 * budget of 120 absorbs font-antialiasing jitter without coming close to
 * hiding a missing gap.
 */
export async function expectVisualBaseline(
  page: Page,
  name: string,
  options: { fullPage?: boolean } = {},
) {
  await expect(page).toHaveScreenshot(name, {
    fullPage: options.fullPage ?? true,
    maxDiffPixels: 120,
    // Playwright re-shoots until two consecutive frames match. On a cold
    // `next dev` route the tall full-page captures need more than the 10s
    // `expect.timeout` in playwright.config.ts to get there.
    timeout: 30_000,
  });
}

/**
 * The same assertion, scoped to one element's own box.
 *
 * A sibling rather than a `{ element }` option on `expectVisualBaseline`,
 * because `fullPage` is meaningless for an element and the two option sets do
 * not overlap. Everything that makes a capture deterministic lives in
 * `preparePage` and `settle`, which are page-level and apply unchanged — this
 * function deliberately adds nothing of its own beyond the shared budget and
 * timeout, so the two helpers cannot drift.
 *
 * Use it where a full-page capture is impossible rather than merely
 * inconvenient. The role detail dialog is the case that forced it: the page
 * behind it comes from `roles.listLinks`, which takes no input and returns
 * every row in `Roles`, so the page can never be pinned to a fixture — but the
 * dialog itself is rendered from `?role=<uuid>` and holds exactly one role.
 *
 * The honest limit: `toHaveScreenshot` on a locator is relative to that
 * element's own box, so a region that was merely translated down the page
 * still passes. Pair every element capture with an assertion on document
 * order — see `visual-baselines.spec.ts`.
 */
export async function expectElementVisualBaseline(
  locator: Locator,
  name: string,
) {
  await expect(locator).toHaveScreenshot(name, {
    maxDiffPixels: 120,
    timeout: 30_000,
  });
}
