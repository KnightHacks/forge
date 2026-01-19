"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";

const AnimatedInfo = () => {
  const ref = useRef(null);
  const isInView = useInView(ref);

  const outerDivVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.4,
        delayChildren: 0.5,
      },
    },
  };

  const textBoxVariants = {
    hidden: {
      x: 100,
      opacity: 0,
    },
    show: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 1,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={outerDivVariants}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
      className="flex h-full w-full flex-col items-center justify-center gap-3"
    >
      <motion.div
        variants={textBoxVariants}
        className="relative z-20 flex h-[20%] w-full border-2 border-white bg-gray-800 shadow-md shadow-white"
      >
        <div className="w-[80%] bg-gray-900 pl-1">
          <h1 className="font-bold md:text-xl xl:text-2xl 2xl:text-3xl">
            Hi, I'm Noah!
          </h1>
          <div className="h-[calc(100%-1.5rem)] overflow-y-auto text-[.65rem] md:text-[.9rem] xl:text-[1.1rem] 2xl:text-[1.3rem]">
            I'm a first year Computer Science Major at UCF and an active
            KnightHacks Member/former kickstart mentee. Click the buttons on the
            right to see my resume, LinkedIn, Github, and Portfolio!
          </div>
        </div>
        <div className="flex w-[30%] items-center justify-center">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <a href="/resume.pdf" target="_blank" rel="noopener noreferrer">
              <div className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 bg-white transition-colors duration-300 hover:bg-gray-400 md:h-10 md:w-10 xl:h-16 xl:w-16">
                <div className="relative h-5 w-5 xl:h-10 xl:w-10">
                  <Image
                    src="/noah_img/resume.svg"
                    fill
                    style={{ objectFit: "contain" }}
                    alt="Resume"
                  ></Image>
                </div>
              </div>
            </a>
            <a
              href="https://www.linkedin.com/in/noah-lerner-59b651384/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 bg-white transition-colors duration-300 hover:bg-gray-400 md:h-10 md:w-10 xl:h-16 xl:w-16">
                <div className="relative h-5 w-5 xl:h-10 xl:w-10">
                  <Image
                    src="/noah_img/linkedin.svg"
                    fill
                    style={{ objectFit: "contain" }}
                    alt="Linkedin"
                  ></Image>
                </div>
              </div>
            </a>
            <a
              href="https://github.com/lernej"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 bg-white transition-colors duration-300 hover:bg-gray-400 md:h-10 md:w-10 xl:h-16 xl:w-16">
                <div className="relative h-5 w-5 xl:h-10 xl:w-10">
                  <Image
                    src="/noah_img/github.svg"
                    fill
                    style={{ objectFit: "contain" }}
                    alt="Github"
                  ></Image>
                </div>
              </div>
            </a>
            <a
              href="https://nlerner.dev/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 bg-white transition-colors duration-300 hover:bg-gray-400 md:h-10 md:w-10 xl:h-16 xl:w-16">
                <div className="relative h-5 w-5 xl:h-10 xl:w-10">
                  <Image
                    src="/noah_img/portfolio.svg"
                    fill
                    style={{ objectFit: "contain" }}
                    alt="Portfolio"
                  ></Image>
                </div>
              </div>
            </a>
          </div>
        </div>
      </motion.div>
      <motion.div
        variants={textBoxVariants}
        className="relative z-20 h-[25%] w-full border-2 border-white bg-gray-900 pl-1 shadow-md shadow-white"
      >
        <h1 className="font-bold md:text-xl xl:text-2xl 2xl:text-3xl">
          Why Me?
        </h1>
        <div className="h-[calc(100%-2rem)] overflow-y-auto text-[.65rem] md:text-[.9rem] xl:text-[1.1rem] 2xl:text-[1.3rem]">
          Though I have only been a club member for a short time, the
          hackathons, club meetings, and mentor/mentee sessions I've attended
          have endlessly inspired me and fueled my motivation to learn. If
          selected, I will approach every task with curiosity and focused
          effort, applying the skills I have gained so far while learning new
          ones whenever necessary.
        </div>
      </motion.div>
      <motion.div
        variants={textBoxVariants}
        className="relative z-20 h-[25%] w-full border-2 border-white bg-gray-900 pl-1 shadow-md shadow-white"
      >
        <h1 className="font-bold md:text-xl xl:text-2xl 2xl:text-3xl">
          About AI Use
        </h1>
        <div className="h-[calc(100%-1.5rem)] overflow-y-auto text-[.65rem] md:text-[.9rem] xl:text-[1.1rem] 2xl:text-[1.3rem]">
          Unlike the graphic, I WON'T use AI to center divs or write for loops.
          I see LLMs as a tool rather than a crutch and treat their responses
          like any other potentially unreliable source of information. When I'm
          inevitably confronted with a problem that I do not know how to handle,
          I'll only use AI to supplement my learning, not to replace it.
        </div>
      </motion.div>
      <motion.div
        variants={textBoxVariants}
        className="relative z-20 flex h-[15%] w-full items-center justify-center border-2 border-white bg-gray-900 pl-1 shadow-md shadow-white"
      >
        <div className="font-mono font-bold italic md:text-xl lg:text-2xl">
          THANK YOU FOR YOUR CONSIDERATION!
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AnimatedInfo;
