"use client";

import type { Variants } from "framer-motion";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

import About from "./_components/about/about";
import DiscordCTAButton from "./_components/discord/discord";
import FAQ from "./_components/faq/faq";
import {
  AboutBirdFlock,
  FAQBirdFlock,
} from "./_components/graphics/AnimatedBirds";
import Logo from "./_components/graphics/logo";
import Partners from "./_components/partners/partners";
import Register from "./_components/register/registerButton";
import { EVENT_DATE_LABEL } from "./seo";

const heroReveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: unknown) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.9,
      delay: typeof delay === "number" ? delay : 0,
      ease: "easeOut",
    },
  }),
};

export default function HomePage() {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const logoYRaw = useTransform(
    scrollYProgress,
    [0, 0.65],
    prefersReducedMotion ? [0, 0] : [0, -56],
  );
  const dateYRaw = useTransform(
    scrollYProgress,
    [0, 0.65],
    prefersReducedMotion ? [0, 0] : [0, -30],
  );
  const ctaYRaw = useTransform(
    scrollYProgress,
    [0, 0.65],
    prefersReducedMotion ? [0, 0] : [0, -14],
  );
  const logoScaleRaw = useTransform(
    scrollYProgress,
    [0, 0.65],
    prefersReducedMotion ? [1, 1] : [1, 0.985],
  );
  const scrollSpring = { stiffness: 34, damping: 32, mass: 0.75 };
  const logoY = useSpring(logoYRaw, scrollSpring);
  const dateY = useSpring(dateYRaw, scrollSpring);
  const ctaY = useSpring(ctaYRaw, scrollSpring);
  const logoScale = useSpring(logoScaleRaw, scrollSpring);

  return (
    <div className="font-fredoka-one flex w-full flex-col items-center justify-center text-4xl">
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 px-4 pt-24">
        <motion.div
          className="bloom-depth-layer"
          style={{ y: logoY, scale: logoScale }}
        >
          <motion.div
            variants={heroReveal}
            initial={prefersReducedMotion ? false : "hidden"}
            animate="visible"
            custom={0}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
          >
            <Logo />
          </motion.div>
        </motion.div>
        <h1 className="sr-only">
          BloomKnights: A 12-Hour Student Hackathon at UCF
        </h1>
        <motion.div className="bloom-depth-layer" style={{ y: dateY }}>
          <motion.div
            className="font-righteous flex max-w-4xl flex-col items-center gap-3 text-center leading-none text-[#fff7dc] [-webkit-text-stroke:0.45px_#245f34] [text-shadow:0_1px_0_#245f34,1px_0_0_#245f34,-1px_0_0_#245f34,0_-1px_0_#245f34,0_5px_16px_rgba(30,58,32,0.48)]"
            variants={heroReveal}
            initial={prefersReducedMotion ? false : "hidden"}
            animate="visible"
            custom={0.15}
          >
            <h2 className="font-dm-sans text-2xl font-black italic tracking-normal text-white [-webkit-text-stroke:0px_transparent] [text-shadow:0_3px_0_rgba(126,126,126,0.88),0_7px_12px_rgba(42,42,42,0.24)] sm:text-3xl md:text-4xl">
              Orlando, Florida | {EVENT_DATE_LABEL}
            </h2>
          </motion.div>
        </motion.div>
        <motion.div className="bloom-depth-layer" style={{ y: ctaY }}>
          <motion.div
            variants={heroReveal}
            initial={prefersReducedMotion ? false : "hidden"}
            animate="visible"
            custom={0.25}
          >
            <Register />
          </motion.div>
        </motion.div>
      </div>

      <div className="flex w-full flex-col items-center">
        <div className="relative isolate mt-24 flex w-full items-center justify-center overflow-hidden py-10 sm:mt-32 sm:py-14 md:mt-44 md:min-h-screen md:py-24 lg:mt-52">
          <AboutBirdFlock />
          <div className="relative z-10 w-full">
            <About />
          </div>
        </div>
        <div className="relative isolate mt-24 flex min-h-[106rem] w-full items-start justify-center overflow-hidden py-10 sm:mt-32 sm:py-14 md:mt-44 md:min-h-[86rem] md:py-24 lg:mt-52 lg:min-h-[84rem] xl:min-h-[84rem]">
          <FAQBirdFlock />
          <div className="relative z-10 w-full">
            <FAQ />
          </div>
        </div>
        <div className="flex w-full items-center justify-center gap-4 py-10 sm:py-14 md:py-16">
          <Partners />
        </div>
        <div className="flex w-full items-center justify-center py-4 sm:py-8 md:min-h-[42vh] md:py-0">
          <DiscordCTAButton />
        </div>
      </div>
    </div>
  );
}
