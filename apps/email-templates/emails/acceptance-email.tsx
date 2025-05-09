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

import CongratsBox from "./assets/congrats-box";
import Hero from "./assets/hero";
import KhLogo from "./assets/kh-logo";

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
            <Section className="text-center">
              <KhLogo />
            </Section>

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
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AcceptanceEmail;
