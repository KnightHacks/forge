import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface AcceptanceEmailProps {
  name: string;
}

export const KH8ApplyEmail = ({ name }: AcceptanceEmailProps) => {
  const previewText = `${name}, thank you for applying to KnightHacks!`;

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
        <Body className="m-0 bg-[#ECECEC] p-0 font-sans">
          <Preview>{previewText}</Preview>

          <Container className="mx-auto max-w-[600px] p-0">
            <Section className="my-1 p-0">
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
              >
                <tr>
                  <td align="center">
                    <Img
                      src="https://i.imgur.com/UvC8nCh.png"
                      width={700}
                      height="auto"
                      alt="Divider"
                      style={{
                        maxWidth: "50%",
                        height: "auto",
                        margin: "0 auto",
                      }}
                    />
                  </td>
                </tr>
              </table>
            </Section>

            <Section className="z-10 mx-auto w-full p-0">
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
                    background="https://i.imgur.com/EtRmspk.png"
                    width="700"
                    height="200"
                    align="left"
                    valign="middle"
                    style={{
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <Text
                      className=" ml-4 mb-4 p-[22px] text-[28px] font-bold leading-tight text-[#070708]"
                    >
                      <span className="text-[#4075B7]">Thanks for applying,</span>
                      <br/>
                      <span className="text-[32px] font-bold text-[#C04B3D]">
                        {name}!
                      </span>
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>

            <Section className="p-0 text-center">
              <Img
                src="https://i.imgur.com/rjujtbx.png"
                width={600}
                alt="KnightHacks Banner"
                className="mt-[-50px] h-auto w-full"
              />
            </Section>

            <Section className="my-10 p-0">
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
              >
                <tr>
                  <td align="center">
                    <Img
                      src="https://i.imgur.com/RSl6O6h.png"
                      width={700}
                      height="auto"
                      alt="Divider"
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        margin: "0 auto",
                      }}
                    />
                  </td>
                </tr>
              </table>
            </Section>

            <Section className="mx-auto w-full p-0">
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
              >
                <tr>
                  <td align="center" style={{ padding: "20px 0" }}>
                    <Text
                      className=" text-[40px] font-normal leading-[46px] tracking-[0.01em]"
                      style={{ margin: 0 }}
                    >
                      1. WATCH YOUR{" "}
                      <span className="font-bold text-[#C04B3D]">INBOX!</span>
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td align="center" style={{ padding: "10px 0" }}>
                    <Text
                      className=" text-[20px] font-normal leading-[25px] tracking-[0.01em]"
                      style={{ margin: 0 }}
                    >
                      Now that your application is on file, there’s nothing left for you to do. We will be processing applications [I DONT KNOW WHEN], so keep an eye on your inbox for our signal.
                      <br/><br/>
                      Bide your time, hone your skills.
                      <br/>
                      <span className="font-bold text-[#4075B7]">T.K.</span> and <span className="font-bold text-[#C04B3D]">Lenny</span> will need all the help they can get!
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>

            <Section className="mx-auto w-full p-0">
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
              >
                <tr>
                  <td align="center" style={{ padding: "20px 0" }}>
                    <Text
                      className=" text-[40px] font-normal leading-[46px] tracking-[0.01em]"
                      style={{ margin: 0 }}
                    >
                      2. JOIN OUR{" "}
                      <span className="font-bold text-[#4075B7]">DISCORD!</span>
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td align="center" style={{ padding: "10px 0" }}>
                    <Text
                      className=" text-[20px] font-normal leading-[23px] tracking-[0.01em]"
                      style={{ margin: 0 }}
                    >
                      (Required by October 23rd)
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td align="center" style={{ padding: "20px 0" }}>
                    <Img
                      src="https://i.imgur.com/j67gvlZ.png"
                      width={500}
                      height="auto"
                      alt="Discord Graphic"
                      style={{ maxWidth: "100%", height: "auto" }}
                    />
                  </td>
                </tr>
                <tr>
                  <td align="center" style={{ padding: "10px 0" }}>
                    <a href={"https://discord.com/invite/Kv5g9vf"}>
                      <Img
                        src="https://i.imgur.com/CuX6BqL.png"
                        width={280}
                        height="auto"
                        alt="Join Discord Button"
                        style={{ height: "auto" }}
                      />
                    </a>
                  </td>
                </tr>
              </table>
            </Section>

            <Section className="mx-auto w-full p-0">
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
              >
                <tr>
                  <td align="center" style={{ padding: "20px 0" }}>
                    <Text
                      className=" text-[40px] font-normal leading-[46px] tracking-[0.01em]"
                      style={{ margin: 0 }}
                    >
                      3. SPREAD THE
                      <br />
                      <span className="text-5xl font-bold text-[#C04B3D]">
                        EXCITEMENT!
                      </span>
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td align="center" style={{ padding: "20px 0" }}>
                    <Img
                      src="https://i.imgur.com/loDXiue.png"
                      width={500}
                      height="auto"
                      alt="Social Media Graphic"
                      style={{ maxWidth: "100%", height: "auto" }}
                    />
                  </td>
                </tr>
                <tr>
                  <td align="center" style={{ padding: "10px 0" }}>
                    <a href={`${process.env.BLADE_URL}/dashboard`}>
                      <Img
                        src="https://i.imgur.com/UFGVeX2.png"
                        width={280}
                        height="auto"
                        alt="Share Button"
                        style={{ height: "auto" }}
                      />
                    </a>
                  </td>
                </tr>
              </table>
            </Section>

            <Section className="my-10 p-0">
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
              >
                <tr>
                  <td align="center">
                    <Img
                      src="https://i.imgur.com/zv7o3rj.png"
                      width={700}
                      height="auto"
                      alt="Divider"
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        margin: "0 auto",
                      }}
                    />
                  </td>
                </tr>
              </table>
            </Section>

            {/* RESOURCES LINKS */}
            <Section className="mx-auto w-full p-0">
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
              >
                <tr>
                  <td align="center" style={{ padding: "20px 0" }}>
                    <table
                      role="presentation"
                      cellPadding={0}
                      cellSpacing={0}
                      border={0}
                    >
                      <tr>
                        <td align="center" style={{ paddingRight: "10px" }}>
                          <a href="https://2025.knighthacks.org/">
                            <Img
                              src="https://i.imgur.com/csimGSU.png"
                              width={240}
                              height="auto"
                              alt="Resource 1"
                              style={{ height: "auto" }}
                            />
                          </a>
                        </td>
                        <td align="center">
                          <a href={`${process.env.BLADE_URL}/guide`}>
                            <Img
                              src="https://i.imgur.com/QGmXqoQ.png"
                              width={240}
                              height="auto"
                              alt="Resource 2"
                              style={{ height: "auto" }}
                            />
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style={{ padding: "10px 0" }}>
                    <Img
                      src="https://i.imgur.com/4h4rs7S.png"
                      width={500}
                      height="auto"
                      alt="Footer Image"
                      style={{ maxWidth: "100%", height: "auto" }}
                    />
                  </td>
                </tr>
              </table>
            </Section>

            <Section className="my-1 p-0">
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
              >
                <tr>
                  <td align="center">
                    <Img
                      src="https://i.imgur.com/UvC8nCh.png"
                      width={700}
                      height="auto"
                      alt="Divider"
                      style={{
                        maxWidth: "50%",
                        height: "auto",
                        margin: "0 auto",
                      }}
                    />
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

export default KH8ApplyEmail;
