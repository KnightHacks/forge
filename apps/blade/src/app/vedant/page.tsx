import Link from "next/link";
import Image from "next/image";
import { FileText, ExternalLink, Github } from "lucide-react";

import { HydrateClient } from "~/trpc/server";
import { Button } from "@forge/ui/button";
import { Separator } from "@forge/ui/separator";

import ClubLogo from "../_components/navigation/club-logo";

export default async function VedantPage() {

  const googleDocsResumeUrl = "https://drive.google.com/file/d/1qqqC12NFsorzmGwA_HirZne79jC1qD-H/view?usp=sharing";

  return (
    <HydrateClient>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-96 flex-col items-center justify-center gap-4">
          <div className="absolute left-0 top-0 flex w-full items-center justify-between px-3 py-3 sm:px-10 sm:py-5">
            <Link href="/">
              <div className="flex w-full items-center justify-start gap-x-2 text-lg font-extrabold sm:text-[2rem]">
                <ClubLogo />
              </div>
            </Link>
          </div>
          <Separator className="absolute top-16 sm:top-20" />

          <div className="flex flex-col items-center justify-center space-y-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                    <Image
                      src="/vedant-profile.jpg"
                      alt="Vedant Patel Profile Picture"
                      width={200}
                      height={200}
                      className="rounded-full border-4 border-white shadow-2xl object-cover"
                      priority
                    />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20"></div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                  Hello, my name is Vedant!
                </h1>
                <h2 className="text-xl font-semibold text-muted-foreground">
                    Senior at the University of Central Florida
                </h2>
              </div>
            </div>

            <div className="p-8 border rounded-xl bg-card max-w-4xl w-full">
              <h2 className="text-4xl font-bold mb-6">About Me</h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                I am a previous SWE at Capital One, and am excited for the chance to join the development team at Knight Hacks!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-6">
                <Link href={googleDocsResumeUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="gap-3 w-full sm:w-auto text-base font-semibold py-3 px-6">
                    <FileText className="h-5 w-5" />
                    View Resume
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="https://www.linkedin.com/in/vedant-patel3/" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="gap-3 w-full sm:w-auto text-base font-semibold py-3 px-6">
                    <FileText className="h-5 w-5" />
                    My LinkedIn
                  </Button>
                </Link>
                <Link href="https://github.com/vedantp03" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="gap-3 w-full sm:w-auto text-base font-semibold py-3 px-6">
                    <Github className="h-5 w-5" />
                    My GitHub
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </HydrateClient>
  );
}