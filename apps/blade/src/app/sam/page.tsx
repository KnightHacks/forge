import "../globals.css";
import Image from "next/image";
import Link from "next/link";
import Confetti from "../_components/confetti";
import { HydrateClient } from "~/trpc/server";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@forge/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@forge/ui/tooltip";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Sound } from "~/app/_components/sound";
import { PartyPopper } from 'lucide-react';
import { Flower } from 'lucide-react';
import { FileUser } from 'lucide-react';
import { CircleUser } from 'lucide-react';
import { Github } from 'lucide-react';
import { Linkedin } from 'lucide-react';

const resume = "/sam_resume.pdf";
const github = "https://github.com/samborg-dev";
const linkedin = "https://www.linkedin.com/in/samuel-xavier-borges/";
const portfolio = "https://samborg.dev";

export default function SamPage() {
    return (
        <HydrateClient>
            <div suppressHydrationWarning className="theme-container">
                <div className="min-h-screen justify-center items-center text-center p-14">
                    <div className="text-5xl font-extrabold" style={{ fontFamily: 'Good Matcha' }}>Sam's Awesome Dev Application</div>

                    <div className="pt-10">
                        <Card className="max-w-xl mx-auto top">
                            <CardHeader>
                                <CardTitle className="text-2xl font-bold pb-5">
                                    Sam Borges
                                </CardTitle>
                                <CardDescription>
                                    <Sound audioUrl="./meow.mp3">
                                        <Badge>
                                            <Image src="/cat.gif" alt=":3" width={50} height={50} unoptimized />
                                        </Badge>
                                    </Sound>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-row justify-center p-5">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="transform transition hover:scale-110 mx-7">
                                                    <Link href={resume} target="_blank">
                                                        <Button>
                                                            <FileUser />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>Resume</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="transform transition hover:scale-110 mx-7">
                                                    <Link href={portfolio} target="_blank">
                                                        <Button>
                                                            <CircleUser />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>Portfolio</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="transform transition hover:scale-110 mx-7">
                                                    <Link href={github} target="_blank">
                                                        <Button>
                                                            <Github />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>Github</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="transform transition hover:scale-110 mx-7">
                                                    <Link href={linkedin} target="_blank">
                                                        <Button>
                                                            <Linkedin />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>Linkedin</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Confetti>
                                    <Sound audioUrl="./confetti.mp3">
                                        <div className="transform transition scale-125 hover:scale-150">
                                            <PartyPopper />
                                        </div>
                                    </Sound>
                                </Confetti>
                            </CardFooter>
                        </Card>

                        <div className="left-flower">
                            <Flower size={700} />
                        </div>
                        <div className="right-flower">
                            <Flower size={700} />
                        </div>

                    </div>
                </div>
            </div>
        </HydrateClient>
    );
}