/*
* TODO:
    - [ ] abstract the page into seperate components
    - [ ] add selected projects section
    - [ ] add more concrete sections
*/

import Footer from "$/adrian-garced/footer";
import Navbar from "$/adrian-garced/navbar";
import AboutMe from "$/adrian-garced/sections/about-me";
import { PROJECTS } from "$/adrian-garced/sections/hobby-data";
import Intro from "$/adrian-garced/sections/intro";
import MyTools from "$/adrian-garced/sections/my-tools";
import Selected from "$/adrian-garced/sections/selected";
import { SELECTED_PROJECTS } from "$/adrian-garced/sections/selected-data";
import TableOfContents from "$/adrian-garced/toc";
import Reveal from "$/adrian-garced/reveal";

import Projects from "~/app/_components/adrian-garced/sections/hobby";

const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

const PAGE_SECTIONS = [
  { id: "intro", label: "Intro" },
  {
    id: "selected-projects",
    label: "Selected Projects",
    subsections: SELECTED_PROJECTS.map((p) => ({
      id: slugify(p.title),
      label: p.title,
    })),
  },
  {
    id: "stack",
    label: "What I Work With",
    subsections: [{ id: "playground", label: "Playground" }],
  },
  {
    id: "projects",
    label: "Hobby Projects",
    subsections: PROJECTS.map((p) => ({
      id: slugify(p.title),
      label: p.title,
    })),
  },
  { id: "about-me", label: "About Me" },
];

export default function AdrianG() {
  return (
    <main className="scroll-bg-[#0a0a0a] bg-size-[24px_24px] min-h-screen scroll-smooth bg-[#0a0a0a] bg-[radial-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] text-neutral-100">
      {/* scroll offset visualizer */}
      {/* <div
      className="pointer-events-none fixed left-0 right-0 z-9999 border-t-2 border-red-500"
      style={{ top: "400px" }}
    >
      <span className="absolute right-4 -top-6 rounded bg-red-500 px-2 py-1 text-xs font-mono text-black">
        ACTIVE SECTION BOUNDARY
      </span>
    </div> */}
      <Navbar />

      <div className="mx-auto flex max-w-6xl gap-12 px-6 py-24">
        <div className="min-w-0 flex-1">
          <Reveal>
            <Intro id="intro" />
          </Reveal>

          <Reveal>
            <Selected id="selected-projects" />
          </Reveal>

          <Reveal>
            <MyTools id="stack" />
          </Reveal>

          <Reveal>
            <Projects id="projects" />
          </Reveal>

          <Reveal>
            <AboutMe id="about-me" />
          </Reveal>
        </div>

        <TableOfContents sections={PAGE_SECTIONS} />
      </div>
      <Footer />
    </main>
  );
}
