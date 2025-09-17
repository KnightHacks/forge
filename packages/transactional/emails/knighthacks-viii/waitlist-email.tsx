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

export const KH8WaitlistEmail = ({ name }: ConfirmationEmailProps) => {
  const previewText = `${name}, you have been waitlisted for Knight Hacks VIII.`;

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
                      Unfortunately, we have hit capacity for our event and have
                      to make the difficult decision to{" "}
                      <span className="font-bold text-[#C04B3D]">
                        waitlist you for Knight Hacks VIII.
                      </span>{" "}
                      We know this is tough to hear, and we wish we could have
                      brought you in.
                      <br />
                      <br />
                      As we draw nearer to the event, some hackers may fail to
                      confirm their attendance. If this happens, we will begin
                      to pull people from the waitlist into the accepted pool.
                      If you are selected, you will receive an acceptance email,
                      and your status on Blade will be updated. However,{" "}
                      <span className="font-bold text-[#C04B3D]">
                        there is no guarantee you will be removed from the
                        waitlist.
                      </span>
                      <br />
                      <br />
                      If you do not hear back from us by{" "}
                      <span className="font-bold">October 17th</span>, then we
                      are at capacity and you will not be let in. Please refrain
                      from traveling to the venue, as we will not be allowing
                      people in on the day of the event.
                      <br />
                      <br />
                      In the case that you remain waitlisted, we encourage you
                      to try again at our next hackathon.
                      <br />
                      <br />
                      Thanks for your interest,
                      <br />
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

export default KH8WaitlistEmail;
