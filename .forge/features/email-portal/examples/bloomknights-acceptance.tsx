import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Merge,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export default (
  <Html>
    <Head />
    <Preview>BloomKnights 2026 — you're in!</Preview>
    <Body
      style={{
        backgroundColor: "#f4f0ff",
        color: "#241b35",
        fontFamily: "Arial, sans-serif",
        margin: 0,
        padding: "28px 12px",
      }}
    >
      <Container
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 16,
          margin: "0 auto",
          maxWidth: 600,
          overflow: "hidden",
        }}
      >
        <Img
          alt="BloomKnights"
          src="https://assets.knighthacks.org/EventBannerBloom.png"
          style={{ display: "block", height: "auto", width: "100%" }}
          width={600}
        />
        <Section style={{ padding: "34px 40px 20px" }}>
          <Text style={{ fontSize: 18, margin: "0 0 12px" }}>
            Hey <Merge fallback="hacker" field="recipient.firstName" required />
            !
          </Text>
          <Heading
            style={{
              color: "#7047a8",
              fontSize: 30,
              margin: "0 0 18px",
            }}
          >
            YOU'RE IN! 🚀
          </Heading>
          <Text style={{ fontSize: 16, lineHeight: 1.65 }}>
            You've been accepted to BloomKnights 2026, Knight Hacks'
            beginner-friendly 12-hour hackathon. We're excited to spend a
            focused day building, learning, and meeting fellow hackers with you.
          </Text>
          <Section
            style={{
              backgroundColor: "#f7f3ff",
              borderRadius: 12,
              margin: "24px 0",
              padding: "16px 20px",
            }}
          >
            <Text style={{ lineHeight: 1.7, margin: 0 }}>
              📅 Saturday, July 11, 2026
            </Text>
            <Text style={{ lineHeight: 1.7, margin: 0 }}>
              📍 UCF Business Administration I
            </Text>
          </Section>
          <Section style={{ textAlign: "center" }}>
            <Button
              href="https://blade.knighthacks.org/dashboard"
              style={{
                backgroundColor: "#7047a8",
                borderRadius: 10,
                color: "#ffffff",
                display: "inline-block",
                fontSize: 16,
                fontWeight: 700,
                padding: "14px 24px",
                textDecoration: "none",
              }}
            >
              Confirm my attendance
            </Button>
          </Section>
          <Text style={{ fontSize: 14, lineHeight: 1.6, marginTop: 24 }}>
            Need the details? Read the BloomKnights Hacker's Guide for the
            schedule, FAQs, and what to bring.
          </Text>
          <Button
            href="https://knight-hacks.notion.site/bloomknights2026"
            style={{
              color: "#7047a8",
              display: "inline-block",
              fontSize: 14,
              fontWeight: 700,
              padding: "4px 0 18px",
              textDecoration: "underline",
            }}
          >
            Open the Hacker's Guide
          </Button>
          <Hr style={{ borderColor: "#e8e0f4", margin: "14px 0 22px" }} />
          <Text style={{ fontSize: 15, lineHeight: 1.6 }}>
            We can't wait to see what you build.
          </Text>
          <Text style={{ fontSize: 15, fontWeight: 700 }}>
            — The Knight Hacks Team
          </Text>
        </Section>
        <Section
          style={{
            backgroundColor: "#241b35",
            color: "#d9cbed",
            padding: "18px 40px",
            textAlign: "center",
          }}
        >
          <Text style={{ fontSize: 12, margin: 0 }}>
            Questions? Reach out in the Knight Hacks Discord.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);
