import React from "react";
import Image from "next/image";

import { Button } from "@forge/ui/button";
import { Separator } from "@forge/ui/separator";

const Page: React.FC = () => {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage:
          "url('/purple-pastel-gradient-background-soft-vintage-style_53876-125326.webp')",
      }}
    >
      <div className="absolute left-0 top-0 w-full bg-gray-500 py-4">
        <h1 className="ml-4 text-left text-4xl font-bold text-white">
          Richard Phillips
        </h1>
      </div>
      <div className="mt-20 flex justify-center">
        <div className="relative h-64 w-64">
          <Image
            src="/IMG_4487.jpg"
            alt="Richard Phillips"
            layout="fill"
            className="rounded-full object-cover"
          />
        </div>
      </div>
      <div className="mt-10 text-center">
        <h1 className="text-3xl font-bold text-gray-500">About Me</h1>
        <p className="mt-4 max-w-xl text-lg text-gray-500">
          Hello! I'm Richard Phillips, a passionate software developer with
          experience in various technologies including React, Python, Java, and
          JavaScript. I love creating innovative solutions and continuously
          learning new things. Feel free to connect with me on LinkedIn, check
          out my projects on GitHub, or view my resume.
        </p>
      </div>
      <div className="mt-10">
        <ul className="flex items-center space-x-4">
          <li>
            <Button className="bg-gray-500 text-white">
              <a
                href="https://www.linkedin.com/in/rphillipscs"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </Button>
          </li>
          <Separator orientation="vertical" className="mx-2 h-6 bg-white" />
          <li>
            <Button className="bg-gray-500 text-white">
              <a
                href="https://github.com/FunkyyMonk"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </Button>
          </li>
          <Separator orientation="vertical" className="mx-2 h-6 bg-white" />
          <li>
            <Button className="bg-gray-500 text-white">
              <a
                href="Richard Phillips Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                Resume
              </a>
            </Button>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Page;
