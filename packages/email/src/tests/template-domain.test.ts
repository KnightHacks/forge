import { describe, expect, it } from "vitest";

import {
  assertSubjectFieldsAllowed,
  compileCodeEmailTemplate,
  EmailTemplateValidationError,
  personalizationFieldsForDomain,
  renderSubject,
  subjectFields,
} from "../templates";

const SAMPLE = {
  hackathon: {
    applicationUrl: "https://bloomknights.org/apply",
    confirmationDeadline: "15 September 2026",
    displayName: "BloomKnights",
    endDate: "3 October 2026",
    name: "bloomknights",
    startDate: "1 October 2026",
  },
  hacker: { status: "accepted" },
  member: { graduationYear: 2027 },
  recipient: {
    email: "preview@example.test",
    firstName: "Dylan",
    name: "Dylan Vidal",
  },
  team: { roleNames: ["Design", "Development"] },
};

function compile(source: string, domain?: "club" | "hackathon") {
  return compileCodeEmailTemplate({ domain, sample: SAMPLE, source });
}

/** The smallest valid template that references exactly one field. */
function merge(field: string) {
  return `
import { Container, Html, Text } from "@react-email/components";

export default (
  <Html>
    <Container>
      {/* Static text so the template still compiles to nonempty output when
          the merged field is an array, which renders to nothing on its own. */}
      <Text>Hello <Merge field="${field}" /></Text>
    </Container>
  </Html>
);
`;
}

/**
 * A field referenced only inside a `When` the sample does not satisfy.
 *
 * The static line outside the branch matters: a template that compiles to
 * nothing is rejected for that reason alone, which would mask what these
 * tests are actually asserting.
 */
function skippedBranch(field: string) {
  return `
import { Container, Html, Text } from "@react-email/components";

export default (
  <Html>
    <Container>
      <Text>Always rendered.</Text>
      <When field="hacker.status" equals="denied">
        <Text>Hello <Merge field="${field}" /></Text>
      </When>
    </Container>
  </Html>
);
`;
}

/** A field referenced only inside an `Each` over a collection the sample lacks. */
function emptyCollection(field: string) {
  return `
import { Container, Html, Text } from "@react-email/components";

export default (
  <Html>
    <Container>
      <Text>Always rendered.</Text>
      <Each field="team.roleNames" as="role">
        <Text>Hello <Merge field="${field}" /></Text>
      </Each>
    </Container>
  </Html>
);
`;
}

describe("personalization catalog by domain", () => {
  it("offers club templates member and team fields, not hacker ones", () => {
    const fields = personalizationFieldsForDomain("club");

    expect(fields).toContain("member.graduationYear");
    expect(fields).toContain("team.roleNames");
    expect(fields).toContain("recipient.firstName");
    expect(fields).not.toContain("hacker.status");
    expect(fields).not.toContain("hackathon.displayName");
  });

  it("offers hackathon templates hacker and hackathon fields, not club ones", () => {
    const fields = personalizationFieldsForDomain("hackathon");

    expect(fields).toContain("hacker.status");
    expect(fields).toContain("hackathon.displayName");
    expect(fields).toContain("recipient.firstName");
    expect(fields).not.toContain("member.graduationYear");
    expect(fields).not.toContain("team.roleNames");
  });

  it("gives hackathon templates the dates an acceptance email needs", () => {
    // The confirmation deadline is the reason these were added: without it an
    // acceptance email cannot state when its recipient must confirm.
    expect(personalizationFieldsForDomain("hackathon")).toEqual(
      expect.arrayContaining([
        "hackathon.applicationUrl",
        "hackathon.confirmationDeadline",
        "hackathon.endDate",
        "hackathon.startDate",
      ]),
    );
  });
});

describe("TC-NEG-012: hackathon templates cannot reach club fields", () => {
  it.each([["member.graduationYear"], ["team.roleNames"]])(
    "rejects %s",
    (field) => {
      expect(() => compile(merge(field), "hackathon")).toThrow(
        EmailTemplateValidationError,
      );
    },
  );

  it("names the field and the domain in the message", () => {
    expect(() => compile(merge("team.roleNames"), "hackathon")).toThrow(
      /"team\.roleNames" is not available to hackathon templates/,
    );
  });

  it("still allows the shared recipient fields", () => {
    expect(() =>
      compile(merge("recipient.firstName"), "hackathon"),
    ).not.toThrow();
  });

  // The domain check reads the contract, and the contract is built while
  // rendering — so a branch the sample does not enter used to contribute
  // nothing, and the field inside it was invisible. The send path always
  // renders every branch into a Go conditional, so the same template passed
  // save and then failed at send naming a field the officer never saw.
  it("sees a club field inside a branch the sample does not take", () => {
    // The sample has `hacker.status: "confirmed"`, so this branch is skipped.
    expect(() =>
      compile(skippedBranch("member.graduationYear"), "hackathon"),
    ).toThrow(
      /"member\.graduationYear" is not available to hackathon templates/,
    );
  });

  // Shown from the club side, because the collection itself has to be a field
  // the domain allows and `team.roleNames` is the only array in the catalog.
  // The mechanism is the same one `When` exercises above.
  it("sees a foreign field inside a collection the sample does not have", () => {
    const withoutTeam = { ...SAMPLE, team: undefined };

    expect(() =>
      compileCodeEmailTemplate({
        domain: "club",
        sample: withoutTeam,
        source: emptyCollection("hackathon.displayName"),
      }),
    ).toThrow(/"hackathon\.displayName" is not available to club templates/);
  });

  it("agrees with the send path about which fields a template references", () => {
    // The asymmetry itself, stated directly: compiling for a provider renders
    // every branch, compiling for the sample does not. Both must reach the same
    // verdict, or "rejected at save" is not true.
    const source = skippedBranch("member.graduationYear");

    expect(() => compile(source, "hackathon")).toThrow(
      EmailTemplateValidationError,
    );
    expect(() =>
      compileCodeEmailTemplate({
        domain: "hackathon",
        providerNamespace: "send",
        sample: SAMPLE,
        source,
      }),
    ).toThrow(EmailTemplateValidationError);
  });

  it("still compiles when the skipped branch is legal for the domain", () => {
    // The positive control. Rendering-and-discarding must not turn a valid
    // template into a rejected one just because a branch was not taken.
    expect(() =>
      compile(skippedBranch("recipient.firstName"), "hackathon"),
    ).not.toThrow();
  });
});

describe("iterating a collection the sample cannot fill", () => {
  /** A loop whose body merges the alias itself rather than a catalog field. */
  function aliasLoop() {
    return `
import { Container, Html, Text } from "@react-email/components";

export default (
  <Html>
    <Container>
      <Text>Always rendered.</Text>
      <Each field="team.roleNames" as="role">
        <Text><Merge field="role" /> — <Merge field="recipient.name" /></Text>
      </Each>
    </Container>
  </Html>
);
`;
  }

  // The alias is not a catalog field — it only exists as a loop-local binding.
  // Rendering the body for its contract without binding the alias reports it as
  // an unknown personalization field, which turned a template that used to
  // compile to nothing into a hard failure.
  it.each([
    ["absent", undefined],
    ["null", null],
    ["empty", []],
  ])("compiles when the collection is %s", (_label, roleNames) => {
    expect(() =>
      compileCodeEmailTemplate({
        sample: { ...SAMPLE, team: { roleNames } },
        source: aliasLoop(),
      }),
    ).not.toThrow();
  });

  it("registers the same fields whether or not the sample has rows", () => {
    // The contract is what the domain check and the stored
    // `personalization_contract` are both built from, so the two compile paths
    // disagreeing here is the whole bug.
    const withRows = compileCodeEmailTemplate({
      sample: { ...SAMPLE, team: { roleNames: ["Design"] } },
      source: aliasLoop(),
    });
    const withoutRows = compileCodeEmailTemplate({
      sample: { ...SAMPLE, team: { roleNames: [] } },
      source: aliasLoop(),
    });

    const fields = (compiled: { contract: { field: string }[] }) =>
      compiled.contract.map((entry) => entry.field);

    // `recipient.name` lives only inside the loop body, so it is present only
    // if the body was walked.
    expect(fields(withRows)).toContain("recipient.name");
    expect(fields(withoutRows)).toEqual(fields(withRows));
  });
});

describe("TC-NEG-013: club templates keep their fields", () => {
  // Scoping must not regress existing club campaigns. This is why
  // `team.roleNames` was kept in the catalog rather than deleted.
  it.each([["member.graduationYear"], ["team.roleNames"]])(
    "still compiles %s",
    (field) => {
      expect(() => compile(merge(field), "club")).not.toThrow();
    },
  );

  it("renders the club value it was given", () => {
    const compiled = compile(merge("member.graduationYear"), "club");
    expect(compiled.html).toContain("2027");
  });

  it("rejects a hackathon field in a club template", () => {
    expect(() => compile(merge("hackathon.displayName"), "club")).toThrow(
      EmailTemplateValidationError,
    );
  });
});

describe("templates compiled without a domain", () => {
  it("are unscoped, so existing callers keep working", () => {
    // The parameter is optional on purpose: the portal's own preview and any
    // caller predating the domain column compiles as before.
    expect(() => compile(merge("team.roleNames"))).not.toThrow();
    expect(() => compile(merge("hackathon.displayName"))).not.toThrow();
  });

  it("still rejects a field that is in no catalog at all", () => {
    expect(() => compile(merge("hacker.favouriteColour"))).toThrow(
      EmailTemplateValidationError,
    );
  });
});

describe("subject interpolation", () => {
  const HACKATHON = {
    hackathon: {
      confirmationDeadline: "Oct 3, 2026",
      displayName: "Knight Hacks IX",
    },
    recipient: { firstName: "Dylan" },
  };

  it("renders the acceptance subject an officer would actually write", () => {
    expect(
      renderSubject(
        "[DUE {{hackathon.confirmationDeadline}}] Confirm your spot at {{hackathon.displayName}}",
        HACKATHON,
      ),
    ).toBe("[DUE Oct 3, 2026] Confirm your spot at Knight Hacks IX");
  });

  it("tolerates whitespace inside the braces", () => {
    expect(renderSubject("Hi {{ recipient.firstName }}", HACKATHON)).toBe(
      "Hi Dylan",
    );
  });

  it("renders a missing value as nothing rather than leaking the syntax", () => {
    // A blank is a smaller embarrassment than showing an applicant
    // "{{hackathon.applicationUrl}}" in their inbox.
    expect(
      renderSubject("Apply: {{hackathon.applicationUrl}}", HACKATHON),
    ).toBe("Apply:");
  });

  it("leaves text with no placeholders alone", () => {
    expect(renderSubject("You're in!", HACKATHON)).toBe("You're in!");
  });

  it("lists the fields a subject references", () => {
    expect(
      subjectFields("{{hackathon.displayName}} — {{recipient.firstName}}"),
    ).toEqual(["hackathon.displayName", "recipient.firstName"]);
  });
});

describe("subject field validation", () => {
  it("accepts hackathon and recipient fields in a hackathon subject", () => {
    expect(() =>
      assertSubjectFieldsAllowed(
        "[DUE {{hackathon.confirmationDeadline}}] {{recipient.firstName}}",
        "hackathon",
      ),
    ).not.toThrow();
  });

  it.each([["member.graduationYear"], ["team.roleNames"]])(
    "rejects the club field %s in a hackathon subject",
    (field) => {
      expect(() =>
        assertSubjectFieldsAllowed(`Hello {{${field}}}`, "hackathon"),
      ).toThrow(/not available to hackathon templates/);
    },
  );

  it("rejects a misspelt field before it can reach an inbox", () => {
    expect(() =>
      assertSubjectFieldsAllowed("{{hackathon.confirmDeadline}}", "hackathon"),
    ).toThrow(/Unknown personalization field/);
  });

  // The cases above all *look* like fields, so the original two-alpha-segment
  // pattern matched them and validation worked. These do not match that shape
  // at all, which meant they were invisible to both the check and the renderer
  // and arrived in the applicant's inbox as literal braces. Each one is a
  // realistic officer typo, not a synthetic string.
  it.each([
    ["{{hackathonDisplayName}}", "a missing dot"],
    ["{{hackathon.confirmationDeadline.date}}", "one segment too many"],
    ["{{ hackathon }}", "a namespace with no field"],
    ["{{hackathon.display_name}}", "snake_case instead of camelCase"],
    ["{{Hackathon.displayName}}", "a capitalised namespace"],
  ])("rejects %s (%s)", (subject) => {
    expect(() => assertSubjectFieldsAllowed(subject, "hackathon")).toThrow(
      /Unknown personalization field/,
    );
  });

  it("leaves no placeholder unrendered once a subject has been accepted", () => {
    // The renderer and the validator share one pattern on purpose. If they
    // drift, a subject can pass validation and still ship raw syntax — so this
    // asserts the end state the officer actually cares about.
    const subject =
      "[DUE {{hackathon.confirmationDeadline}}] {{ hackathon.displayName }}";
    assertSubjectFieldsAllowed(subject, "hackathon");

    expect(
      renderSubject(subject, {
        hackathon: {
          confirmationDeadline: "Oct 3, 2026",
          displayName: "Knight Hacks IX",
        },
      }),
    ).not.toMatch(/[{}]/);
  });
});
