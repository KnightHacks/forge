import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  Link,
  Text,
} from "@react-email/components";

interface ConfirmationEmailProps {
  name: string;
}

export const KH8BlacklistEmail = ({ name }: ConfirmationEmailProps) => {
  const previewText = `${name}, you have been denied from Knight Hacks VIII.`;

  return (
    <Html>
      <Head/>
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
        <Body className="bg-white m-0 p-0 font-sans"
        style={{backgroundColor: "#ffffff"}}>
          <Preview>{previewText}</Preview>

          <Container className=" mx-auto max-w-[700px] p-0 bg-[#F7F0C6]">
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
                      backgroundSize: "700px 365px"
                    }}
                    className="rounded-t-md relative"
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
                        <span className="font-bold text-[24px] text-[#C04B3D]">{name},</span><br/><br/>
                        Unfortunately, due to poor conduct at prior Knight Hacks or MLH-partnered events, we have made the difficult decision to <span className="text-[#C04B3D] font-bold">deny you from Knight Hacks VIII. </span> 
                        <br/><br/>
                        You can read the <Link className="text-[#4075b7] underline" href="https://knight-hacks.notion.site/code-of-conduct">
                        Knight Hacks Code of Conduct</Link>, as well as the <Link className="text-[#4075b7] underline" href="https://mlh.io/code-of-conduct">
                        MLH Code of Conduct</Link>, using the links provided. For further questions, you can also email us at <Link className="text-[#4075b7] underline" href="mailto:hack@knighthacks.org">
                        hack@knighthacks.org</Link>.
                        <br/><br/>
                        This decision is <span className="text-[#C04B3D] font-bold">final.</span>
                        <br/><br/>
                        However, you can try applying again at our next hackathon, or keep an eye on our <Link href={"https://discord.com/invite/Kv5g9vf"} className="text-[#4075b7] underline">
                          Discord
                        </Link> for news on other hackathons in the region.
                        <br/><br/>
                        Thanks for your interest,<br/>
                        <span className="font-bold text-[#4075b7]">The Knight Hacks Team</span>
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
                    <Link className="text-[#F7F0C6] underline mr-2" href="https://discord.com/invite/Kv5g9vf">Discord</Link>
                    <Link className="text-[#F7F0C6] underline mr-2" href="https://www.instagram.com/knighthacks/">Instagram</Link>
                    <Link className="text-[#F7F0C6] underline mr-2" href="https://blade.knighthacks.org/dashboard">Blade</Link>
                    <Link className="text-[#F7F0C6] underline mr-2" href="https://knight-hacks.notion.site/knight-hacks-viii">Hacker's Guide</Link>
                    <Link className="text-[#F7F0C6] underline mr-2" href="https://mlh.io/code-of-conduct">MLH Code of Conduct</Link>
                    <Link className="text-[#F7F0C6] underline mr-2" href="https://knight-hacks.notion.site/code-of-conduct">Knight Hacks Code of Conduct</Link>
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


                