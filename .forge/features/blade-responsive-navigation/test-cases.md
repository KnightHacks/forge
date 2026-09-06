# Blade responsive navigation test cases

## Navigation

1. Click a member or admin link with a delayed route response: the request starts immediately, progress is visible and the navigation target highlights before the response completes. Existing shell remains usable when Next can retain it; a page/layout skeleton covers streamed waits.
2. Complete the response, navigate again, then use back/forward: correct URL and current navigation return, with no stuck dimming or loading state.
3. Navigate rapidly to a second destination: newest destination wins and feedback clears when navigation settles.
4. Close a navigation drawer while navigating: progress survives the drawer unmount.
5. Cancel navigation using the unsaved-settings guard or a link callback: no request or progress. Modified clicks, downloads and same-page anchors retain native behavior.
6. Navigate via a button, URL filter or refresh: immediate shared feedback, preserved replace/push and scroll behavior.
7. A failed route resolves to its existing error UI and clears navigation feedback.

## Views and appearance

8. Change a URL-backed tab/selector: chosen value responds immediately, data remains correctly associated with its view, and back/forward restores URL state.
9. Open a route while its layout waits: Blade-branded skeleton fits desktop and 320px without horizontal overflow.
10. Submit a form search or issue filter: retain the application shell, show progress before the server responds, preserve search parameters and close the filter dialog immediately.
11. Reduced-motion mode keeps a visible static progress indicator and skeletons without pulsing. Status is accessible without relying on motion.

## Placement

Regression tests in Blade's loading test directory; high-value delayed route tests in Blade's existing Playwright suite. Existing mutation and unsaved-settings tests protect behavior outside navigation feedback.
