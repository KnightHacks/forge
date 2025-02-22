import Image from "next/image";
import Link from "next/link";
import MultiLeaf from "./multileaf";
import InteractiveButton from "./interactiveButton";
import "../globals.css";

import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@forge/ui/hover-card";

import { GitHubLogoIcon, LinkedInLogoIcon, ReaderIcon } from "@forge/ui";


const resume = "/Sebastian Garcia Resume.pdf";



export default function SebaPage() {
  return (
    <>
      <MultiLeaf />
      <div className="min-h-screen items-center justify-center text-center" >
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
          <Card className="w-3/4 items-center border-0">
            <h1 className="font-sans-serif flex justify-center py-5 text-2xl font-bold">
              Hi! This is my dev app! Hover over the icons to learn more.
            </h1>
            <CardContent>
              <div className="flex justify-center gap-10 py-10">
                <HoverCard>
                  <HoverCardTrigger>
                    <Button
                      asChild
                      variant="outline"
                      size="icon"
                      className="border-0 border-border"
                    >
                      <Link href={resume}>
                        <ReaderIcon />{" "}
                      </Link>
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    This is my resume! If you have any critiques please let me
                    know!
                  </HoverCardContent>
                </HoverCard>
                <HoverCard>
                  <HoverCardTrigger>
                    <InteractiveButton href="https://github.com/powdermilkjuno" soundFile="./bitcrushedexplosion.mp3">
                      <GitHubLogoIcon />
                    </InteractiveButton>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    This is my github! Feel free to check out my projects.
                  </HoverCardContent>
                </HoverCard>
                <HoverCard>
                  <HoverCardTrigger>
                    <InteractiveButton href="https://www.linkedin.com/in/sebastian-garcia-7848a3159/" soundFile="./bitcrushedexplosion.mp3">
                      <LinkedInLogoIcon />
                    </InteractiveButton>
                  </HoverCardTrigger>
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
