import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Raul Rodriguez | KnightHacks Dev Team Application",
};

export default function RaulPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-4xl font-semibold text-foreground">Raul Rodriguez</h1>
      <h2 className="mt-4 max-w-2xl text-muted-foreground">
        CS Student at UCF. I build things that solve annoying problems.
      </h2>
    </main>
  );
}
