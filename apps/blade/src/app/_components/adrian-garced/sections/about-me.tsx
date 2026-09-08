"use server"

import { Book } from "lucide-react";

type CurrentlyReading = {
  title: string;
  author: string;
  coverUrl: string | null;
};

// UNUSED: openlibrary.org fetching is too slow
// async function getCurrentlyReading(): Promise<CurrentlyReading | null> {
//   try {
//     const res = await fetch(
//       "https://openlibrary.org/search.json?q=inside+the+machine&fields=title,author_name,cover_i&limit=1",
//       // { next: { revalidate: 60 * 60 * 24 } } // re-fetch at most once a day https://nextjs.org/docs/app/api-reference/functions/fetch#optionsnexttags
//     );
//     if (!res.ok) return null;

//     const data = await res.json();
//     const book = data.docs?.[0];
//     if (!book) return null;

//     return {
//       title: book.title,
//       author: book.author_name?.[0] ?? "Unknown",
//       coverUrl: book.cover_i
//         ? `https://ia801501.us.archive.org/view_archive.php?archive=/27/items/olcovers87/olcovers87-L.zip&file=870291-L.jpg`
//         : null,
//     };
//   } catch {
//     return null;
//   }
// }

export default async function AboutMe({ id }: { id: string }) {
  // hardcoding values for to avoid fetching
  const book: CurrentlyReading = {
    title: "Inside the Machine",
    author: "Jon Stokes",
    coverUrl: "https://ia801501.us.archive.org/view_archive.php?archive=/27/items/olcovers87/olcovers87-L.zip&file=870291-L.jpg"
  };

  return (
    <section id={id} className="mt-32 scroll-mt-24">
      <div className="max-w-6xl">
        <p className="text-sm font-medium tracking-wider text-emerald-400">
          ABOUT ME
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          adrian-g@~{":"} whoami
        </h2>

        <p className="mt-6 text-base leading-7 text-neutral-200">
          I'm interested in fullstack web development, game development,
          systems programming, and graphics. Most of my learning comes
          from building experimental projects. I am working on trying to
          finish my projects and make them resume ready.
        </p>

        <p className="mt-4 text-base leading-7 text-neutral-200">
          I have been programming since middle-school, doing little things
          like creating juiced character controllers in Unity and Godot,
          making basic python scripts, and reverse engineering pirating website APIs.
          But, I never really felt like I completed anything or had any sort of tangible impact.
        </p>

        <p className="mt-4 text-base leading-7 text-neutral-200">
          My goal is to contribute as much as possible to the team and the club, that
          way I can finally say that my programming knowledge has had a real-life impact!
        </p>
      </div>

      {book && (
        // <div className="mt-10 flex w-full justify-center">
          <div className="mt-3 flex w-fit items-center gap-6 rounded-lg border border-neutral-700 bg-neutral-900/40 p-6">
            {book.coverUrl && (
              <img
                src={book.coverUrl}
                alt={`Cover of ${book.title}`}
                className="h-24 w-auto rounded-sm shadow-lg"
              />
            )}

            <div>
              <span className="flex items-center gap-1.5">
                <p className="text-sm font-medium tracking-wider text-neutral-500 uppercase">
                  Currently reading
                </p>
                <Book className="size-4 stroke-neutral-500" />
              </span>

              <p className="mt-1 text-base tracking-wider font-medium text-neutral-100">
                {book.title}
              </p>

              <p className="text-sm text-neutral-400">
                {book.author}
              </p>
            </div>
          </div>
        // </div>
      )}
    </section>
  );
}
