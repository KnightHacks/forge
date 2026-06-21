import Link from "next/link";

export function Redirect({
  label,
  target,
}: {
  label: string;
  target: string;
}) {
  const isExternal = /^https?:\/\//i.test(target);

  return (
    <>
      {/* Static export cannot emit HTTP 3xx redirects, so legacy routes use an HTML refresh fallback. */}
      <meta httpEquiv="refresh" content={`0;url=${target}`} />
      <main className="flex min-h-screen items-center justify-center bg-[#120313] px-6 text-center text-white">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--club-gold)]">
            Redirecting
          </p>
          <h1 className="mt-4 text-3xl font-black uppercase leading-none">
            {label}
          </h1>
          <p className="mt-5 text-sm font-semibold text-white/70">
            {isExternal ? (
              <a href={target} className="text-[var(--club-gold)] underline">
                Continue
              </a>
            ) : (
              <Link href={target} className="text-[var(--club-gold)] underline">
                Continue
              </Link>
            )}
          </p>
        </div>
      </main>
    </>
  );
}
