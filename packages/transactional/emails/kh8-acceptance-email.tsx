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

interface AcceptanceEmailProps {
  name: string;
}

export const KH8AcceptanceEmail = ({ name }: AcceptanceEmailProps) => {
  const previewText = `Congrats, ${name}! You've been accepted to Knight Hacks VIII! 🎉`;

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
                      <Img src="https://i.imgur.com/gwDlJIm.png" className="w-[500px] h-[200px] absolute mt-[72px]"/>
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
                  <td>
                      <Text className="text-[36px] leading-tight text-[#C04B3D] font-bold italic underline">
                        NEXT STEPS...
                      </Text>
                  </td>
                </tr>
                <tr>
                  <td className="">
                      <Text className="text-[28px] leading-tight text-[#4075b7] font-bold">
                        1) Confirm your attendance!
                      </Text>
                  </td>
                </tr>
                <tr>
                  <td className="px-4">
                    <Text className="text-[20px] leading-tight text-black">
                      While you have been accepted to <span className="font-bold text-[#C04B3D]">Knight Hacks VIII</span>, you have <span className="font-bold">one last step</span>.
                      <br/><br/>
                      Confirm that you are able to attend the event using Blade, at your <Link href={"https://blade.knighthacks.org/dashboard"} className="text-[#4075b7] underline">
                        hacker dashboard.
                      </Link> If you do not confirm by the deadline, you may <span className="text-[#C04B3D]">lose your spot</span>, so do this <span className="font-bold">ASAP!</span>
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td className="">
                      <Text className="text-[28px] leading-tight text-[#4075b7] font-bold">
                        2) Join our Discord! <span className="italic text-[24px] font-normal text-muted-foreground">(required by October 23rd)</span>
                      </Text>
                  </td>
                </tr>
                <tr>
                  <td className="px-4">
                    <Text className="text-[20px] leading-tight text-black">
                      Here, you can <span className="text-[#4075b7]">connect</span> with fellow Hackers, Mentors, and Organizers on our <Link href={"https://discord.com/invite/Kv5g9vf"} className="text-[#4075b7] underline">
                        Discord server.
                      </Link> Stay updated on <span className="text-[#C04B3D]">live</span> annoucements, find teammates, and get your questions answered.
                      <br/><br/>
                      Make sure that your <span className="font-bold">Blade</span> account matches your Discord account by clicking on your profile icon in Blade, and checking the displayed handle for a match.
                       You are <span className="text-[#C04B3D]">required</span> to join the Discord this year, as all of our event communications will take place in our <span className="font-bold text-[#C04B3D]">Knight Hacks VIII channels.</span>
                    </Text>
                  </td>
                </tr>
                <hr/>
                <tr>
                  <td className="px-4">
                    <Text className="text-[20px] leading-tight text-black">
                      <span className="font-bold italic">Are you ready?</span><br/><br/>
                      <span className="font-bold text-[#4075b7]">T.K.</span> and <span className="font-bold text-[#C04B3D]">Lenny</span> need your talent to turn the tides of their war. 
                      If you think you're ready, <span className="text-[#C04B3D]">confirm</span> today! The fate of <span className="font-bold text-[#C04B3D]">Knight Hacks VIII</span> rests in <span className="text-[#4075b7]">your</span> hands.
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td align="center" className="px-4 mx-auto">
                    <Link href="https://blade.knighthacks.org/dashboard">
                      <Img className="w-[400px] mx-auto" src="https://i.imgur.com/qrYuyLP.png"/>
                    </Link>
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

export default KH8AcceptanceEmail;
