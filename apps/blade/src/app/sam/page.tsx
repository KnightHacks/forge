import Image from "next/image";
import Link from "next/link";
import { HydrateClient } from "~/trpc/server";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@forge/ui/card";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";

const resume = "/sam_resume.pdf";
const github = "https://github.com/samborg-dev";
const linkedin = "https://www.linkedin.com/in/samuel-xavier-borges/";

export default function SamPage() {
    return (
        <HydrateClient>
            <div suppressHydrationWarning className="theme-container">
                <div className="min-h-screen justify-center items-center text-center p-14">
                    Sam's Awesome Dev Application

                    <Card className="max-w-sm mx-auto ">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold">
                                Sam Borges
                            </CardTitle>
                            <CardDescription>
                                <Badge>
                                    <Image src="/cat.gif" alt=":3" width={50} height={50} unoptimized />
                                </Badge>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-row justify-center p-5">
                                <Link href={resume} target="_blank">
                                    <Button className="mx-5">
                                        Resume
                                    </Button>
                                </Link>
                                <Link href={github} target="_blank">
                                    <Button className="mx-5">
                                        Github
                                    </Button>
                                </Link>
                                <Link href={linkedin} target="_blank">
                                    <Button className="mx-5">
                                        Linkedin
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                        <CardFooter>Card Footer</CardFooter>
                    </Card>
                </div>
            </div>
        </HydrateClient>
    );
}
