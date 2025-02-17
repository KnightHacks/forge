import type { Metadata } from "next";
import Image from "next/image";

import LinkedInLink from "./_components/linkedin-link";
import GitHubLink from "./_components/github-link";
import ResumeLink from "./_components/resume-link";

export const metadata: Metadata = {
  title: "Lucas McClean",
  description: "Dev team application attached:",
};

export default async function Lucas() {
  return (
    <main className="container min-h-svh flex flex-col md:flex-row justify-evenly items-center gap-y-16 py-16 md:py-0">
      <div className="flex flex-col justify-evenly gap-y-16 md:min-h-svh lg:py-[20svh] md:py-[30svh] py-[10svh]">
        <div>
          <h1 className="lg:text-7xl md:text-6xl text-5xl text-center font-semibold">Lucas McClean</h1>
          <h2 className="font-mono lg:text-5xl md:text-4xl text-3xl text-center">Dev Team Application</h2>
        </div>
        <div className="flex justify-evenly">
          <LinkedInLink username="lucasmcclean" />
          <GitHubLink username="lucasmcclean" />
          <ResumeLink />
        </div>
      </div>
      <Image
        className="max-w-[60vw] md:max-w-[30vw] rounded-xl border-2 border-foreground"
        src="/lucas-portrait.jpg"
        width="1066"
        height="1600"
        alt="Portrait of Lucas"
      />
    </main >
  )
}
