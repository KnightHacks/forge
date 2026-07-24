import { expect, test } from "playwright/test";

test.describe("Guild Collective public discovery", () => {
  test("is anonymous, searchable, and uses a dialog for filters", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { level: 1, name: "Guild Collective" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /edit your profile/i }),
    ).toHaveAttribute("href", "https://blade.knighthacks.org/member/settings");

    const cards = page.locator("article");
    const initialCardCount = await cards.count();
    const loadMore = page.getByRole("button", { name: "Load more" });
    if ((await loadMore.count()) > 0) {
      await loadMore.click();
      await expect.poll(() => cards.count()).toBeGreaterThan(initialCardCount);
      const firstAppendedCard = cards.nth(initialCardCount);
      await expect(firstAppendedCard).toHaveAttribute(
        "data-entrance-index",
        "0",
      );
      await firstAppendedCard.scrollIntoViewIfNeeded();
      await expect(firstAppendedCard).toBeVisible();

      const profileLinks = await cards
        .locator('a[href^="/members/"]')
        .evaluateAll((links) =>
          links.map((link) => link.getAttribute("href")).filter(Boolean),
        );
      expect(new Set(profileLinks).size).toBe(profileLinks.length);
    }

    await page.getByRole("button", { name: "Filters" }).click();
    await expect(
      page.getByRole("dialog", { name: "Filter the Guild" }),
    ).toBeVisible();
    await page.getByText("Current member", { exact: true }).click();
    await page.getByRole("button", { name: "Apply filters" }).click();

    await expect(page).toHaveURL(/status=current/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Guild Collective" }),
    ).toBeVisible();

    const filteredProfileLinks = page.locator('article a[href^="/members/"]');
    if ((await filteredProfileLinks.count()) > 0) {
      await filteredProfileLinks.first().click();
      await expect(
        page.getByRole("link", { name: "Back to the Guild" }),
      ).toHaveAttribute("href", /status=current/);
      await page.getByRole("link", { name: "Back to the Guild" }).click();
      await expect(page).toHaveURL(/status=current/);
    }

    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByText("Team members only", { exact: true }).click();
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/team=yes/);
    const teamCards = page.locator('article[data-team-member="true"]');
    await expect(teamCards.first()).toBeVisible();
    await expect(page.locator("article")).toHaveCount(await teamCards.count());

    const tenureLabel = await teamCards
      .first()
      .locator('[aria-label^="Member since"]')
      .getAttribute("aria-label");
    const memberSinceYear = tenureLabel?.match(/\d{4}$/)?.[0];
    if (!memberSinceYear) {
      throw new Error("The first team card did not expose a join year.");
    }

    await page.getByRole("button", { name: "Filters" }).click();
    const memberSinceFilter = page
      .getByText("Member since", { exact: true })
      .locator("..");
    await memberSinceFilter.getByRole("combobox").click();
    await page
      .getByRole("option", { name: memberSinceYear, exact: true })
      .click();
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(new RegExp(`joined=${memberSinceYear}`));

    const cohortCards = page.locator("article");
    await expect(cohortCards.first()).toBeVisible();
    const cohortTenures = await cohortCards
      .locator('[aria-label^="Member since"]')
      .evaluateAll((items) =>
        items.map((item) => item.getAttribute("aria-label")),
      );
    expect(
      cohortTenures.every((label) => label?.endsWith(memberSinceYear)),
    ).toBe(true);

    await cohortCards.locator('a[href^="/members/"]').first().click();
    await expect(
      page.getByRole("link", { name: "Back to the Guild" }),
    ).toHaveAttribute("href", new RegExp(`joined=${memberSinceYear}`));
  });

  test("opens semantic member pages without a detail modal", async ({
    page,
  }) => {
    await page.goto("/");

    const profileLinks = page.locator('article a[href^="/members/"]');
    if ((await profileLinks.count()) === 0) {
      await expect(page.getByText("No profiles found")).toBeVisible();
      return;
    }

    await profileLinks.first().click();

    await expect(page).toHaveURL(/\/members\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("link", { name: "Back to the Guild" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Guild profile", { exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const profileBounds = await page.evaluate(() => {
      const card = document.querySelector("main article");
      const backLink = Array.from(document.querySelectorAll("main a")).find(
        (link) => link.textContent.includes("Back to the Guild"),
      );
      if (!card || !backLink) throw new Error("Profile layout is incomplete.");

      const cardRect = card.getBoundingClientRect();
      const backRect = backLink.getBoundingClientRect();
      return {
        backLeft: Math.round(backRect.left),
        bottom: Math.round(cardRect.bottom),
        cardLeft: Math.round(cardRect.left),
        viewportHeight: window.innerHeight,
      };
    });
    expect(profileBounds.bottom).toBeLessThanOrEqual(
      profileBounds.viewportHeight,
    );
    expect(profileBounds.backLeft + 12).toBe(profileBounds.cardLeft);
  });

  test("uses the branded unavailable state for unknown profiles", async ({
    page,
  }) => {
    await page.goto("/members/00000000-0000-4000-8000-000000000999");

    await expect(
      page.getByRole("heading", { name: "Profile unavailable" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Explore the Guild" }),
    ).toHaveAttribute("href", "/");
  });

  test("fits the public directory at 320px without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ height: 800, width: 320 });
    await page.goto("/");

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await expect(page.getByRole("button", { name: "Filters" })).toBeVisible();
  });
});
