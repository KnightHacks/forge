import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface ConfirmationEmailProps {
  name: string;
}

export const KH8BlacklistEmail = ({ name }: ConfirmationEmailProps) => {
  const previewText = `${name}, you have been denied from Knight Hacks VIII.`;

  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light"></meta>
        <meta name="supported-color-schemes" content="light"></meta>
      </Head>
      <Tailwind
        config={{
          theme: {
            extend: {
              fontFamily: {
                sans: ["Arial"],
              },
            },
          },
        }}
      >
        <Body
          className="m-0 bg-white p-0 font-sans"
          style={{ backgroundColor: "#ffffff" }}
        >
          <Preview>{previewText}</Preview>

          <Container className="mx-auto max-w-[700px] bg-[#F7F0C6] p-0">
            <Section className="p-0">
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
                bgcolor="#F7F0C6"
              >
                <tr>
                  <td
                    // @ts-expect-error td is tripping
                    background="https://i.imgur.com/OdRQ4Xy.jpeg"
                    align="right"
                    width="700"
                    height="180"
                    valign="top"
                    style={{
                      backgroundSize: "700px 365px",
                    }}
                    className="relative rounded-t-md"
                  />
                </tr>
              </table>
            </Section>
            <Section className="p-0">
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
                bgcolor="#F7F0C6"
                className="p-[24px]"
              >
                <tr>
                  <td className="px-4">
                    <Text className="text-[20px] leading-tight text-black">
                      <span className="text-[24px] font-bold text-[#C04B3D]">
                        {name},
                      </span>
                      <br />
                      <br />
                      Unfortunately, due to poor conduct at prior Knight Hacks
                      or MLH-partnered events, we have made the difficult
                      decision to{" "}
                      <span className="font-bold text-[#C04B3D]">
                        deny you from Knight Hacks VIII.{" "}
                      </span>
                      <br />
                      <br />
                      You can read the{" "}
                      <Link
                        className="text-[#4075b7] underline"
                        href="https://knight-hacks.notion.site/code-of-conduct"
                      >
                        Knight Hacks Code of Conduct
                      </Link>
                      , as well as the{" "}
                      <Link
                        className="text-[#4075b7] underline"
                        href="https://mlh.io/code-of-conduct"
                      >
                        MLH Code of Conduct
                      </Link>
                      , using the links provided. For further questions, you can
                      also email us at{" "}
                      <Link
                        className="text-[#4075b7] underline"
                        href="mailto:hack@knighthacks.org"
                      >
                        hack@knighthacks.org
                      </Link>
                      .
                      <br />
                      <br />
                      This decision is{" "}
                      <span className="font-bold text-[#C04B3D]">final.</span>
                      <br />
                      <br />
                      However, you can try applying again at our next hackathon,
                      or keep an eye on our{" "}
                      <Link
                        href={"https://discord.com/invite/Kv5g9vf"}
                        className="text-[#4075b7] underline"
                      >
                        Discord
                      </Link>{" "}
                      for news on other hackathons in the region.
                      <br />
                      <br />
                      Thanks for your interest,
                      <br />
                      <span className="font-bold text-[#4075b7]">
                        The Knight Hacks Team
                      </span>
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>
            <Section className="p-0">
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
                bgcolor="#702c24"
                className="p-[16px]"
              >
                <tr>
                  <td className="px-4 text-center">
                    <Link
                      className="mr-2 text-[#F7F0C6] underline"
                      href="https://discord.com/invite/Kv5g9vf"
                    >
                      Discord
                    </Link>
                    <Link
                      className="mr-2 text-[#F7F0C6] underline"
                      href="https://www.instagram.com/knighthacks/"
                    >
                      Instagram
                    </Link>
                    <Link
                      className="mr-2 text-[#F7F0C6] underline"
                      href="https://blade.knighthacks.org/dashboard"
                    >
                      Blade
                    </Link>
                    <Link
                      className="mr-2 text-[#F7F0C6] underline"
                      href="https://knight-hacks.notion.site/knight-hacks-viii"
                    >
                      Hacker's Guide
                    </Link>
                    <Link
                      className="mr-2 text-[#F7F0C6] underline"
                      href="https://mlh.io/code-of-conduct"
                    >
                      MLH Code of Conduct
                    </Link>
                    <Link
                      className="mr-2 text-[#F7F0C6] underline"
                      href="https://knight-hacks.notion.site/code-of-conduct"
                    >
                      Knight Hacks Code of Conduct
                    </Link>
                    <Text className="text-[14px] leading-tight text-[#F7F0C6]">
                      Made with 💛 by the Knight Hacks team.
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default KH8BlacklistEmail;
