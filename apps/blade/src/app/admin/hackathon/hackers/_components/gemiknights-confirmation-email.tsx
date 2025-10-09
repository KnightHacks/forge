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

interface ConfirmationEmailProps {
  name: string;
}

const GemiKnightsConfirmationEmail = ({ name }: ConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>GemiKnights 2025 - FINAL STEP: Complete MLH Registration!</Preview>

    <Tailwind>
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
              You&apos;re officially in for{" "}
              <span className="font-bold text-purple-600">
                GemiKnights&nbsp;2025
              </span>{" "}
              — one of the first Summer Hackathons Knight&nbsp;Hacks has ever
              hosted! We&apos;re making history together and we&apos;re super
              excited to build something amazing with you and fellow hackers.
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
              <Text className="mb-4 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-2 text-lg font-semibold text-red-600">
                🎯 FINAL STEP TO SECURE YOUR SPOT:
              </Text>

              <Link
                href="https://events.mlh.io/events/12675-hack-knights-ucf?_gl=1*drl2yj*_ga*MTY4OTY2NzUyNi4xNzQ3NzA3NTQ0*_ga_E5KT6TC4TK*czE3NDk2MDY1MTckbzI4JGcxJHQxNzQ5NjA2NTIyJGo1NSRsMCRoMA"
                className="inline-block rounded-xl bg-red-600 px-6 py-3 text-lg font-bold text-white no-underline hover:bg-red-700"
              >
                Complete MLH Registration
              </Link>

              <Text className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
                <strong>DEADLINE: July 26th, 2025</strong> (2 days before the
                event)
                <br />
                This is the <strong>FINAL STEP</strong> before you&apos;re
                allowed into the event! The MLH registration helps us provide
                your info to our amazing sponsors and is required for entry. 🎁
              </Text>
            </Section>

            <Section className="mt-6">
              <Text>
                📚 Need the inside scoop? Check out the{" "}
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
              🎉 Let&apos;s make history with the best Summer hackathon ever!
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

export { GemiKnightsConfirmationEmail };
