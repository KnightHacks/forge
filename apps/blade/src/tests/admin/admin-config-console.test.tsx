/** @vitest-environment jsdom */
import type { ReactNode } from "react";
import { createElement } from "react";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";
import { DISCORD } from "@forge/consts";

import type {
  ClubRoleRow,
  ClubTeamRow,
} from "~/app/_components/admin/roles/club-classification-dialog";
import { AdminConfigConsole } from "~/app/_components/admin/roles/admin-config-console";
import { ClubClassificationSection } from "~/app/_components/admin/roles/club-classification-section";
import { DiscordConfigSection } from "~/app/_components/admin/roles/discord-config-section";
import AdminRolesConfigLoading from "~/app/admin/roles/config/loading";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";

interface MutationOptions {
  onError: (error: { message: string }) => void;
  onSuccess: () => void;
}

const mocks = vi.hoisted(() => ({
  captured: { club: null, discord: null } as {
    club: MutationOptions | null;
    discord: MutationOptions | null;
  },
  clubMutate: vi.fn(),
  discordMutate: vi.fn(),
  getPermissions: vi.fn(),
  listConfiguration: vi.fn(),
  listDiscord: vi.fn(),
  redirect: vi.fn(),
  refresh: vi.fn(),
  serverAuth: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

// `renderToStaticMarkup` cannot open a dialog, and every claim below is about
// what an officer can reach: the confirmation before a guild repoint, the
// disabled Save, the per-row pending state. Radix renders its dialog through a
// portal with focus management jsdom does not implement, so the primitive is
// replaced by a plain container, as `role-detail-dialog.test.tsx` already does.
vi.mock("@forge/ui/dialog", () => {
  const Container = ({ children, ...props }: { children: ReactNode }) =>
    createElement("div", props, children);
  return {
    Dialog: ({ children, open }: { children: ReactNode; open?: boolean }) =>
      open === false
        ? null
        : createElement("div", { role: "dialog" }, children),
    DialogContent: Container,
    DialogDescription: Container,
    DialogFooter: Container,
    DialogHeader: Container,
    DialogTitle: Container,
  };
});

vi.mock("@forge/ui/toast", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("~/server/auth", () => ({ auth: mocks.serverAuth }));

vi.mock("~/trpc/server", () => ({
  api: {
    clubTeams: { listConfiguration: mocks.listConfiguration },
    discordConfig: { list: mocks.listDiscord },
    roles: { getPermissions: mocks.getPermissions },
  },
}));

vi.mock("~/trpc/react", () => ({
  api: {
    clubTeams: {
      updateClassification: {
        useMutation: (options: MutationOptions) => {
          mocks.captured.club = options;
          return { isPending: false, mutate: mocks.clubMutate };
        },
      },
    },
    discordConfig: {
      update: {
        useMutation: (options: MutationOptions) => {
          mocks.captured.discord = options;
          return { isPending: false, mutate: mocks.discordMutate };
        },
      },
    },
  },
}));

type DiscordConfig = RouterOutputs["discordConfig"]["list"];
type DiscordRow = DiscordConfig["rows"][number];

// Every row carries the *same* description, which is the point of TC-004: the
// column reads identically for an inert key and a live one, so anything the
// screen says about usage has to come from somewhere else.
const SHARED_DESCRIPTION =
  "Discord snowflake used by the Knight Hacks platform.";

const CHANNEL_KEYS = new Set(["log_channel", "recruiting_channel"]);

function kindOf(key: DISCORD.ConfigKey): DiscordRow["kind"] {
  if (key === "guild") return "guild";
  return CHANNEL_KEYS.has(key) ? "channel" : "role";
}

function labelOf(key: DISCORD.ConfigKey) {
  return key.replaceAll("_", " ");
}

// Declaration order, which is already guild → channels → roles and is
// deliberately not alphabetical. The server sends this order; the client is
// asserted not to re-derive it.
const discordRows: DiscordRow[] = DISCORD.CONFIG_KEYS.map((key, index) => ({
  description: SHARED_DESCRIPTION,
  developmentId: index % 3 === 0 ? null : `99000000000000000${index % 10}`,
  key,
  kind: kindOf(key),
  label: labelOf(key),
  productionId: `48000000000000000${index % 10}`,
  readBy: DISCORD.CONFIG_KEY_CONSUMERS[key],
  resolvedId: `48000000000000000${index % 10}`,
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
}));

const teams: ClubTeamRow[] = [
  {
    classifiedRoleCount: 2,
    displayOrder: 1,
    heading: "The executive board",
    id: "10000000-0000-4000-8000-000000000001",
    kind: "executive",
    label: "Executives",
    slug: "executive",
  },
  {
    classifiedRoleCount: 1,
    displayOrder: 3,
    heading: "The people who make it look good",
    id: "10000000-0000-4000-8000-000000000002",
    kind: "team",
    label: "Design",
    slug: "design",
  },
];

const roles: ClubRoleRow[] = [
  {
    classification: {
      calloutLabel: null,
      kind: "executive",
      rank: 1,
      rosterLabel: null,
      teamId: null,
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    },
    resolvedCalloutLabel: "Officers",
    resolvedRosterLabel: "Officers",
    roleId: "20000000-0000-4000-8000-000000000001",
    roleName: "Officers",
    teamHexcodeColor: "#6d28d9",
  },
  {
    classification: {
      calloutLabel: "Designer",
      kind: "team",
      rank: 100,
      rosterLabel: "Design Crew",
      teamId: "10000000-0000-4000-8000-000000000002",
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    },
    resolvedCalloutLabel: "Designer",
    resolvedRosterLabel: "Design Crew",
    roleId: "20000000-0000-4000-8000-000000000002",
    roleName: "Design",
    teamHexcodeColor: null,
  },
  {
    classification: null,
    resolvedCalloutLabel: null,
    resolvedRosterLabel: null,
    roleId: "20000000-0000-4000-8000-000000000003",
    roleName: "Operations",
    teamHexcodeColor: null,
  },
];

/**
 * Locates the two renderings by the tokens that *are* the mechanism. jsdom
 * loads no CSS, so both trees are mounted at once and nothing else tells them
 * apart — this is the labelled class contract `test-cases.md` allows, not a
 * layout assertion.
 */
function renderings(root: HTMLElement) {
  return {
    cards: [...root.querySelectorAll<HTMLElement>("div.md\\:hidden")],
    tables: [...root.querySelectorAll<HTMLElement>("div.hidden.md\\:block")],
  };
}

/** `getAllBy*` never returns an empty array, but its type does not say so. */
function first<T>(items: T[]): T {
  const [item] = items;
  if (item === undefined) throw new Error("expected at least one match");
  return item;
}

function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error("expected the element to be present");
  }
  return value;
}

function renderDiscordSection() {
  return render(
    <DiscordConfigSection
      environment="development"
      onSaved={vi.fn()}
      rows={discordRows}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.captured.club = null;
  mocks.captured.discord = null;
});

describe("TC-004: inert keys are structurally distinct from live keys", () => {
  it("marks inert keys with a rendered badge rather than the description", () => {
    const { container } = renderDiscordSection();
    const { cards, tables } = renderings(container);

    // Positive control: the description is identical for every row, so nothing
    // below can be passing because of the text in that column.
    expect(new Set(discordRows.map((row) => row.description)).size).toBe(1);

    for (const rendering of [first(tables), first(cards)]) {
      const scope = within(rendering);
      expect(scope.getAllByText("Unused")).toHaveLength(
        DISCORD.INERT_CONFIG_KEYS.length,
      );
      expect(scope.getAllByText("In use")).toHaveLength(
        DISCORD.LIVE_CONFIG_KEYS.length,
      );
    }

    expect(DISCORD.INERT_CONFIG_KEYS).toEqual([
      "officer_role",
      "admin_role",
      "volunteer_role",
      "vip_role",
    ]);
    expect([...DISCORD.LIVE_CONFIG_KEYS]).toEqual([
      "guild",
      "log_channel",
      "recruiting_channel",
      "alumni_role",
      "outreach_director_role",
      "design_director_role",
      "development_director_role",
      "sponsorship_director_role",
      "workshops_director_role",
      "projects_mentorship_director_role",
    ]);
  });

  it("states the marking in text, so it is announced rather than colour-only", () => {
    renderDiscordSection();

    expect(
      screen.getAllByText(
        "Nothing on the platform reads this setting. Editing it changes no behavior.",
      ).length,
    ).toBeGreaterThanOrEqual(DISCORD.INERT_CONFIG_KEYS.length);
    expect(screen.getAllByText("Nightly alumni grant/revoke cron").length).toBe(
      2,
    );
  });
});

describe("TC-031: the three kind groups are labelled regions in both renderings", () => {
  it("partitions fourteen rows across guild, channel and role in server order", () => {
    const { container } = renderDiscordSection();
    const { cards, tables } = renderings(container);

    for (const rendering of [first(tables), first(cards)]) {
      const scope = within(rendering);
      const groups = scope.getAllByRole("region");
      expect(
        groups.map((group) => group.getAttribute("aria-labelledby")),
      ).toHaveLength(3);

      const [server, channels, roleGroup] = groups as [
        HTMLElement,
        HTMLElement,
        HTMLElement,
      ];
      expect(within(server).getByRole("heading").textContent).toBe(
        "Discord server",
      );
      expect(within(channels).getByRole("heading").textContent).toBe(
        "Channels",
      );
      expect(within(roleGroup).getByRole("heading").textContent).toBe("Roles");

      const edits = (group: HTMLElement) =>
        within(group)
          .getAllByRole("button")
          .map((button) => button.getAttribute("aria-label"));
      expect(edits(server)).toEqual(["Edit guild"]);
      expect(edits(channels)).toEqual([
        "Edit log channel",
        "Edit recruiting channel",
      ]);
      expect(edits(roleGroup)).toHaveLength(11);
      // Declaration order, not alphabetical: `admin role` follows
      // `officer role`. A convenience sort on the client would flip these.
      expect(edits(roleGroup).slice(0, 3)).toEqual([
        "Edit officer role",
        "Edit admin role",
        "Edit volunteer role",
      ]);
    }
  });
});

describe("TC-006: the guild row confirmation names every consumer", () => {
  async function openGuildAndEdit(user: ReturnType<typeof userEvent.setup>) {
    renderDiscordSection();
    await user.click(
      first(screen.getAllByRole("button", { name: "Edit guild" })),
    );
    const production = screen.getByLabelText("Production ID");
    await user.clear(production);
    await user.type(production, "486628710443778071");
    return production;
  }

  it("confirms before firing, names all five consumers, and keeps the draft on cancel", async () => {
    const user = userEvent.setup();
    const production = await openGuildAndEdit(user);

    await user.click(screen.getByRole("button", { name: /save setting/i }));
    expect(mocks.discordMutate).not.toHaveBeenCalled();

    const confirmation = screen.getByRole("region", {
      name: /repoint the discord server/i,
    });
    for (const consumer of DISCORD.CONFIG_KEY_CONSUMERS.guild) {
      expect(within(confirmation).getByText(consumer)).toBeInTheDocument();
    }
    expect(DISCORD.CONFIG_KEY_CONSUMERS.guild).toHaveLength(5);

    await user.click(
      screen.getByRole("button", { name: /keep the current server/i }),
    );
    expect(
      screen.queryByRole("region", { name: /repoint the discord server/i }),
    ).not.toBeInTheDocument();
    expect(mocks.discordMutate).not.toHaveBeenCalled();
    expect(production).toHaveValue("486628710443778071");
  });

  it("fires exactly one acknowledged mutation once confirmed", async () => {
    const user = userEvent.setup();
    await openGuildAndEdit(user);

    await user.click(screen.getByRole("button", { name: /save setting/i }));
    await user.click(
      screen.getByRole("button", { name: /repoint the server/i }),
    );

    expect(mocks.discordMutate).toHaveBeenCalledTimes(1);
    expect(mocks.discordMutate).toHaveBeenCalledWith({
      acknowledgeGuildRepoint: true,
      description: SHARED_DESCRIPTION,
      developmentId: "",
      key: "guild",
      label: "guild",
      productionId: "486628710443778071",
    });
  });

  it("does not confirm when only the guild row's label changes", async () => {
    const user = userEvent.setup();
    renderDiscordSection();
    await user.click(
      first(screen.getAllByRole("button", { name: "Edit guild" })),
    );

    const label = screen.getByLabelText("Label");
    await user.clear(label);
    await user.type(label, "Knight Hacks server");
    await user.click(screen.getByRole("button", { name: /save setting/i }));

    expect(
      screen.queryByRole("region", { name: /repoint the discord server/i }),
    ).not.toBeInTheDocument();
    expect(mocks.discordMutate).toHaveBeenCalledTimes(1);
  });
});

describe("TC-007: non-guild rows save without a confirmation", () => {
  it.each([
    ["log channel", "log_channel"],
    ["vip role", "vip_role"],
  ])("saves %s directly", async (label, key) => {
    const user = userEvent.setup();
    renderDiscordSection();
    await user.click(
      first(screen.getAllByRole("button", { name: `Edit ${label}` })),
    );

    const production = screen.getByLabelText("Production ID");
    await user.clear(production);
    await user.type(production, "486628710443778071");
    await user.click(screen.getByRole("button", { name: /save setting/i }));

    expect(screen.queryByText(/repoint the discord server/i)).toBeNull();
    expect(mocks.discordMutate).toHaveBeenCalledTimes(1);
    expect(mocks.discordMutate.mock.calls[0]?.[0]).toMatchObject({
      acknowledgeGuildRepoint: false,
      key,
    });
  });
});

describe("TC-008: success copy states convergence, not liveness", () => {
  it("names the ~60s window and the bot restart, and claims nothing more", () => {
    renderDiscordSection();
    mocks.captured.discord?.onSuccess();

    const copy = mocks.toastSuccess.mock.calls[0]?.[0] as string;
    expect(copy).toContain("within about a minute");
    expect(copy).toContain("T.K. bot");
    expect(copy).toContain("restart");
    // The sentence a future copy edit will quietly soften.
    expect(copy).not.toMatch(
      /\blive\b|now live|applied everywhere|immediately|updated everywhere/i,
    );
  });

  it("makes no propagation claim in either direction for a classification", () => {
    render(
      <ClubClassificationSection
        onSaved={vi.fn()}
        roles={roles}
        teams={teams}
      />,
    );
    mocks.captured.club?.onSuccess();

    const copy = mocks.toastSuccess.mock.calls[0]?.[0] as string;
    expect(copy).not.toMatch(/minute|restart|cron|cache/i);
    expect(copy).not.toMatch(/\blive\b|immediately|everywhere/i);
  });
});

describe("TC-029: saved data refreshes through router.refresh()", () => {
  it("refreshes the server render and never touches a query cache", () => {
    render(
      <AdminConfigConsole
        clubTeams={{ roles, teams }}
        discord={{ environment: "development", rows: discordRows }}
      />,
    );

    mocks.captured.discord?.onSuccess();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);

    mocks.captured.club?.onSuccess();
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
    // The mocked client exposes no `useUtils`, so an invalidation would have
    // thrown rather than quietly no-opped.
  });
});

describe("TC-030: row-level pending state is per row", () => {
  it("spins only the saving row, and clears on failure", async () => {
    const user = userEvent.setup();
    renderDiscordSection();
    await user.click(
      first(screen.getAllByRole("button", { name: "Edit log channel" })),
    );
    const production = screen.getByLabelText("Production ID");
    await user.clear(production);
    await user.type(production, "486628710443778071");
    await user.click(screen.getByRole("button", { name: /save setting/i }));

    for (const button of screen.getAllByRole("button", {
      name: "Edit log channel",
    })) {
      expect(button).toBeDisabled();
    }
    for (const button of screen.getAllByRole("button", {
      name: "Edit vip role",
    })) {
      expect(button).toBeEnabled();
    }

    act(() => mocks.captured.discord?.onError({ message: "nope" }));
    for (const button of screen.getAllByRole("button", {
      name: "Edit log channel",
    })) {
      expect(button).toBeEnabled();
    }
    expect(mocks.toastError).toHaveBeenCalledWith("nope");
  });
});

describe("TC-NEG-013: label is required and blank does not mean anything", () => {
  it("disables Save while the label is blank", async () => {
    const user = userEvent.setup();
    renderDiscordSection();
    await user.click(
      first(screen.getAllByRole("button", { name: "Edit vip role" })),
    );

    const save = screen.getByRole("button", { name: /save setting/i });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText("Label"), " extra");
    expect(save).toBeEnabled();

    await user.clear(screen.getByLabelText("Label"));
    expect(save).toBeDisabled();
  });
});

describe("TC-013 / TC-017: classification copy and read-only teams", () => {
  it("does not describe rank as badge priority", async () => {
    const user = userEvent.setup();
    render(
      <ClubClassificationSection
        onSaved={vi.fn()}
        roles={roles}
        teams={teams}
      />,
    );
    await user.click(
      first(screen.getAllByRole("button", { name: "Classify Operations" })),
    );

    expect(screen.queryByText(/badge priority/i)).toBeNull();
    expect(
      screen.getByText(
        /the guild profile badge follows the team’s tab order, not this number/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders every team field as text and offers no way to write one", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ClubClassificationSection
        onSaved={vi.fn()}
        roles={roles}
        teams={teams}
      />,
    );

    for (const team of teams) {
      expect(screen.getAllByText(team.label).length).toBeGreaterThan(0);
      expect(screen.getAllByText(team.heading).length).toBe(2);
      expect(screen.getAllByText(team.slug).length).toBe(2);
    }
    expect(container.querySelectorAll("input")).toHaveLength(0);

    await user.click(
      first(screen.getAllByRole("button", { name: "Classify Operations" })),
    );
    const dialog = within(screen.getByRole("dialog"));
    // A chooser over existing teams, never free text.
    expect(dialog.getByLabelText("Team").tagName).not.toBe("INPUT");
    expect(dialog.queryByRole("textbox", { name: /team/i })).toBeNull();
  });

  it("shows a classified role's classification, so an unlink is not blind", () => {
    render(
      <ClubClassificationSection
        onSaved={vi.fn()}
        roles={roles}
        teams={teams}
      />,
    );

    expect(screen.getAllByText("Design Crew").length).toBe(2);
    expect(screen.getAllByText("Unclassified").length).toBe(2);

    const officerRow = screen
      .getAllByRole("row")
      .find((row) => within(row).queryAllByText("Officers").length > 0);
    expect(
      within(present(officerRow)).getByText("Executive"),
    ).toBeInTheDocument();
  });
});

describe("TC-018: no create or delete affordance exists in the console", () => {
  it("finds every expected control first, then nothing that creates or removes", () => {
    const { container } = render(
      <AdminConfigConsole
        clubTeams={{ roles, teams }}
        discord={{ environment: "development", rows: discordRows }}
      />,
    );

    // Positive control. An empty tree would satisfy every negative below.
    for (const row of discordRows) {
      expect(
        screen.getAllByRole("button", { name: `Edit ${row.label}` }),
      ).toHaveLength(2);
    }
    expect(
      screen.getAllByRole("button", { name: "Classify Operations" }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: "Edit classification for Design" }),
    ).toHaveLength(2);

    const names = [
      ...screen.getAllByRole("button"),
      ...screen.getAllByRole("link"),
    ].map(
      (element) => element.getAttribute("aria-label") ?? element.textContent,
    );
    expect(names.length).toBeGreaterThan(30);
    for (const name of names) {
      expect(name).not.toMatch(
        /\b(add|create|new|delete|remove|unclassify|reset)\b/i,
      );
    }
    expect(container.querySelector("form")).toBeNull();
  });
});

describe("TC-028: the route shell matches the admin page contract", () => {
  it("renders one <main>, the new eyebrow, and both renderings of every table", () => {
    const { container } = render(
      <AdminConfigConsole
        clubTeams={{ roles, teams }}
        discord={{ environment: "development", rows: discordRows }}
      />,
    );

    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    // Four direct children: back link, header, and the two sections. A wrapper
    // around the sections would delete a `space-y-*` gap with no other signal.
    expect(present(main).children).toHaveLength(4);
    expect(screen.queryByText(ADMIN_PAGE_EYEBROWS.rolesConfig)).toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: "Platform configuration" }),
    ).toBeInTheDocument();

    // Class contract: three tabular datasets, each rendered twice.
    const { cards, tables } = renderings(container);
    expect(tables).toHaveLength(3);
    expect(cards).toHaveLength(3);
    expect(screen.getAllByRole("table")).toHaveLength(5);
  });

  it("gives every control an explicit 44px hit target token", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AdminConfigConsole
        clubTeams={{ roles, teams }}
        discord={{ environment: "development", rows: discordRows }}
      />,
    );

    // Class contract, not a measurement: jsdom loads no CSS, so what is checked
    // is that the token overriding `@forge/ui`'s `h-9` default is present.
    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toMatch(/(^|\s)(min-)?h-11(\s|$)/);
    }

    await user.click(
      first(screen.getAllByRole("button", { name: "Edit guild" })),
    );
    for (const input of container.querySelectorAll("input")) {
      expect(input.className).toMatch(/(^|\s)h-11(\s|$)/);
    }
  });

  it("mirrors the real markup in the loading skeleton", () => {
    const { container } = render(<AdminRolesConfigLoading />);

    const main = container.querySelector("main");
    expect(present(main).children).toHaveLength(4);
    expect(
      screen.getByLabelText("Loading Discord configuration"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Loading club roster classification"),
    ).toBeInTheDocument();

    const { cards, tables } = renderings(container);
    expect(tables).toHaveLength(3);
    expect(cards).toHaveLength(3);
  });
});

describe("TC-001: the officer gate runs before the reads", () => {
  async function loadPage() {
    const pageModule = await import("~/app/admin/roles/config/page");
    return pageModule.default;
  }

  beforeEach(() => {
    mocks.redirect.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });
  });

  it("redirects an unauthenticated request before reading permissions", async () => {
    mocks.serverAuth.mockResolvedValue(null);
    const Page = await loadPage();

    await expect(Page()).rejects.toThrow("redirect:/");
    expect(mocks.getPermissions).not.toHaveBeenCalled();
    expect(mocks.listDiscord).not.toHaveBeenCalled();
    expect(mocks.listConfiguration).not.toHaveBeenCalled();
  });

  it.each([
    ["CONFIGURE_ROLES only", { ASSIGN_ROLES: false, CONFIGURE_ROLES: true }],
    ["ASSIGN_ROLES only", { ASSIGN_ROLES: true, CONFIGURE_ROLES: false }],
    ["no role capability", { ASSIGN_ROLES: false, CONFIGURE_ROLES: false }],
  ])(
    "redirects %s to /admin/roles without reading the data",
    async (_name, permissions) => {
      mocks.serverAuth.mockResolvedValue({ user: { id: "user-1" } });
      mocks.getPermissions.mockResolvedValue({
        ...permissions,
        IS_OFFICER: false,
      });
      const Page = await loadPage();

      await expect(Page()).rejects.toThrow("redirect:/admin/roles");
      expect(mocks.listDiscord).not.toHaveBeenCalled();
      expect(mocks.listConfiguration).not.toHaveBeenCalled();
    },
  );

  it("renders the console for an officer", async () => {
    mocks.serverAuth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.getPermissions.mockResolvedValue({ IS_OFFICER: true });
    mocks.listDiscord.mockResolvedValue({
      environment: "development",
      rows: discordRows,
    });
    mocks.listConfiguration.mockResolvedValue({ roles, teams });
    const Page = await loadPage();

    render(await Page());

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { level: 1, name: "Platform configuration" }),
    ).toBeInTheDocument();
  });
});
