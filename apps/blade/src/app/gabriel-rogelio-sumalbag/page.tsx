import React from "react";
import Image from "next/image";

import { Button } from "@forge/ui/button";
import { Separator } from "@forge/ui/separator";
import { Card, CardContent} from "@forge/ui/card";



export default function GabrielPage(){
    return (
        <main className="text-center" style={{backgroundImage: "url('/cool-background.png')"}}>
            <div>
                <h1 className="flex justify-center text-5xl font-bold text-yellow-500">Gabriel Rogelio Sumalbag</h1>
            </div>

            <div className="flex justify-center mt-10">
                <Image src="/IMG_9441.JPG" alt="Gabriel Sumalbag" width="961" height="961" className="transition"/>
            </div>

            <div>
                <h1 className="text-white-500 font-bold text-3xl mt-10">About Me</h1>
                <p className="text-white-500 text-lg mt-10 font-semibold">I am an aspiring Software Developer willing to learn more on what it's like to gain experience with the KnightHacks Dev Team! I have experience in many program langauges, such as C, JavaScript, Java, Python, CSS, and have experience with React and Next.js. I love collaborating with colleagues with similar interests and creating innovative programs.</p>
            </div>

            <div>
                <h3 className="text-white-500 font-bold text-3xl mt-11">Skills</h3>
                <p className="text-white-500 font-semibold ">Skills, Programming, and Frameworks</p>
            </div>

            <div className="flex 1 justify-center mt-5 text-align gap-1">
                <Card className="h-[200px] w-[200px] bg-gray-400">
                    <CardContent className="flex 1 justify-center mt-10">
                        <div>
                            <Image src="/C_Logo.png" alt="C" width="100" height="100"/>
                        </div>
                    </CardContent>
                </Card>
                <Card className="h-[200px] w-[200px] bg-gray-300">
                    <CardContent className="flex 1 justify-center mt-10">
                        <div>
                            <Image src="/Java_Logo.png" alt="Java" width="70" height="80" className="center"/>
                        </div>
                    </CardContent>
                </Card>
                <Card className="h-[200px] w-[200px] bg-gray-400">
                    <CardContent className="flex 1 justify-center mt-10">
                        <div>
                            <Image src="/Python_Logo.png" alt="Java" width="100" height="100" className="center"/>
                        </div>
                    </CardContent>
                </Card>
                <Card className="h-[200px] w-[200px] bg-gray-300">
                    <CardContent className="flex 1 justify-center mt-10">
                        <div>
                            <Image src="/JavaScript_Logo.png" alt="Java" width="100" height="100" className="justify-center"/>
                        </div>
                    </CardContent>
                </Card>
                <Card className="h-[200px] w-[200px] bg-gray-400">
                    <CardContent className="flex 1 justify-center mt-10">
                        <div>
                            <Image src="/Typescript_Logo.png" alt="Java" width="100" height="100" className="justify-center"/>
                        </div>
                    </CardContent>
                </Card>
            </div >

            <div className="flex 1 justify-center mt-8 text-align p-1 gap-1">
                <Card className="h-[200px] w-[200px] bg-gray-300">
                    <CardContent className="flex 1 justify-center mt-10">
                        <div>
                            <Image src="/HTML_Logo.png" alt="Java" width="130" height="100" className="justify-center"/>
                        </div>
                    </CardContent>
                </Card>
                <Card className="h-[200px] w-[200px] bg-gray-400">
                    <CardContent className="flex 1 justify-center mt-10">
                        <div>
                            <Image src="/CSS_Logo.png" alt="Java" width="100" height="100" className="justify-center"/>
                        </div>
                    </CardContent>
                </Card>
                <Card className="h-[200px] w-[200px] bg-gray-300">
                    <CardContent className="flex 1 justify-center mt-10">
                        <div>
                            <Image src="/React_Logo.png" alt="Java" width="100" height="100" className="justify-center"/>
                        </div>
                    </CardContent>
                </Card>
                <Card className="h-[200px] w-[200px] bg-gray-400">
                    <CardContent className="flex 1 justify-center mt-10">
                        <div>
                            <Image src="/Next.js.png" alt="Java" width="100" height="100" className="justify-center"/>
                        </div>
                    </CardContent>
                </Card>
            </div>
                
            <div>
                <Separator className="h-6 bg-white mt-10">
                <p className="flex 1 justify-center gap-4">
                    <Button className="bg-orange-500 text-white mt-10 text-4xl">
                        <a href="/Gabriel Rogelio Sumalbag STEM Resumé.pdf" rel="noreferer noopener" target="_blank">Resumé</a>
                    </Button>
                    <Button className="bg-blue-500 text-white mt-10 text-4xl">
                        <a href="https://www.linkedin.com/in/gabrielrogeliosumalbag/" rel="noreferer noopener" target="_blank">LinkedIN</a>
                    </Button>
                    <Button className="bg-gray-800 text-white mt-10 text-4xl">
                        <a href="https://github.com/Midnight0Moonlit" rel="noreferer noopener" target="_blank">GitHub</a>
                    </Button>
                </p>
                </Separator>
            </div>
        </main>
    )
}
