import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface AcceptanceEmailProps {
  name: string;
}

const GemiKnightsAcceptanceEmail = ({ name }: AcceptanceEmailProps) => (
  <Html>
    <Head />
    <Preview>Your GemiKnights Acceptance & Next Steps</Preview>

    <Tailwind>
      <Body className="bg-gray-50 font-sans text-[16px] text-gray-800">
        <Container className="mx-auto my-0 w-[600px] rounded-md bg-white shadow-lg">
          <Section className="w-full">
            <Img
              src="https://blade.knighthacks.org/kh-neon-banner.png"
              alt="GemiKnights Banner"
              width="600"
              style={{ width: "600px", height: "auto" }}
              className="w-full rounded-t-md"
            />
          </Section>

          <Section className="px-10 py-8">
            <Text className="text-xl font-semibold text-gray-900">
              Hi {name},
            </Text>
            <Text>
              Congratulations! You&apos;ve been{" "}
              <span className="font-bold">accepted</span> to&nbsp;
              <span className="font-bold text-purple-600">
                GemiKnights&nbsp;2025
              </span>{" "}
              — the official Knight&nbsp;Hacks Summer hackathon.
            </Text>

            <Text className="mt-4">
              <span className="font-medium">Date &amp; Time:</span> Saturday,
              9&nbsp;AM&nbsp;–&nbsp;10&nbsp;PM
              <br />
              <span className="font-medium">Location:</span> University of
              Central Florida — Business Administration&nbsp;I&nbsp;(BA1)
              rooms&nbsp;1‑7
            </Text>

            <Section className="mt-8 text-center">
              <Link
                href="https://blade.knighthacks.org/dashboard"
                className="inline-block rounded-xl bg-purple-600 px-6 py-3 text-white no-underline hover:bg-purple-700"
              >
                Confirm My Attendance
              </Link>
              <Text className="mt-2 text-xs text-gray-500">
                You <strong>MUST</strong> confirm by visiting the dashboard
                above to secure your spot. Please do this by{" "}
                <strong>June 24th, 2025</strong>. Note that acceptance does NOT
                gurantee your spot at the event, and confirmation is required at
                a first come first serve basis.
              </Text>
            </Section>

            <Section className="mt-6">
              <Text>
                Need more info? Check out the{" "}
                <Link
                  href="https://knight-hacks.notion.site/gemiknights2025"
                  className="text-purple-600 underline"
                >
                  Hacker&apos;s Guide
                </Link>{" "}
                for schedules, FAQs, and what to bring.
              </Text>
            </Section>

            <Text className="mt-8">We can’t wait to build with you!</Text>
            <Text className="font-semibold">— The Knight Hacks Team</Text>
          </Section>

          <Section className="rounded-b-md bg-gray-100 px-10 py-6 text-center">
            <Text className="text-xs text-gray-500">
              Questions? Join our community on{" "}
              <Link
                href="https://discord.com/invite/Kv5g9vf"
                className="text-purple-600 underline"
              >
                Discord
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export { GemiKnightsAcceptanceEmail };
