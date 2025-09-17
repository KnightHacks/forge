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

export const KH8ConfirmationEmail = ({ name }: ConfirmationEmailProps) => {
  const previewText = `Congrats, ${name}! Your spot at Knight Hacks VIII is secured 🎉`;

  return (
    <Html>
      <Head />
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
                    background="https://i.imgur.com/bYEtu1M.png"
                    align="right"
                    width="700"
                    height="400"
                    valign="top"
                    style={{
                      backgroundSize: "700px 436px",
                    }}
                    className="relative rounded-t-md"
                  >
                    <Text className="mb-6 mt-12 p-[22px] text-[22px] leading-tight text-[#C04B3D] shadow-md">
                      <span className="mb-2 font-normal text-[#C04B3D]">
                        Congratulations,
                      </span>
                      <br />
                      <span className="text-[20px] font-bold text-[#C04B3D]">
                        {name}
                      </span>
                    </Text>
                    <Img
                      src="https://i.imgur.com/W2DrFwX.png"
                      className="absolute mt-[72px] h-[200px] w-[500px]"
                    />
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
                bgcolor="#F7F0C6"
                className="p-[24px]"
              >
                <tr>
                  <td>
                    <hr />
                    <Text className="text-center text-[32px] font-bold leading-tight text-black">
                      October 24th - 26th, 2025
                      <br />
                      <span className="text-[24px]/8 text-[#4075b7]">
                        University of Central Florida
                      </span>
                    </Text>
                    <hr />
                  </td>
                </tr>
                <tr>
                  <td className="">
                    <Text className="text-[36px] font-bold leading-tight text-[#C04B3D] underline">
                      Welcome to Knight Hacks VIII!
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td className="px-4">
                    <Text className="text-[20px] leading-tight text-black">
                      We're so happy you chose to join us on this journey, and
                      we can't wait to have you at the event! Now that you're
                      confirmed,{" "}
                      <span className="font-bold text-[#4075b7]">
                        your spot is saved
                      </span>{" "}
                      and you can rest easy. However, we'd recommend doing{" "}
                      <span className="font-bold">these 3 things</span> before
                      you get here, so that you can maximize your enjoyment of
                      the event:
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td className="">
                    <Text className="text-[28px] font-bold leading-tight text-[#4075b7]">
                      1) Build a Team!
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td className="px-4">
                    <Text className="text-[20px] leading-tight text-black">
                      While you can submit solo, everything's better with a
                      team, and{" "}
                      <span className="font-bold text-[#C04B3D]">
                        Knight Hacks
                      </span>{" "}
                      is no different. If you don't have anyone to go with,
                      don't worry! We will have in-person team building at the
                      start of the event, or you can find teammates on our{" "}
                      <Link
                        href={"https://discord.com/invite/Kv5g9vf"}
                        className="text-[#4075b7] underline"
                      >
                        Discord server!
                      </Link>
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td className="">
                    <Text className="text-[28px] font-bold leading-tight text-[#4075b7]">
                      2) Read the Hacker's Guide!
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td className="px-4">
                    <Text className="text-[20px] leading-tight text-black">
                      Your best friend during{" "}
                      <span className="font-bold text-[#C04B3D]">
                        Knight Hacks VIII
                      </span>{" "}
                      will be the{" "}
                      <Link
                        href={
                          "https://knight-hacks.notion.site/knight-hacks-viii"
                        }
                        className="text-[#4075b7] underline"
                      >
                        Hacker's Guide.
                      </Link>{" "}
                      Everything you need to know about the event will be posted
                      there, like{" "}
                      <span className="text-[#4075b7]">
                        schedules, sponsor challenges, prizes,{" "}
                      </span>
                      and <span className="text-[#C04B3D]">MORE!</span> Be sure
                      to keep an eye on it, as the Guide will be regularly
                      updated as we get closer to the event.
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td className="">
                    <Text className="text-[28px] font-bold leading-tight text-[#4075b7]">
                      3) Spread the EXCITEMENT!
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td className="px-4">
                    <Text className="text-[20px] leading-tight text-black">
                      Rally your team for{" "}
                      <span className="font-bold text-[#C04B3D]">
                        Knight Hacks VIII!
                      </span>{" "}
                      Post on your LinkedIn to show employers what you've got,
                      or tell your friends to join the fray on Instagram! Follow
                      our Instagram page at{" "}
                      <Link
                        href={"https://www.instagram.com/knighthacks/"}
                        className="text-[#4075b7] underline"
                      >
                        @knighthacks
                      </Link>{" "}
                      for even more flyers and posts to get hyped ahead of the
                      event, or make your own using{" "}
                      <span className="text-[#4075b7]">#knighthacks</span>!
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td align="center" className="mx-auto px-4">
                    <Img
                      className="mx-auto w-[300px]"
                      src="http://blade.knighthacks.org/knighthacksacceptance.png"
                    />
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

export default KH8ConfirmationEmail;
