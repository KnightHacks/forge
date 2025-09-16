// apps/blade/src/app/your-name/page.tsx
export const metadata = {
  title: "John Doe – KnightHacks Dev Application",
  description: "Application page for John Doe",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">John Doe — Dev Team Application</h1>

      <section className="mt-6 space-y-2">
        <h2 className="text-xl font-semibold">Resume</h2>
        <a
          href="https://example.com/resume.pdf"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          View Resume (PDF)
        </a>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-xl font-semibold">Links</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <a className="underline" href="https://linkedin.com/in/johndoe">
              LinkedIn
            </a>
          </li>
          <li>
            <a className="underline" href="https://johndoe.dev">
              Portfolio
            </a>
          </li>
          <li>
            <a className="underline" href="https://github.com/johndoe">
              GitHub
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
