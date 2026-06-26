import type { Page } from "playwright/test";
import { expect, test } from "playwright/test";

import { and, eq, inArray, or } from "@forge/db";
import { db } from "@forge/db/client";
import { User } from "@forge/db/schemas/auth";
import { FormResponse, Member } from "@forge/db/schemas/knight-hacks";
import {
  MEMBER_CODE_OF_CONDUCT_URL,
  MEMBER_DASHBOARD_PATH,
  MEMBER_SIGNUP_FORM_ID,
  MEMBER_SIGNUP_FORM_SLUG,
} from "@forge/validators";

const DEFAULT_USER_ID = "00000000-0000-4000-8000-000000000101";
const EXISTING_MEMBER_USER_ID = "00000000-0000-4000-8000-000000000102";

const testUsers = [
  {
    discordUserId: "blade-e2e-default",
    email: "blade-e2e-default@example.test",
    id: DEFAULT_USER_ID,
    name: "Blade E2E Default",
  },
  {
    discordUserId: "blade-e2e-existing",
    email: "blade-e2e-existing@example.test",
    id: EXISTING_MEMBER_USER_ID,
    name: "Blade E2E Existing",
  },
];

const testUserIds = testUsers.map((user) => user.id);
const testEmails = [
  ...testUsers.map((user) => user.email),
  "blade-e2e-created@example.test",
  "blade-e2e-duplicate@example.test",
];
const testDiscordIds = testUsers.map((user) => user.discordUserId);
const testPhones = ["321-555-0101", "321-555-0102", "321-555-0103"];

const validSignup = {
  about: "I like building useful Knight Hacks tools.",
  company: "Knight Hacks",
  dob: "2000-02-03",
  email: "blade-e2e-created@example.test",
  firstName: "Ada",
  githubProfileUrl: "https://github.com/knighthacks",
  gradYear: 2027,
  lastName: "Lovelace",
  levelOfStudy: "Undergraduate University (3+ year)",
  linkedinProfileUrl: "https://www.linkedin.com/company/knight-hacks",
  major: "Computer Science",
  phoneNumber: "321-555-0101",
  school: "University of Central Florida",
  shirtSize: "M",
  tagline: "Builder of member flows",
  websiteUrl: "https://knighthacks.org",
};

const pdfPayload = {
  buffer: Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n"),
  mimeType: "application/pdf",
  name: "blade-e2e-resume.pdf",
};

const pngPayload = {
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  ),
  mimeType: "image/png",
  name: "blade-e2e-avatar.png",
};

function routeURL(path: string) {
  return new RegExp(`${path.replaceAll("/", "\\/")}$`);
}

async function cleanupE2EData() {
  await db
    .delete(FormResponse)
    .where(inArray(FormResponse.userId, testUserIds));

  await db
    .delete(Member)
    .where(
      or(
        inArray(Member.userId, testUserIds),
        inArray(Member.email, testEmails),
        inArray(Member.phoneNumber, testPhones),
      ),
    );

  await db
    .delete(User)
    .where(
      or(
        inArray(User.id, testUserIds),
        inArray(User.email, testEmails),
        inArray(User.discordUserId, testDiscordIds),
      ),
    );
}

async function seedE2EData() {
  await cleanupE2EData();

  await db.insert(User).values(
    testUsers.map((user) => ({
      discordUserId: user.discordUserId,
      email: user.email,
      emailVerified: true,
      id: user.id,
      image: null,
      name: user.name,
    })),
  );

  await db.insert(Member).values({
    about:
      "This seeded dashboard profile has enough Guild text to prove the social card layout behaves.",
    age: 24,
    company: "Knight Hacks",
    discordUser: "blade-e2e-existing",
    dob: "2000-02-03",
    email: "blade-e2e-existing@example.test",
    firstName: "Casey",
    gender: "Prefer not to answer",
    githubProfileUrl: "https://github.com/knighthacks",
    gradDate: "2027-05-02",
    guildProfileVisible: true,
    lastName: "Member",
    levelOfStudy: "Undergraduate University (3+ year)",
    linkedinProfileUrl: "https://www.linkedin.com/company/knight-hacks",
    major: "Computer Science",
    phoneNumber: "321-555-0102",
    raceOrEthnicity: "Prefer not to answer",
    school: "University of Central Florida",
    shirtSize: "M",
    tagline: "Seeded Guild profile",
    userId: EXISTING_MEMBER_USER_ID,
    websiteUrl: "https://knighthacks.org",
  });
}

async function signInAs(
  page: Page,
  userId = DEFAULT_USER_ID,
  callbackURL = MEMBER_DASHBOARD_PATH,
) {
  await page.goto(
    `/api/e2e/signin?userId=${encodeURIComponent(
      userId,
    )}&callbackURL=${encodeURIComponent(callbackURL)}`,
  );
}

async function chooseSelect(page: Page, triggerText: string, option: string) {
  await page.getByText(triggerText, { exact: true }).click();
  await page.getByRole("option", { exact: true, name: option }).click();
}

async function chooseComboBox(
  page: Page,
  buttonName: string,
  inputPlaceholder: string,
  option: string,
) {
  await page.getByRole("button", { exact: true, name: buttonName }).click();
  await page.getByPlaceholder(inputPlaceholder).fill(option);
  await page.getByText(option, { exact: true }).first().click();
}

async function fillSignupForm(
  page: Page,
  overrides: Partial<typeof validSignup> = {},
  { acceptCodeOfConduct = true }: { acceptCodeOfConduct?: boolean } = {},
) {
  const values = { ...validSignup, ...overrides };

  await page.getByPlaceholder("Lenny").fill(values.firstName);
  await page.getByPlaceholder("Dragonson").fill(values.lastName);
  await page.getByPlaceholder("tk@knighthacks.org").fill(values.email);
  await page.getByPlaceholder("123-456-7890").fill(values.phoneNumber);
  await page.locator('input[type="date"]').fill(values.dob);
  await chooseSelect(page, "Select shirt size", values.shirtSize);
  await chooseSelect(page, "Select level of study", values.levelOfStudy);
  await chooseComboBox(
    page,
    "Select your school",
    "Search school",
    values.school,
  );
  await chooseComboBox(page, "Select your major", "Search major", values.major);
  await page.locator('input[type="number"]').fill(String(values.gradYear));
  await page
    .getByPlaceholder("Knight Hacks, UCF, a company, or self-employed")
    .fill(values.company);
  await page
    .getByPlaceholder("Builder, designer, first-time hacker")
    .fill(values.tagline);
  await page
    .getByPlaceholder("Share a little about what you like building.")
    .fill(values.about);
  await page
    .getByPlaceholder("https://github.com/knighthacks")
    .fill(values.githubProfileUrl);
  await page
    .getByPlaceholder("https://www.linkedin.com/company/knight-hacks")
    .fill(values.linkedinProfileUrl);
  await page
    .getByPlaceholder("https://knighthacks.org")
    .fill(values.websiteUrl);

  if (acceptCodeOfConduct) {
    await page
      .getByLabel("I agree to follow the Knight Hacks Code of Conduct")
      .click();
  }
}

async function submitSignup(page: Page) {
  await page.getByRole("button", { name: "Create member profile" }).click();
}

async function getMember(userId: string) {
  return (
    (await db.query.Member.findFirst({
      where: eq(Member.userId, userId),
    })) ?? null
  );
}

async function getSignupResponse(userId: string) {
  return (
    (await db.query.FormResponse.findFirst({
      where: and(
        eq(FormResponse.userId, userId),
        eq(FormResponse.form, MEMBER_SIGNUP_FORM_ID),
      ),
    })) ?? null
  );
}

test.describe("initial member onboarding", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedE2EData();
  });

  test.afterAll(async () => {
    await cleanupE2EData();
  });

  test("shows public landing and protects the dashboard", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /Everything Knight Hacks, in one platform\./,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign in with Discord" }),
    ).toHaveAttribute("href", /\/api\/auth\/signin\?provider=discord/);
    await expect(page.getByText(/Welcome,/)).toHaveCount(0);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/Welcome,/)).toHaveCount(0);
  });

  test("routes authenticated users without a member profile into the code-owned signup form", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Sign in with Discord" }).click();

    await expect(page).toHaveURL(routeURL(`/form/${MEMBER_SIGNUP_FORM_SLUG}`));
    await expect(
      page.getByRole("heading", { name: "Build your Knight Hacks profile." }),
    ).toBeVisible();
    await expect(page.getByText("Your details")).toBeVisible();
    await expect(page.getByText("Academics")).toBeVisible();
    await expect(
      page.getByText("Guild profile", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Dues")).toHaveCount(0);
    await expect(page.getByText("Hackathon application")).toHaveCount(0);
  });

  test("keeps the dashboard skeleton shape stable while member state loads", async ({
    page,
  }) => {
    await signInAs(page, EXISTING_MEMBER_USER_ID);
    await page.route("**/api/trpc/member.getMember**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto(MEMBER_DASHBOARD_PATH);

    await expect(
      page
        .getByRole("region", { name: "Guild profile loading" })
        .locator(".animate-pulse")
        .first(),
    ).toBeVisible();
    await expect(page.locator("section").first()).toHaveClass(
      /lg:grid-cols-\[minmax/,
    );
    await expect(page.getByText("Welcome, Casey")).toBeVisible();
  });

  test("rejects missing required signup fields without creating records", async ({
    page,
  }) => {
    await signInAs(page, DEFAULT_USER_ID, `/form/${MEMBER_SIGNUP_FORM_SLUG}`);
    await submitSignup(page);

    await expect(page.getByText("First name is required.")).toBeVisible();
    await expect(page.getByText("Email is required.")).toBeVisible();
    await expect(
      page.getByText("You must accept the Knight Hacks Code of Conduct."),
    ).toBeVisible();
    await expect(page).toHaveURL(routeURL(`/form/${MEMBER_SIGNUP_FORM_SLUG}`));
    await expect.poll(() => getMember(DEFAULT_USER_ID)).toBeNull();
    await expect.poll(() => getSignupResponse(DEFAULT_USER_ID)).toBeNull();
  });

  test("rejects invalid signup values with field-safe feedback", async ({
    page,
  }) => {
    await signInAs(page, DEFAULT_USER_ID, `/form/${MEMBER_SIGNUP_FORM_SLUG}`);
    await fillSignupForm(page, {
      dob: `${new Date().getUTCFullYear() + 1}-01-01`,
      email: "bad-email",
      phoneNumber: "not-a-phone",
      websiteUrl: "knighthacks.org",
    });
    await submitSignup(page);

    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(
      page.getByText("Enter a 10 digit phone number or use 123-456-7890."),
    ).toBeVisible();
    await expect(
      page.getByText("You must be at least 16 years old to join Knight Hacks."),
    ).toBeVisible();
    await expect(
      page.getByText("Website URL must be a valid URL."),
    ).toBeVisible();
    await expect.poll(() => getMember(DEFAULT_USER_ID)).toBeNull();
  });

  test("requires Code of Conduct acceptance and links to the policy", async ({
    page,
  }) => {
    await signInAs(page, DEFAULT_USER_ID, `/form/${MEMBER_SIGNUP_FORM_SLUG}`);
    await fillSignupForm(
      page,
      { email: "blade-e2e-created@example.test", phoneNumber: "321-555-0103" },
      { acceptCodeOfConduct: false },
    );

    await expect(
      page.getByRole("link", { name: "Knight Hacks Code of Conduct" }),
    ).toHaveAttribute("href", MEMBER_CODE_OF_CONDUCT_URL);
    await submitSignup(page);

    await expect(
      page.getByText("You must accept the Knight Hacks Code of Conduct."),
    ).toBeVisible();
    await expect.poll(() => getMember(DEFAULT_USER_ID)).toBeNull();
    await expect.poll(() => getSignupResponse(DEFAULT_USER_ID)).toBeNull();
  });

  test("creates a member through forms.createResponse and redirects to the configured dashboard", async ({
    page,
  }) => {
    const memberCreateRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/trpc/member.createMember")) {
        memberCreateRequests.push(request.url());
      }
    });

    await signInAs(page, DEFAULT_USER_ID, `/form/${MEMBER_SIGNUP_FORM_SLUG}`);
    await fillSignupForm(page);

    const createResponseRequest = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        request.url().includes("/api/trpc/forms.createResponse"),
    );
    await submitSignup(page);
    await createResponseRequest;

    await expect(page).toHaveURL(routeURL(MEMBER_DASHBOARD_PATH));
    await expect(page.getByText("Welcome, Ada")).toBeVisible();
    await expect(page.getByText("Ada Lovelace")).toBeVisible();

    const member = await getMember(DEFAULT_USER_ID);
    const response = await getSignupResponse(DEFAULT_USER_ID);

    expect(member).toMatchObject({
      discordUser: "Blade E2E Default",
      email: "blade-e2e-created@example.test",
      firstName: "Ada",
      guildProfileVisible: true,
      lastName: "Lovelace",
      userId: DEFAULT_USER_ID,
    });
    expect(response?.responseData).toMatchObject({
      email: "blade-e2e-created@example.test",
      firstName: "Ada",
    });
    expect(memberCreateRequests).toHaveLength(0);
  });

  test("rolls back the form response when the member callback fails", async ({
    page,
  }) => {
    await signInAs(page, DEFAULT_USER_ID, `/form/${MEMBER_SIGNUP_FORM_SLUG}`);
    await fillSignupForm(page, {
      email: "blade-e2e-existing@example.test",
      phoneNumber: "321-555-0103",
    });
    await submitSignup(page);

    await expect(
      page.getByText(
        "A member profile with that email or phone number already exists.",
      ),
    ).toBeVisible();
    await expect.poll(() => getMember(DEFAULT_USER_ID)).toBeNull();
    await expect.poll(() => getSignupResponse(DEFAULT_USER_ID)).toBeNull();
  });

  test("shows explicit Guild visibility copy and updates only the visibility field", async ({
    page,
  }) => {
    await signInAs(page, DEFAULT_USER_ID, `/form/${MEMBER_SIGNUP_FORM_SLUG}`);
    await page.getByText("Guild profile visibility").scrollIntoViewIfNeeded();

    await expect(
      page.getByText(
        "Public profiles can be seen by other members on guild.knighthacks.org and by sponsors.",
      ),
    ).toBeVisible();
    await page.getByRole("switch").click();
    await expect(
      page.getByText(
        "Private profiles are still visible to sponsors. Public profiles are also visible to other members on guild.knighthacks.org.",
      ),
    ).toBeVisible();

    await fillSignupForm(page);
    await submitSignup(page);
    await expect(page).toHaveURL(routeURL(MEMBER_DASHBOARD_PATH));

    const member = await getMember(DEFAULT_USER_ID);
    expect(member).toMatchObject({
      email: "blade-e2e-created@example.test",
      guildProfileVisible: false,
    });
  });

  test("sends existing members directly to the social dashboard and signs them out", async ({
    page,
  }) => {
    await signInAs(page, EXISTING_MEMBER_USER_ID, "/");

    await expect(page).toHaveURL(routeURL(MEMBER_DASHBOARD_PATH));
    await expect(page.getByText("Welcome, Casey")).toBeVisible();
    await expect(page.getByText("Casey Member")).toBeVisible();
    await expect(page.getByText("Seeded Guild profile")).toBeVisible();
    await expect(page.getByText("Member profile active")).toHaveCount(0);
    await expect(page.getByText("MEMBER PROFILE")).toHaveCount(0);

    await page.getByRole("button", { name: "QR code" }).click();
    await expect(
      page.getByRole("dialog", { name: "Your QR code" }),
    ).toBeVisible();
    await expect(
      page.getByAltText("Knight Hacks account QR code"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.goto(`/form/${MEMBER_SIGNUP_FORM_SLUG}`);
    await expect(page).toHaveURL(routeURL(MEMBER_DASHBOARD_PATH));
    await expect(
      page.getByRole("heading", { name: "Build your Knight Hacks profile." }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("link", { name: "Sign in with Discord" }),
    ).toBeVisible();
  });

  test("previews and rejects selected uploads on the signup form", async ({
    page,
  }) => {
    await signInAs(page, DEFAULT_USER_ID, `/form/${MEMBER_SIGNUP_FORM_SLUG}`);

    await page
      .locator('input[accept="application/pdf,.pdf"]')
      .setInputFiles(pdfPayload);
    await expect(page.getByTitle("blade-e2e-resume.pdf preview")).toBeVisible();

    await page.locator('input[accept="application/pdf,.pdf"]').setInputFiles({
      buffer: Buffer.from("not a pdf"),
      mimeType: "text/plain",
      name: "resume.txt",
    });
    await expect(page.getByText("Resume must be a PDF.")).toBeVisible();

    await page
      .locator('input[accept="image/jpeg,image/png,image/gif,image/webp"]')
      .setInputFiles(pngPayload);
    await expect(page.locator('img[src^="blob:"]').first()).toBeVisible();

    await page
      .locator('input[accept="image/jpeg,image/png,image/gif,image/webp"]')
      .setInputFiles({
        buffer: Buffer.from("not an image"),
        mimeType: "text/plain",
        name: "avatar.txt",
      });
    await expect(
      page.getByText(
        "Profile picture must be a JPEG, PNG, GIF, or WebP image.",
      ),
    ).toBeVisible();
  });

  test("lets existing members replace and clear dashboard resume/profile picture uploads", async ({
    page,
  }) => {
    await signInAs(page, EXISTING_MEMBER_USER_ID);
    await expect(page.getByText("Welcome, Casey")).toBeVisible();

    await page
      .locator('input[accept="application/pdf,.pdf"]')
      .setInputFiles(pdfPayload);
    await expect(page.getByRole("dialog", { name: "Resume" })).toBeVisible();
    await expect(page.getByTitle("blade-e2e-resume.pdf preview")).toBeVisible();
    await expect
      .poll(async () => (await getMember(EXISTING_MEMBER_USER_ID))?.resumeUrl)
      .toContain(EXISTING_MEMBER_USER_ID);

    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog", { name: "Resume" })).toHaveCount(0);
    await page.getByRole("button", { name: "Remove" }).click();
    await expect
      .poll(async () => (await getMember(EXISTING_MEMBER_USER_ID))?.resumeUrl)
      .toBeNull();
    await expect(page.getByRole("button", { name: "View" })).toBeDisabled();

    await page
      .locator('input[accept="image/jpeg,image/png,image/gif,image/webp"]')
      .setInputFiles(pngPayload);
    await expect(
      page.getByAltText("Casey Member profile picture"),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          (await getMember(EXISTING_MEMBER_USER_ID))?.profilePictureUrl,
      )
      .toContain(EXISTING_MEMBER_USER_ID);

    await page.getByRole("button", { name: "Remove profile picture" }).click();
    await expect
      .poll(
        async () =>
          (await getMember(EXISTING_MEMBER_USER_ID))?.profilePictureUrl,
      )
      .toBeNull();
    await expect(page.getByText("CM")).toBeVisible();
  });

  test("does not render unsupported form slugs as member signup", async ({
    page,
  }) => {
    await signInAs(page, DEFAULT_USER_ID);

    const response = await page.goto("/form/unknown-slug");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Build your Knight Hacks profile." }),
    ).toHaveCount(0);
  });
});
