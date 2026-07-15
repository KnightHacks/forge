import type { Page } from "playwright/test";
import { expect, test } from "playwright/test";

import { PERMISSIONS } from "@forge/consts";
import { eq, inArray } from "@forge/db";
import { db } from "@forge/db/client";
import { Permissions, Roles, User } from "@forge/db/schemas/auth";
import {
  FormResponse,
  FormSections,
  FormsSchemas,
  Member,
} from "@forge/db/schemas/knight-hacks";

const USER_ID = "00000000-0000-4000-8000-000000009101";
const MEMBER_ID = "00000000-0000-4000-8000-000000009102";
const ROLE_ID = "00000000-0000-4000-8000-000000009103";
const SECTION_ID = "00000000-0000-4000-8000-000000009104";
const FORM_SLUG = "forms-platform-e2e";

function permissionBitstring(...keys: PERMISSIONS.PermissionKey[]) {
  const maxIndex = Math.max(
    ...Object.values(PERMISSIONS.PERMISSION_DATA).map(({ idx }) => idx),
  );
  const bits = Array.from({ length: maxIndex + 1 }, () => "0");
  for (const key of keys) {
    const permission = PERMISSIONS.PERMISSION_DATA[key];
    if (!permission) throw new Error(`Unknown permission: ${key}`);
    bits[permission.idx] = "1";
  }
  return bits.join("");
}

async function cleanup() {
  const forms = await db
    .select({ id: FormsSchemas.id })
    .from(FormsSchemas)
    .where(eq(FormsSchemas.slugName, FORM_SLUG));
  if (forms.length > 0) {
    await db.delete(FormResponse).where(
      inArray(
        FormResponse.form,
        forms.map(({ id }) => id),
      ),
    );
    await db.delete(FormsSchemas).where(
      inArray(
        FormsSchemas.id,
        forms.map(({ id }) => id),
      ),
    );
  }
  await db.delete(Member).where(eq(Member.id, MEMBER_ID));
  await db.delete(Permissions).where(eq(Permissions.userId, USER_ID));
  await db.delete(User).where(eq(User.id, USER_ID));
  await db.delete(FormSections).where(eq(FormSections.id, SECTION_ID));
  await db.delete(Roles).where(eq(Roles.id, ROLE_ID));
}

async function seed() {
  await cleanup();
  await db.insert(Roles).values({
    discordRoleId: "forms-platform-officer-e2e",
    id: ROLE_ID,
    name: "Forms Platform Officer E2E",
    permissions: permissionBitstring("IS_OFFICER"),
  });
  await db.insert(User).values({
    discordUserId: "forms-platform-user-e2e",
    email: "forms-platform@example.test",
    id: USER_ID,
    name: "Forms Platform User E2E",
  });
  await db.insert(Permissions).values({ roleId: ROLE_ID, userId: USER_ID });
  await db.insert(Member).values({
    about: "Forms platform browser fixture",
    age: 22,
    company: null,
    dateCreated: "2026-07-15",
    discordUser: "forms-platform-user-e2e",
    dob: "2004-01-01",
    email: "forms-platform@example.test",
    firstName: "Forms",
    gender: "Prefer not to answer",
    githubProfileUrl: "",
    gradDate: "2027-05-01",
    guildProfileVisible: false,
    id: MEMBER_ID,
    lastName: "Tester",
    levelOfStudy: "Undergraduate University (3+ year)",
    linkedinProfileUrl: "",
    major: "Computer Science",
    phoneNumber: "407-555-0199",
    points: 0,
    profilePictureUrl: null,
    raceOrEthnicity: "Prefer not to answer",
    resumeUrl: null,
    school: "University of Central Florida",
    shirtSize: "M",
    tagline: "Forms tester",
    timeCreated: "12:00:00",
    userId: USER_ID,
    websiteUrl: "",
  });
  await db.insert(FormSections).values({
    id: SECTION_ID,
    name: "Forms Platform E2E",
  });
}

async function signIn(page: Page, callbackURL: string) {
  await page.goto(
    `/api/e2e/signin?userId=${USER_ID}&callbackURL=${encodeURIComponent(callbackURL)}`,
  );
}

test.describe("forms platform cross-surface journey", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(seed);
  test.afterAll(cleanup);

  test("[TC-001, TC-006, TC-008, TC-021, TC-025] creates, publishes, responds, reviews, and inspects", async ({
    page,
  }) => {
    await signIn(page, "/admin/forms/sections");
    await page.getByRole("button", { name: "Create section" }).click();
    const sectionDialog = page.getByRole("dialog", { name: "Create section" });
    await expect(sectionDialog).toBeVisible();
    await expect(
      sectionDialog.getByText("Forms Platform Officer E2E"),
    ).toHaveCount(0);
    await sectionDialog.getByRole("button", { name: "Cancel" }).click();

    await page.goto("/admin/forms/new");
    await expect(
      page.getByRole("heading", { name: "Create form" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(
      page.getByRole("dialog", { name: "Availability & access" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    await page
      .getByRole("textbox", { name: "Title" })
      .fill("Forms Platform E2E");
    await page
      .getByRole("textbox", { name: "Stable link slug" })
      .fill(FORM_SLUG);
    await page
      .getByRole("textbox", { name: "Description" })
      .fill("A browser-tested direct-link form.");
    await page.getByRole("button", { name: "Add question" }).click();
    await expect(
      page.getByRole("combobox", { name: "Question 1 type" }),
    ).toHaveText("Short answer");
    await page
      .getByRole("textbox", { name: "Question 1" })
      .fill("What should we build next?");
    await page.getByRole("button", { name: "Add question" }).click();
    await page
      .getByRole("textbox", { name: "Question 2" })
      .fill("Optional context");
    const questionRows = page.locator("[data-sortable-question]");
    const secondQuestion = questionRows.nth(1);
    await secondQuestion
      .getByRole("combobox", { name: "Question 2 type" })
      .click();
    await page
      .getByRole("option", { exact: true, name: "Multiple choice" })
      .click();
    const firstOption = secondQuestion.getByRole("textbox", {
      name: "Option 1",
    });
    await firstOption.press("Enter");
    await expect(
      secondQuestion.getByRole("textbox", { name: "Option 2" }),
    ).toHaveValue("Option 2");

    await page.getByRole("button", { name: "Add question" }).click();
    await page
      .getByRole("textbox", { name: "Question 3" })
      .fill("How useful was this?");
    const thirdQuestion = questionRows.nth(2);
    await thirdQuestion
      .getByRole("combobox", { name: "Question 3 type" })
      .click();
    await page.getByRole("option", { name: "Linear scale" }).click();
    await thirdQuestion.getByRole("spinbutton", { name: "Minimum" }).fill("0");
    await thirdQuestion.getByRole("spinbutton", { name: "Maximum" }).fill("10");
    await expect(
      thirdQuestion.getByText("Linear scale preview"),
    ).toBeAttached();

    const firstHandle = page.getByRole("button", {
      name: "Drag question 1 to reorder",
    });
    const secondHandle = page.getByRole("button", {
      name: "Drag question 2 to reorder",
    });
    const firstHandleBox = await firstHandle.boundingBox();
    const secondHandleBox = await secondHandle.boundingBox();
    if (!firstHandleBox || !secondHandleBox) {
      throw new Error("Question drag handles were not laid out.");
    }
    await page.mouse.move(
      secondHandleBox.x + secondHandleBox.width / 2,
      secondHandleBox.y + secondHandleBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      firstHandleBox.x + firstHandleBox.width / 2,
      firstHandleBox.y + firstHandleBox.height / 2,
      { steps: 8 },
    );
    await page.mouse.up();
    await page.waitForTimeout(100);
    await expect(
      questionRows.nth(0).getByRole("textbox", { name: "Question 1" }),
    ).toHaveValue("Optional context");
    await expect(
      questionRows.nth(1).getByRole("textbox", { name: "Question 2" }),
    ).toHaveValue("What should we build next?");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(/\/admin\/forms\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("published")).toBeVisible();

    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/admin/forms");
    const sectionSelect = page.locator(
      'select[aria-label="Form section"]:visible',
    );
    await expect(sectionSelect).toBeVisible();
    await sectionSelect.selectOption({ label: "Forms Platform E2E" });
    await expect(page).toHaveURL(new RegExp(`section=${SECTION_ID}`));
    await expect(sectionSelect).toHaveValue(SECTION_ID);
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);

    await page.goto(`/form/${FORM_SLUG}`);
    await expect(
      page.getByRole("heading", { name: "Forms Platform E2E" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to dashboard" }),
    ).toBeVisible();
    await page
      .getByRole("group", { name: "Optional context" })
      .getByRole("radio", { name: "Option 1" })
      .check();
    const answer = page
      .getByRole("group", { name: "What should we build next?" })
      .getByRole("textbox");
    const submitButton = page.getByRole("button", { name: "Submit response" });
    await expect(submitButton).toBeInViewport();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    expect(
      await answer.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
    ).toBeGreaterThanOrEqual(16);
    await answer.fill("More club tools");
    await page.getByRole("button", { name: "Submit response" }).click();
    await expect(
      page.getByRole("heading", { name: "Your submitted response" }),
    ).toBeVisible();
    const submittedAnswers = page.getByRole("region", {
      name: "Submitted answers",
    });
    await expect(
      submittedAnswers.getByText("Option 1", { exact: true }),
    ).toBeVisible();
    await expect(submittedAnswers).not.toContainText('{"kind":"option"');

    await page.goto("/member/forms");
    await expect(
      page.getByRole("heading", { name: "Previous forms" }),
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="card-title"]:visible', {
        hasText: "Forms Platform E2E",
      }),
    ).toBeVisible();
    await page.locator("a:visible", { hasText: "Review response" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/form/${FORM_SLUG}\\?responseId=[0-9a-f-]+$`),
    );
    await expect(
      page.getByRole("link", { name: "Back to dashboard" }),
    ).toBeVisible();
    await expect(page.getByText("Review your response")).toHaveCount(0);

    const form = await db.query.FormsSchemas.findFirst({
      where: eq(FormsSchemas.slugName, FORM_SLUG),
    });
    if (!form) throw new Error("E2E form was not saved.");
    const submittedResponse = await db.query.FormResponse.findFirst({
      where: eq(FormResponse.form, form.id),
    });
    if (
      !submittedResponse ||
      typeof submittedResponse.responseData !== "object" ||
      submittedResponse.responseData === null
    ) {
      throw new Error("E2E response was not saved.");
    }
    const questionId = Object.entries(submittedResponse.responseData).find(
      ([, value]) => value === "More club tools",
    )?.[0];
    if (!questionId) throw new Error("E2E response has no answer key.");
    await db.insert(FormResponse).values(
      Array.from({ length: 59 }, (_, index) => ({
        form: form.id,
        formRevision: submittedResponse.formRevision,
        responseData: {
          [questionId]: `More club tools ${index + 2} ${"with detailed context ".repeat(8)}`,
        },
        responseSnapshot: submittedResponse.responseSnapshot,
        userId: USER_ID,
      })),
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/admin/forms/${form.id}/responses`);
    await expect(
      page.getByRole("heading", { name: "Forms Platform E2E" }),
    ).toBeVisible();
    const boundedAnswers = page.locator('[data-answer-density="bounded"]');
    await expect(boundedAnswers.getByText(/More club tools 60/)).toBeAttached();
    await expect(page.getByText("60 responses")).toBeVisible();
    await expect(boundedAnswers).toHaveCSS("overflow-y", "auto");
    expect(
      (await boundedAnswers.boundingBox())?.height ?? Infinity,
    ).toBeLessThanOrEqual(288);
    await page.setViewportSize({ width: 320, height: 740 });
    await page.reload();
    await expect(boundedAnswers.getByText(/More club tools 60/)).toBeAttached();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.getByRole("tab", { name: "Responses" }).click();
    await expect(
      page.locator("p:visible", { hasText: "Forms Tester" }).first(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "View response" })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page.getByText("More club tools")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCSS("max-height", "740px");
  });
});
