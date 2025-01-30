import React from "react";
import Image from "next/image";
import { Button } from "C:/Users/Ricky/Documents/rickyp/packages/ui/src/button";
import { Separator } from "C:/Users/Ricky/Documents/rickyp/packages/ui/src/separator";

const Page: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('/purple-pastel-gradient-background-soft-vintage-style_53876-125326.webp')" }}>
      <div className="w-full bg-gray-500 py-4 absolute top-0 left-0">
        <h1 className="text-4xl font-bold text-white text-left ml-4">Richard Phillips</h1>
      </div>
      <div className="flex justify-center mt-20">
        <div className="relative w-64 h-64">
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
        <p className="mt-4 text-lg text-gray-500 max-w-xl">
          Hello! I'm Richard Phillips, a passionate software developer with experience in various technologies including React, Python, Java, and JavaScript. I love creating innovative solutions and continuously learning new things. Feel free to connect with me on LinkedIn, check out my projects on GitHub, or view my resume.
        </p>
      </div>
      <div className="mt-10">
        <ul className="flex items-center space-x-4">
          <li>
            <Button className="bg-gray-500 text-white">
              <a href="https://www.linkedin.com/in/rphillipscs" target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            </Button>
          </li>
          <Separator orientation="vertical" className="h-6 mx-2 bg-white" />
          <li>
            <Button className="bg-gray-500 text-white">
              <a href="https://github.com/FunkyyMonk" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </Button>
          </li>
          <Separator orientation="vertical" className="h-6 mx-2 bg-white" />
          <li>
            <Button className="bg-gray-500 text-white">
              <a href="Richard Phillips Resume.pdf" target="_blank" rel="noopener noreferrer">
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