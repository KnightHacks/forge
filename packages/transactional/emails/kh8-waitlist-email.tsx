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

export const KH8WaitlistEmail = ({ name }: ConfirmationEmailProps) => {
  const previewText = `Congrats, ${name}! Your spot at Knight Hacks VIII is secured 🎉`;

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
                        Unfortunately, we have hit the capacity for our event, and have to make the tough decision to <span className="text-[#C04B3D] font-bold">waitlist you for Knight Hacks VIII.</span> We know this is tough to hear, and we wish we could've brought you in. 
                        <br/><br/>
                        As we draw nearer to the event, some hackers may fail to confirm their attendance. If this happens, we will begin to pull people from the waitlist into the accepted pool. 
                        If you are selected, you will recieve an acceptance email, and your status on Blade will be updated. However, <span className="text-[#C04B3D] font-bold">there is no guarantee you will removed from the waitlist.</span>
                        <br/><br/>
                        In the case that you stay waitlisted, you can try again at our next hackathon.
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
                bgcolor="#C04B3D"
                className="p-[16px]"
              >
                <tr>
                  <td className="px-4 text-center">
                    <Link className="text-[#F8D03F] underline mr-2" href="https://discord.com/invite/Kv5g9vf">Discord</Link>
                    <Link className="text-[#F8D03F] underline mr-2" href="https://www.instagram.com/knighthacks/">Instagram</Link>
                    <Link className="text-[#F8D03F] underline mr-2" href="https://blade.knighthacks.org/dashboard">Blade</Link>
                    <Link className="text-[#F8D03F] underline mr-2" href="https://knight-hacks.notion.site/knight-hacks-viii">Hacker's Guide</Link>
                    <Link className="text-[#F8D03F] underline mr-2" href="https://mlh.io/code-of-conduct">MLH Code of Conduct</Link>
                    <Link className="text-[#F8D03F] underline mr-2" href="https://knight-hacks.notion.site/code-of-conduct">Knight Hacks Code of Conduct</Link>
                    <Text className="text-[14px] leading-tight text-black">
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


                