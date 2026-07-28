import { afterEach, describe, expect, it } from "vitest";

import {
  clearResumeDownloadSignal,
  readResumeDownloadSignal,
} from "~/app/_components/admin/analytics/resume-bundle-download-signal";
import { RESUME_BUNDLE_DOWNLOAD_COOKIE } from "~/consts/browser-storage";

const globalWithDocument = globalThis as { document?: { cookie: string } };

function setCookies(cookie: string) {
  globalWithDocument.document = { cookie };
  return globalWithDocument.document;
}

afterEach(() => {
  delete globalWithDocument.document;
});

describe("readResumeDownloadSignal", () => {
  it("finds the signal among the other cookies on the page", () => {
    setCookies(
      `session=abc; ${RESUME_BUNDLE_DOWNLOAD_COOKIE}=deadbeef.ready; theme=dark`,
    );

    expect(readResumeDownloadSignal()).toBe("deadbeef.ready");
  });

  it("returns null when the route handler has not reported yet", () => {
    setCookies("session=abc; theme=dark");

    expect(readResumeDownloadSignal()).toBeNull();
  });

  it("returns null when the page carries no cookies at all", () => {
    setCookies("");

    expect(readResumeDownloadSignal()).toBeNull();
  });

  it("does not mistake a different cookie for the signal", () => {
    setCookies(`other-${RESUME_BUNDLE_DOWNLOAD_COOKIE}=deadbeef.ready`);

    expect(readResumeDownloadSignal()).toBeNull();
  });

  it("decodes the percent-encoded value the route wrote", () => {
    setCookies(`${RESUME_BUNDLE_DOWNLOAD_COOKIE}=deadbeef.error%20state`);

    expect(readResumeDownloadSignal()).toBe("deadbeef.error state");
  });

  it("reads an already-emptied signal as an empty value, not a missing one", () => {
    setCookies(`${RESUME_BUNDLE_DOWNLOAD_COOKIE}=`);

    expect(readResumeDownloadSignal()).toBe("");
  });
});

describe("clearResumeDownloadSignal", () => {
  it("expires the cookie on the same path the route handler set", () => {
    const document = setCookies(
      `${RESUME_BUNDLE_DOWNLOAD_COOKIE}=deadbeef.ready`,
    );

    clearResumeDownloadSignal();

    expect(document.cookie).toBe(
      `${RESUME_BUNDLE_DOWNLOAD_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`,
    );
  });
});
