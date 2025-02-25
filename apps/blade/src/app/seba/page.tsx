"use client";

import Image from "next/image";
import Link from "next/link";

import MultiLeaf from "./multileaf";

import { useIsVisible } from "./invisScroll";

import "../globals.css";

import { GitHubLogoIcon, LinkedInLogoIcon, ReaderIcon } from "@forge/ui";
import { Button } from "@forge/ui/button";
import { Card, CardContent } from "@forge/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@forge/ui/carousel";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@forge/ui/hover-card";

const pieces = [
  {
    image: "/piece1.jpg",
    description: "This piece was an experiment with the MS Paint spray can tool.",
  },
  {
    image: "/piece2.png",
    description: "This is a sketch for fun, using stylized anatomy and perspective.",
  },
  {
    image: "/piece3.png",
    description: "Painting practice, using textured brushes.",
  },
  {
    image: "/piece4.png",
    description: "Forcing myself to make a colored piece on MS paint, using limited colors and detail.",
  },
  {
    image: "/piece5.jpg",
    description: "A collage-style monocolor header made with an extremely thin brush on MS paint.",
  },
];

const resume = "/Sebastian Garcia Resume.pdf";

const explosionSound = "/bitcrushedexplosion.mp3";

export default function SebaPage() {
  const playSound = () => {
    const audio = new Audio(explosionSound);
    audio.play().catch((error) => {
      console.error("Error playing audio:", error);
    });
  };
  
  const { isVisible, ref } = useIsVisible({
    threshold: 0.25,
    rootMargin: '0px 0px -100px 0px'
  });

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
            className="center flex pb-10 pt-5"
            alt="Sebastian Garcia (See footer)"
            width={607}
            height={119}
          />
          <Card className="border-1px w-3/4 items-center">
            <h1 className="font-sans-serif flex justify-center py-10 text-2xl font-bold">
              Hi! This is my dev app! Hover over the icons to learn more.
            </h1>
            <CardContent>
              <div className="flex justify-center gap-20 py-10">
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
              <h1 className="font-sans-serif flex justify-center py-10 text-1 font-bold">
              Psst! Scroll down to see some of my art!
              </h1>
              <div 
                ref={ref}
                className={`${isVisible ? 'fade-in-section' : 'opacity-0'} mt-20`}
                >
              <h1 className="font-sans-serif flex justify-center py-1 text-xs font-bold z-25">
              Hover on the images for more info!
              </h1>
                <Carousel className="py-3 mx-auto w-10/12">
                <CarouselContent className="-ml-2">
                  {pieces.map((piece, index) => (
                    <CarouselItem key={index}>
                      <div className="p-1">
                        <Card className="overflow-visible">
                          <CardContent className="flex aspect-square items-center justify-center p-6 overflow-visible">
                            <HoverCard>
                              <HoverCardTrigger className="hover:z-50 relative">
                                <Image
                                  src={piece.image}
                                  alt={`Piece ${index + 1}`}
                                  width={600}
                                  height={400}
                                  className="h-full w-full rounded-lg object-cover"
                                />
                              </HoverCardTrigger>
                              <HoverCardContent className="max-w-sm z-50">
                                <h4 className="font-semibold">
                                  Untitled {index + 1}
                                </h4>
                                <p className="text-sm">{piece.description}</p>
                              </HoverCardContent>
                            </HoverCard>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
