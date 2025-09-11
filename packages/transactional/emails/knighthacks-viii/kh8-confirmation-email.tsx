import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Link,
  Text,
} from "@react-email/components";

interface ConfirmationEmailProps {
  name: string;
}

export const KH8ConfirmationEmail = ({ name }: ConfirmationEmailProps) => {
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
                    background="https://i.imgur.com/bYEtu1M.png"
                    align="right" 
                    width="700"
                    height="400"
                    valign="top"
                    style={{
                      backgroundSize: "700px 436px"
                    }}
                    className="rounded-t-md relative"
                    >
                      <Text className="mt-12 mb-6 p-[22px] text-[22px] leading-tight shadow-md text-[#C04B3D]">
                        <span className="text-[#C04B3D] mb-2 font-normal">Congratulations,</span>
                        <br />
                        <span className="text-[20px] font-bold text-[#C04B3D]">
                          {name}
                        </span>
                      </Text>
                      <Img src="https://i.imgur.com/W2DrFwX.png" className="w-[500px] h-[200px] absolute mt-[72px]"/>
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
                      <hr/>
                      <Text className="text-[32px] leading-tight text-black font-bold text-center">
                        October 24th - 26th, 2025
                        <br/>
                        <span className="text-[#4075b7] text-[24px]/8">
                          University of Central Florida
                          <br/>
                          Engineering Atrium
                        </span>
                      </Text>
                      <hr/>
                  </td>
                </tr>
                <tr>
                  <td className="">
                      <Text className="text-[36px] leading-tight text-[#C04B3D] font-bold underline">
                        Welcome to Knight Hacks VIII!
                      </Text>
                  </td>
                </tr>
                <tr>
                  <td className="px-4">
                      <Text className="text-[20px] leading-tight text-black">
                        We're so happy you chose to join us on this journey, and we can't wait to have you at the event! Now that you're confirmed, <span className="font-bold text-[#4075b7]">your spot is saved</span> and you can rest easy.  
                        However, we'd recommend doing <span className="font-bold">these 3 things</span> before you get here, so that you can maximize your enjoyment of the event:
                      </Text>
                  </td>
                </tr>
                <tr>
                  <td className="">
                      <Text className="text-[28px] leading-tight text-[#4075b7] font-bold">
                        1) Build a Team!
                      </Text>
                  </td>
                </tr>
                <tr>
                  <td className="px-4">
                    <Text className="text-[20px] leading-tight text-black">
                      While you can submit solo, everything's better with a team, and <span className="font-bold text-[#C04B3D]">Knight Hacks</span> is no different. If you don't have anyone to go with, don't worry! 
                      We will have in-person team building at the start of the event, or you can find teammates on our <Link href={"https://discord.com/invite/Kv5g9vf"} className="text-[#4075b7] underline">
                        Discord server!
                      </Link> 
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td className="">
                      <Text className="text-[28px] leading-tight text-[#4075b7] font-bold">
                        2) Read the Hacker's Guide!
                      </Text>
                  </td>
                </tr>
                <tr>
                  <td className="px-4">
                    <Text className="text-[20px] leading-tight text-black">
                      Your best friend during <span className="font-bold text-[#C04B3D]">Knight Hacks VIII</span> will be the <Link href={"https://knight-hacks.notion.site/knight-hacks-viii"} className="text-[#4075b7] underline">
                        Hacker's Guide.
                      </Link> Everything you need to know about the event will be posted there, like <span className="text-[#4075b7]">schedules, sponsor challenges, prizes, </span> 
                      and <span className="text-[#C04B3D]">MORE!</span> Be sure to keep an eye on it, as the Guide will be regularly updated as we get closer to the event.
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td className="">
                      <Text className="text-[28px] leading-tight text-[#4075b7] font-bold">
                        3) Spread the EXCITEMENT!
                      </Text>
                  </td>
                </tr>
                <tr>
                  <td className="px-4">
                    <Text className="text-[20px] leading-tight text-black">
                      Rally your team for <span className="font-bold text-[#C04B3D]">Knight Hacks VIII!</span> Post on your LinkedIn to show employers what you've got, or tell your friends to join the fray on Instagram! 
                      Follow our Instagram page at <Link href={"https://www.instagram.com/knighthacks/"} className="underline text-[#4075b7]">@knighthacks</Link> for even more flyers and posts to get hyped ahead of the event, or make your own using <span className="text-[#4075b7]">#knighthacks</span>!
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td align="center" className="px-4 mx-auto">
                    <Img className="w-[300px] mx-auto" src="https://i.imgur.com/loDXiue.png"/>
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

export default KH8ConfirmationEmail;


                