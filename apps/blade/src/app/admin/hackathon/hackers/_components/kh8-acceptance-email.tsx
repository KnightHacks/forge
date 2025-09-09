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
  const previewText = `Congrats ${name}! Your spot at KnightHacks is secured 🎉`;

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
        <Body className="bg-white m-0 p-0 font-sans"
        style={{backgroundColor: "#ffffff"}}>
          <Preview>{previewText}</Preview>

          <Container className="mx-auto max-w-[700px] p-0">
            <Section className="p-0">
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
              >
                <tr>
                  <td 
                    // @ts-expect-error td is tripping
                    background="https://i.imgur.com/OdRQ4Xy.jpeg"
                    align="right" 
                    width="700"
                    height="380"
                    valign="top"
                    style={{
                      backgroundSize: "700px 380px"
                    }}
                    className="rounded-t-md relative"
                    >
                      <Text className="mt-12 mb-6 p-[22px] text-[20px] leading-tight text-[#C04B3D]">
                        <span className="text-[#C04B3D] mb-2 font-normal">Congratulations,</span>
                        <br />
                        <span className="text-[20px] font-bold text-[#C04B3D]">
                          {name}
                        </span>
                      </Text>
                      <Img src="https://i.imgur.com/aw3sWEV.png" className="w-[500px] h-[200px] absolute"/>
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
                          Engineering I, Room 102
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
                  <td className="px-4">
                      <Text className="text-[20px] leading-tight text-[#4075b7] font-bold">
                        1) Confirm your attendance!
                      </Text>
                  </td>
                </tr>
                <tr>
                  <td className="px-4">
                    <Text className="text-[20px] leading-tight text-black">
                      While you have been accepted to <span className="font-bold text-[#C04B3D]">KnightHacks VIII</span>, you have <span className="font-bold">one last step</span>.
                      <br/><br/>
                      Confirm that you are able to attend the event using Blade, at your <Link href={"https://blade.knighthacks.org/dashboard"} className="text-[#4075b7] underline">
                        hacker dashboard.
                      </Link> If you do not confirm by the deadline, you may <span className="text-[#C04B3D]">lose your spot</span>, so do this <span className="font-bold">ASAP!</span>
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
