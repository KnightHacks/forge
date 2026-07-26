import { describe, expect, it } from "vitest";

import {
  compileCodeEmailTemplate,
  compileVisualEmailTemplate,
} from "../templates";

const SAFE_CODE_TEMPLATE = `
import { Button, Container, Html, Text } from "@react-email/components";

export default (
  <Html>
    <Container>
      <Text>Hello <Merge field="recipient.firstName" required fallback="friend" /></Text>
      <When field="hacker.status" equals="confirmed">
        <Text>You are confirmed for <Merge field="hackathon.displayName" />.</Text>
      </When>
      <Each field="team.roleNames" as="role">
        <Text><Merge field="role" /></Text>
      </Each>
      <Button href="https://knighthacks.org">Open Knight Hacks</Button>
    </Container>
  </Html>
);
`;

describe("safe email template compilation", () => {
  it("TC-002 compiles supported declarative TSX and derives its contract", () => {
    const result = compileCodeEmailTemplate({
      sample: {
        hacker: { status: "confirmed" },
        hackathon: { displayName: "BloomKnights" },
        recipient: { firstName: "Ada" },
        team: { roleNames: ["Design", "Operations"] },
      },
      source: SAFE_CODE_TEMPLATE,
    });

    expect(result.kind).toBe("code");
    expect(result.html).toContain("Hello Ada");
    expect(result.html).toContain("confirmed for BloomKnights");
    expect(result.text).toContain("Design");
    expect(result.text).toContain("Operations");
    expect(result.contract).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fallback: "friend",
          field: "recipient.firstName",
          required: true,
          type: "string",
        }),
        expect.objectContaining({
          field: "hacker.status",
          type: "string",
        }),
        expect.objectContaining({
          field: "team.roleNames",
          type: "string[]",
        }),
      ]),
    );
  });

  it("TC-003 preserves the visual source while compiling HTML and text", () => {
    const document = {
      root: {
        children: [
          {
            children: [
              { text: "Hello " },
              {
                fallback: "friend",
                field: "recipient.firstName",
                type: "merge" as const,
              },
            ],
            type: "text" as const,
          },
          {
            columns: [
              {
                children: [{ text: "Left", type: "text" as const }],
              },
              {
                children: [{ text: "Right", type: "text" as const }],
              },
            ],
            type: "columns" as const,
          },
          {
            href: "https://knighthacks.org",
            label: "Open Knight Hacks",
            type: "button" as const,
          },
        ],
        type: "root" as const,
      },
      version: 1 as const,
    };

    const result = compileVisualEmailTemplate({
      document,
      sample: { recipient: { firstName: "Grace" } },
    });

    expect(result.kind).toBe("visual");
    expect(result.document).toEqual(document);
    expect(result.html).toContain("Hello Grace");
    expect(result.html).toContain("Open Knight Hacks");
    expect(result.text).toContain("Left");
    expect(result.text).toContain("Right");
    expect(result.contract).toContainEqual(
      expect.objectContaining({
        fallback: "friend",
        field: "recipient.firstName",
      }),
    );
  });

  it("TC-006 reports required and fallback personalization coverage", () => {
    const result = compileCodeEmailTemplate({
      sample: {
        hacker: {},
        recipient: {},
        team: { roleNames: [] },
      },
      source: SAFE_CODE_TEMPLATE,
    });

    expect(result.html).toContain("Hello friend");
    expect(result.contract).toContainEqual(
      expect.objectContaining({
        fallback: "friend",
        field: "recipient.firstName",
        required: true,
      }),
    );
  });

  it.each([
    [
      "arbitrary import",
      `import danger from "node:fs"; export default <Text>{danger}</Text>;`,
    ],
    ["dynamic import", `export default <Text>{import("node:fs")}</Text>;`],
    ["process", `export default <Text>{process.env.SECRET}</Text>;`],
    ["fetch", `export default <Text>{fetch("https://example.com")}</Text>;`],
    ["eval", `export default <Text>{eval("1 + 1")}</Text>;`],
    ["Function", `export default <Text>{Function("return 1")()}</Text>;`],
    [
      "event handler",
      `export default <Button onClick={() => alert("x")}>Go</Button>;`,
    ],
    [
      "raw HTML",
      `export default <Text dangerouslySetInnerHTML={{ __html: "<b>x</b>" }} />;`,
    ],
    ["function call", `export default <Text>{makeRecipientName()}</Text>;`],
    ["control flow", `while (true) {} export default <Text>Never</Text>;`],
  ])("TC-NEG-001 rejects %s without executing it", (_name, source) => {
    expect(() => compileCodeEmailTemplate({ sample: {}, source })).toThrowError(
      /template|source|unsupported|allowed/i,
    );
  });

  it.each([
    ["source bytes", { maxSourceBytes: 24 }],
    ["AST nodes", { maxAstNodes: 4 }],
    ["nesting", { maxNesting: 2 }],
    ["compiled HTML", { maxHtmlBytes: 32 }],
    ["compiled text", { maxTextBytes: 8 }],
  ])("TC-NEG-002 enforces the %s limit", (_name, limits) => {
    expect(() =>
      compileCodeEmailTemplate({
        limits,
        sample: {
          hacker: { status: "confirmed" },
          hackathon: { displayName: "BloomKnights" },
          recipient: { firstName: "Ada" },
          team: { roleNames: ["Design"] },
        },
        source: SAFE_CODE_TEMPLATE,
      }),
    ).toThrowError(/limit|size|complex|nest|output/i);
  });

  it("TC-NEG-003 rejects unknown personalization fields", () => {
    expect(() =>
      compileCodeEmailTemplate({
        sample: {},
        source: `export default <Text><Merge field="user.secret" /></Text>;`,
      }),
    ).toThrowError(/unknown|personalization|field/i);
  });
});
