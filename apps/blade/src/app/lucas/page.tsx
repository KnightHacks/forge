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
    <main className="container min-h-svh flex justify-evenly items-center">
      <div className="flex flex-col justify-evenly min-h-svh py-[20svh]">
        <div>
          <h1 className="text-8xl font-semibold">Lucas McClean</h1>
          <h2 className="font-mono text-6xl">Dev Team Application</h2>
        </div>
        <div className="flex justify-evenly">
          <LinkedInLink username="lucasmcclean" />
          <GitHubLink username="lucasmcclean" />
          <ResumeLink />
        </div>
      </div>
      <Image
        className="max-w-[30vw] rounded-xl border-2 border-foreground"
        src="/lucas-portrait.jpg"
        width="1066"
        height="1600"
        alt="Portrait of Lucas"
      />
    </main >
  )
}
