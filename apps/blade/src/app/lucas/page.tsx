import type { Metadata } from "next";

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
      <div>
        <h1 className="text-8xl font-semibold">Lucas McClean</h1>
        <h2 className="font-mono text-6xl">Dev Team Application</h2>
      </div>
      <div className="h-[80svh] flex flex-col justify-evenly px-[5vw]">
        <LinkedInLink username="lucasmcclean" />
        <GitHubLink username="lucasmcclean" />
        <ResumeLink />
      </div>
    </main >
  )
}
