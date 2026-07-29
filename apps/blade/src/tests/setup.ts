// The `/vitest` entry point both registers the matchers and augments vitest's
// `Assertion` type. Importing `/matchers` and calling `expect.extend` manually
// registers them at runtime but leaves `toBeDisabled` and friends untyped, which
// then trips `no-unsafe-call`.
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";

// Shared by both test environments. Blade's default is `environment: "node"`,
// which 43 existing files rely on for `renderToStaticMarkup`. Tests that need a
// DOM opt in per file with:
//
//   /** @vitest-environment jsdom */
//
// WHEN TO WRITE A jsdom TEST
//
// Only for invariants that survive a redesign: permission gates,
// destructive-action guards, payment flows, and anything preventing data loss.
// The dues-invalidation dialog qualifies because it marks every paid member
// unpaid, and its only safeguards are client state.
//
// Do NOT write one to check that something renders, that a list has N rows,
// that a panel is open, or how anything is laid out. Those assertions break on
// every legitimate UI change while proving nothing about behavior — the failure
// mode this suite already has elsewhere, in the ~34 raw Tailwind class strings
// and 56 bespoke `data-*` attributes it asserts today.
//
// Query by role and accessible label, never by class, test id, or DOM shape. A
// test written that way keeps passing when the component is rebuilt, which is
// the entire point: it pins the contract, not the markup.
//
// Everything below has to stay safe under both environments, so the DOM-only
// work is guarded rather than assumed.
afterEach(async () => {
  if (typeof document === "undefined") return;
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
