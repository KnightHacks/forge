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

export const GemiKnightsAcceptanceEmail = ({ name }: AcceptanceEmailProps) => (
  <Html>
    <Head />
    <Preview>GemiKnights 2025 - You're In!</Preview>

    <Tailwind
      config={{
        theme: {
          extend: {
            fontFamily: {
              manga: ["'Manga Temple'"],
            },
          },
        },
      }}
    >
      <Body className="bg-gray-50 font-sans text-[16px] text-gray-800">
        <Container className="mx-auto my-0 w-[600px] rounded-md bg-white shadow-lg">
          <Section className="w-full">
            <Img
              src="https://gemi.knighthacks.org/event-banner.png"
              alt="GemiKnights Banner"
              width="600"
              style={{ width: "600px", height: "auto" }}
              className="w-full rounded-t-md"
            />
          </Section>

          <Section className="px-10 py-8">
            <Text className="text-xl font-semibold text-gray-900">
              Hey {name}!
            </Text>
            <Text>
              <span className="text-lg font-bold text-purple-600">
                YOU'RE IN! 🚀
              </span>{" "}
              You've been <span className="font-bold">accepted</span> to{" "}
              <span className="font-bold text-purple-600">
                GemiKnights&nbsp;2025
              </span>{" "}
              — Knight&nbsp;Hacks'{" "}
              <span className="font-semibold text-purple-600">
                FIRST EVER Summer Hackathon!
              </span>{" "}
              You're about to be part of something truly historic.
            </Text>

            <Text className="mt-4">
              <span className="font-medium">📅 Date &amp; Time:</span> Saturday,
              June 28th, 9&nbsp;AM&nbsp;–&nbsp;11&nbsp;PM
              <br />
              <span className="font-medium">📍 Location:</span> University of
              Central Florida — Business Administration&nbsp;I&nbsp;(BA1)
              rooms&nbsp;107, 119, and 239
            </Text>

            <Section className="mt-8 text-center">
              <Text className="mb-4 text-lg font-semibold text-purple-600">
                ⚡ SECURE YOUR SPOT:
              </Text>
              <Link
                href="https://blade.knighthacks.org/dashboard"
                className="inline-block rounded-xl bg-purple-600 px-6 py-3 text-white no-underline"
                style={{ backgroundColor: "#9333ea" }} // ensures purple button
              >
                Confirm My Attendance
              </Link>
              <Text className="mt-2 text-xs text-gray-500">
                You <strong>MUST</strong> confirm by visiting the dashboard
                above to secure your spot. Please do this by{" "}
                <strong>June 24th, 2025</strong>.
              </Text>
            </Section>

            <Section className="mt-6">
              <Text>
                📚 Ready to dive deep? Check out the{" "}
                <Link
                  href="https://knight-hacks.notion.site/gemiknights2025"
                  className="text-purple-600 underline"
                >
                  Hacker&apos;s Guide
                </Link>{" "}
                for schedules, FAQs, and what to bring.
              </Text>
            </Section>

            <Text className="mt-8 text-lg font-semibold text-purple-600">
              🎯 Get ready to make history at our first ever Summer hackathon!
              Get excited for GemiKnights!
            </Text>
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

export default GemiKnightsAcceptanceEmail;
