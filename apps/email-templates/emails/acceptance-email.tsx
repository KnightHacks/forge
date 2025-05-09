import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import ConfirmBox from "./assets/confirm-box";
import ConfirmButton from "./assets/confirm-button";
import CongratsBox from "./assets/congrats-box";
import DiscordBox from "./assets/discord-box";
import DiscordButton from "./assets/discord-button";
import GraphicsBox from "./assets/graphics-box";
import GraphicsButton from "./assets/graphics-button";
import Hero from "./assets/hero";
import NextSteps from "./assets/next-steps-divider";
import ResourcesDivider from "./assets/resources-divider";

interface AcceptanceEmailProps {
  name: string;
}

export const AcceptanceEmail = ({ name }: AcceptanceEmailProps) => {
  const previewText = `Congrats ${name}! Your spot at KnightHacks is secured 🎉`;

  return (
    <Html>
      <Head />
      <Tailwind
        config={{
          theme: {
            extend: {
              fontFamily: {
                manga: ["'Manga Temple'", "cursive"],
              },
            },
          },
        }}
      >
        <Body className="m-0 bg-white p-0 font-sans">
          <Preview>{previewText}</Preview>

          <Container className="mx-auto flex flex-col items-center space-y-6 py-8">
            <Section className="relative mt-[-110px] w-full max-w-[600px]">
              <div className="w-full">
                <CongratsBox className="h-auto w-full" />
              </div>
              <Text className="font-manga absolute inset-0 top-[150px] flex items-center justify-center text-[26px] leading-tight text-black">
                Congrats,&nbsp;
                <span className="pl-2 pr-[140px] text-[30px] font-bold text-[#C04B3D]">
                  Katherina
                </span>
              </Text>
            </Section>

            <Section className="text-center">
              <Hero className="mt-5" />
            </Section>

            <Section className="my-5 flex w-full justify-center">
              <NextSteps />
            </Section>

            <Section className="mb-10 flex w-full flex-col items-center justify-center space-y-6">
              <Text className="font-manga text-center text-[40px] font-normal leading-[46px] tracking-[0.01em] text-black">
                1. CONFIRM YOUR{" "}
                <span className="font-bold text-[#C04B3D]">SPOT!</span>
              </Text>
              <Text className="font-manga text-center text-[20px] font-normal leading-[23px] tracking-[0.01em] text-black">
                (Spots are filling up quickly confirm ASAP!)
              </Text>

              <div className="flex flex-col items-center space-y-4">
                <ConfirmBox className="my-4" />
                <a href={`${process.env.BLADE_URL}/dashboard`}>
                  <ConfirmButton className="w-full max-w-xs" />
                </a>
              </div>
            </Section>

            <Section>
              <Text className="font-manga text-center text-[40px] font-normal leading-[46px] tracking-[0.01em] text-black">
                2. JOIN OUR{" "}
                <span className="font-bold text-[#4075B7]">DISCORD!</span>
              </Text>
              <Text className="font-manga text-center text-[20px] font-normal leading-[23px] tracking-[0.01em] text-black">
                (Required by October 23rd)
              </Text>

              <div className="flex flex-col items-center space-y-4">
                <DiscordBox className="my-4" />
                <a href={`${process.env.BLADE_URL}/dashboard`}>
                  <DiscordButton className="w-full max-w-xs" />
                </a>
              </div>
            </Section>

            <Section>
              <Text className="font-manga text-center text-[40px] font-normal leading-[46px] tracking-[0.01em] text-black">
                3. SPREAD THE
                <br />
                <span className="text-5xl font-bold text-[#C04B3D]">
                  EXCITEMENT!
                </span>
              </Text>

              <div className="flex flex-col items-center space-y-4">
                <GraphicsBox className="my-4" />
                <a href={`${process.env.BLADE_URL}/dashboard`}>
                  <GraphicsButton className="w-full max-w-xs" />
                </a>
              </div>
            </Section>

            <Section className="my-5 flex w-full justify-center">
              <ResourcesDivider />
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AcceptanceEmail;
