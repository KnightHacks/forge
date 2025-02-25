'use client';

import Image from "next/image";
import Link from "next/link";

import MultiLeaf from "./multileaf";

import "../globals.css";

import { GitHubLogoIcon, LinkedInLogoIcon, ReaderIcon } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Card, CardContent } from "@forge/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@forge/ui/hover-card";

const resume = "/Sebastian Garcia Resume.pdf";

const explosionSound = "/bitcrushedexplosion.mp3";



export default function SebaPage() {
  const playSound = () => {
    const audio = new Audio(explosionSound);
    audio.play().catch((error) => {
      console.error("Error playing audio:", error);
    });
  };

  return (
    <>
      <MultiLeaf />
      <div className="min-h-screen items-center justify-center text-center">
        <div className="flex flex-col items-center justify-center py-10">
          <HoverCard>
            <HoverCardTrigger>
              <Image
                src="/owltuah.jpg"
                className="flex justify-center py-10"
                alt="I'm a cat and a hawk, too"
                width={373.78}
                height={268.63}
              />
            </HoverCardTrigger>
            <HoverCardContent>
              i'm not just a cat i'm a hawk, too
            </HoverCardContent>
          </HoverCard>
          <Image
            src="/flamename.gif"
            className="center flex"
            alt="Sebastian Garcia (See footer)"
            width={607}
            height={119}
          />
          <Card className="border-1px w-3/4 items-center">
            <h1 className="font-sans-serif flex justify-center py-5 text-2xl font-bold">
              Hi! This is my dev app! Hover over the icons to learn more.
            </h1>
            <CardContent>
              <div className="flex justify-center gap-10 py-10">
                <HoverCard>
                  <Link href={resume} target="_blank" rel="noopener noreferrer">
                    <HoverCardTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-[1px] border-border"
                        onClick={playSound}
                      >
                        <ReaderIcon />
                      </Button>
                    </HoverCardTrigger>
                  </Link>
                  <HoverCardContent>
                    This is my resume! If you have any critiques please let me
                    know!
                  </HoverCardContent>
                </HoverCard>
                <HoverCard>
                  <Link
                    href="https://github.com/powdermilkjuno"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <HoverCardTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-[1px] border-border"
                        onClick={playSound}
                      >
                        <GitHubLogoIcon />
                      </Button>
                    </HoverCardTrigger>
                  </Link>
                  <HoverCardContent>
                    This is my github! Feel free to check out my projects.
                  </HoverCardContent>
                </HoverCard>
                <HoverCard>
                  <Link
                    href="https://www.linkedin.com/in/sebastian-garcia-7848a3159/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <HoverCardTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-[1px] border-border"
                        onClick={playSound}
                      >
                        <LinkedInLogoIcon />
                      </Button>
                    </HoverCardTrigger>
                  </Link>
                  <HoverCardContent>
                    This is my LinkedIn! Click it and connect with me NOW.
                  </HoverCardContent>
                </HoverCard>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
