import Navbar from "./navbar";

interface SectionPageShellProps {
  title: string;
}

export default function SectionPageShell({
  title,
}: SectionPageShellProps) {
  return (
    <main className="club-home-bg min-h-screen overflow-hidden">
      <Navbar />
      <section className="container flex min-h-screen items-center justify-center pt-40">
        <h1 className="font-inter text-5xl font-bold uppercase tracking-[0.57px] text-white md:text-7xl">
          {title}
        </h1>
      </section>
    </main>
  );
}
