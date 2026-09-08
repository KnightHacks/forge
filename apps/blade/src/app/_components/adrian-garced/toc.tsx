"use client"

import { useEffect, useState } from "react";

type NavSubsection = {
  id: string;
  label: string;
};

type NavEntry = {
  id: string;
  label: string;
  component: React.ComponentType<{ id: string }>;
  subsections?: NavSubsection[];
};

export default function TableOfContents({ sections }: { sections: NavEntry[] }) {
  const [activeId, setActiveId] = useState<string>("projects");

  useEffect(() => {
    const sectionIds = sections.flatMap(s => [s.id, ...(s.subsections?.map(sub => sub.id) ?? [])]);
    const activationOffset = 400;

    const updateActiveSection = () => {
      let currentSection = sectionIds[0];

      for (const id of sectionIds) {
        const element = document.getElementById(id);

        if (!element) continue;

        const top = element.getBoundingClientRect().top;

        if (top <= activationOffset) {
          currentSection = id;
        }
      }

      setActiveId(currentSection!);
    };

    updateActiveSection();

    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("pageshow", updateActiveSection);
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("pageshow", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  return (
    <aside className="right hidden w-48 shrink-0 lg:block">
        <div className="sticky top-24">
          <p className="mb-4 text-xs font-semibold tracking-wider text-neutral-500 uppercase">On this page</p>
          <nav className="border-l border-neutral-800">
            <ul className="space-y-2 pl-4 text-sm">
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className={`block transition-colors duration-200 ${
                    activeId === section.id
                      ? "font-medium text-emerald-400!"
                      : "text-neutral-300! hover:text-neutral-100!"
                  }`}>{section.label}</a>
                  {section.subsections && (
                    <ul className="mt-1 space-y-1 border-l border-neutral-800 pl-3">
                      {section.subsections.map(sub => (
                        <li key={sub.id}>
                          <a href={`#${sub.id}`} className={`block transition-colors duration-200 ${
                            activeId === sub.id
                              ? "font-medium text-emerald-400!"
                              : "text-neutral-400! hover:text-neutral-200!"
                          }`}>{sub.label}</a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>
  )
}