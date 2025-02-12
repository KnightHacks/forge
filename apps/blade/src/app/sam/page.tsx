import "../globals.css";
import Image from "next/image";
import Link from "next/link";
import { HydrateClient } from "~/trpc/server";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@forge/ui/card";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Sound } from "~/app/_components/sound";
import Confetti from "../_components/confetti";

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
                        <Card className="max-w-xl mx-auto ">
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
                                <div className="flex flex-row justify-center p-5 ">
                                    <div className="transform transition hover:scale-110 mx-5">
                                        <Link href={resume} target="_blank">
                                            <Button>
                                                Resume
                                            </Button>
                                        </Link>
                                    </div>
                                    <div className="transform transition hover:scale-110 mx-5">
                                        <Link href={portfolio} target="_blank">
                                            <Button>
                                                Portfolio
                                            </Button>
                                        </Link>
                                    </div>
                                    <div className="transform transition hover:scale-110 mx-5">
                                        <Link href={github} target="_blank">
                                            <Button>
                                                Github
                                            </Button>
                                        </Link>
                                    </div>
                                    <div className="transform transition hover:scale-110 mx-5">
                                        <Link href={linkedin} target="_blank">
                                            <Button>
                                                Linkedin
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Sound audioUrl="./confetti.mp3">
                                    <Confetti>
                                        <div className="hover:font-bold">Click me!!</div>
                                    </Confetti>
                                </Sound>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        </HydrateClient>
    );
}