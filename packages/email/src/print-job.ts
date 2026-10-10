import { compileCodeEmailTemplate } from "./templates";

interface PrintEmailInput {
  hackathonName: string;
  headline: string;
  name: string;
  portalUrl: string | null;
}

// Use string literals inside JSX expressions: the safe compiler escapes their
// rendered values, so a hacker's text cannot become TSX or HTML.
function literal(value: string) {
  return `{${JSON.stringify(value)}}`;
}

/** React Email layout adapted from the existing IX arrival template. */
function renderPrintEmail(
  input: PrintEmailInput,
  content: string,
  action: string,
) {
  const isIx = input.hackathonName === "Knight Hacks IX";
  const source = `import { Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text } from "@react-email/components";
export default (
  <Html><Head /><Preview style={{ display: "none", maxHeight: 0, overflow: "hidden" }}>${literal(input.headline)}</Preview>
    <Body style={{ backgroundColor: "#071522", color: "#d7ead6", fontSize: 16, lineHeight: "26px", fontFamily: "Palatino Linotype, Book Antiqua, Palatino, Georgia, serif", margin: 0, padding: 0 }}>
      <Container style={{ backgroundColor: "#071522", margin: "0 auto", maxWidth: 660, width: "100%" }}>
        ${isIx ? '<Img alt="Knight Hacks IX at UCF, October 9-11, 2026" src="https://assets.knighthacks.org/khix/og-image.webp" width="660" style={{ display: "block", height: "auto", maxWidth: 660, width: "100%" }} />' : ""}
        <Section style={{ borderTop: "8px solid #8f63ff", padding: "28px 22px" }}>
          <Text style={{ color: "#eaff8f", margin: "0 0 12px" }}>${literal(input.hackathonName + " · 3D printing")}</Text>
          <Heading style={{ color: "#fff8d6", fontSize: 26, lineHeight: "32px", margin: "0 0 20px" }}>${literal(input.headline)}</Heading>
          <Text style={{ color: "#d7ead6" }}>${literal(`Hi ${input.name},`)}</Text>
          ${content}
          ${input.portalUrl ? `<Button href=${literal(input.portalUrl)} style={{ display: "inline-block", backgroundColor: "#f4e878", color: "#071522", fontWeight: 700, padding: "14px 22px", borderRadius: 6, textDecoration: "none" }}>${literal(action)}</Button>` : ""}
          <Text style={{ color: "#d7ead6", margin: "24px 0 0" }}>The Knight Hacks Team</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);`;
  const result = compileCodeEmailTemplate({ source, sample: {} });
  return {
    html: result.html,
    text:
      result.text +
      (input.portalUrl ? `\n\n${action}: ${input.portalUrl}` : ""),
  };
}

export function printJobStatusEmail(
  input: PrintEmailInput & {
    categoryLabel: string;
    description: string;
    note: string | null;
    readyAt: string | null;
    statusLabel: string;
  },
) {
  const content = `
    <Text style={{ color: "#fff8d6", fontWeight: 700 }}>${literal(`Your print is now: ${input.statusLabel}.`)}</Text>
    <Section style={{ backgroundColor: "#0a1a29", borderLeft: "4px solid #8f63ff", padding: "16px 18px", margin: "20px 0" }}>
      <Text style={{ color: "#fff8d6", margin: 0, overflowWrap: "anywhere" }}>${literal(input.description)}</Text>
      <Text style={{ color: "#eaff8f", margin: "8px 0 0" }}>${literal(`Category: ${input.categoryLabel}`)}</Text>
    </Section>
    ${input.note ? `<Text style={{ color: "#fff8d6", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>${literal(`Note from the organizers: ${input.note}`)}</Text>` : ""}
    ${input.readyAt ? `<Text style={{ color: "#d7ead6" }}>${literal(`Organizer estimate: ${input.readyAt}. Print times vary depending on the model.`)}</Text>` : ""}
  `;
  const rendered = renderPrintEmail(input, content, "Track your print");
  return {
    ...rendered,
    subject: `${input.hackathonName} 3D printing: ${input.statusLabel}`,
  };
}

export function printJobCategoryReminderEmail(
  input: Omit<PrintEmailInput, "headline"> & { jobCount: number },
) {
  const headline = "Choose a category for your prints";
  const content = `
    <Text style={{ color: "#d7ead6" }}>${literal(`You have ${input.jobCount} waiting print ${input.jobCount === 1 ? "request that needs" : "requests that need"} a category.`)}</Text>
    <Text style={{ color: "#fff8d6" }}>Open your printing dashboard and choose Hackathon project or Personal print for each request.</Text>
    <Text style={{ color: "#eaff8f", fontWeight: 700 }}>Parts for hackathon projects have priority over personal prints.</Text>
    <Text style={{ color: "#d7ead6" }}>Your requests are still saved, and you can choose a category even while new submissions are closed. We’ll email you when your print status changes. Print times vary depending on the model.</Text>
  `;
  return {
    ...renderPrintEmail(
      { ...input, headline },
      content,
      "Choose print categories",
    ),
    subject: `${input.hackathonName}: choose your print categories`,
  };
}
