/*
* TODO:
    - [ ] abstract the page into seperate components
    - [ ] add selected projects section
    - [ ] add more concrete sections
*/
// "use server"
"use client"

import Navbar from "$/adrian-garced/navbar";
import Footer from "$/adrian-garced/footer";
import Intro from "$/adrian-garced/sections/intro";
import Projects from "~/app/_components/adrian-garced/sections/hobby";
import Selected from "$/adrian-garced/sections/selected";
import MyTools from "$/adrian-garced/sections/my-tools";
import AboutMe from "$/adrian-garced/sections/about-me";
import { SELECTED_PROJECTS } from "$/adrian-garced/sections/selected";
import { PROJECTS } from "$/adrian-garced/sections/hobby-data";
import TableOfContents from "$/adrian-garced/toc";

const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

const PAGE_SECTIONS = [
  { id: "intro", label: "Intro", component: Intro },
  {
    id: "selected-projects",
    label: "Selected Projects",
    component: Selected,
    subsections: SELECTED_PROJECTS.map(p => ({ id: slugify(p.title), label: p.title })),
  },
  {
    id: "stack",
    label: "What I Work With",
    component: MyTools,
    subsections: [{ id: "playground", label: "Playground" }],
  },
  {
    id: "projects",
    label: "Hobby Projects",
    component: Projects,
    subsections: PROJECTS.map(p => ({ id: slugify(p.title), label: p.title })),
  },
  { id: "about-me", label: "About Me", component: AboutMe },
];

export default async function AdrianG() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-100 scroll-smooth scroll-bg-[#0a0a0a] bg-[radial-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] bg-size-[24px_24px]">
    {/* scroll offset visualizer */ }
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
        {PAGE_SECTIONS.map(({ id, component: Section }) => (
          <Section key={id} id={id} />
        ))}
      </div>
      <TableOfContents sections={PAGE_SECTIONS} />
      </div>
      <Footer />
    </main>
  );
}
