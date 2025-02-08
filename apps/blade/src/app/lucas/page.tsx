import type { Metadata } from "next";
import Image from "next/image";
import portrait from "public/lucas-portrait.jpg";

import LinkedInLink from "./_components/linkedin-link";
import GitHubLink from "./_components/github-link";

export const metadata: Metadata = {
  title: "Lucas McClean",
  description: "Dev team application attached:",
};

export default async function Dashboard() {
  return (
    <main className="w-full h-full bg-gradient-to-br from-accent/70">
      <section className="h-screen md:px-16 px-2 py-16 flex items-end justify-end">
        <div className="flex flex-col items-end text-end">
          <h1 className="lg:text-6xl md:text-5xl text-3xl font-bold">Lucas McClean</h1>
          <h2 className="lg:text-5xl md:text-4xl text-xl font-mono">Dev Team Application</h2>
        </div>
      </section>
      <section className="flex flex-col-reverse items-center gap-8 md:flex-row md:items-center md:justify-evenly px-16 py-20">
        <blockquote className="max-w-lg text-lg">
          <p className="md:text-justify font-semibold">
            All programming requires is a creative mind and the ability to organize your thoughts. If you can visualize a system, you can probably implement it in a computer program.
          </p>
          <br />
          <footer className="text-end">- John Ousterhout, <cite>A Philosophy of Software Design</cite></footer>
        </blockquote>
        <div className="relative w-2/5 min-w-48 md:w-1/4">
          <Image
            src={portrait}
            alt="Portrait of Lucas McClean"
          />
        </div>
      </section>
      <section className="flex justify-center gap-16 py-32">
        <LinkedInLink username="lucasmcclean" color="accent" />
        <GitHubLink username="lucasmcclean" color="accent" />
      </section>
    </main >
  )
}
