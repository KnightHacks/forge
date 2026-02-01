export default function DanielSchevisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-black dark:from-gray-900 dark:via-slate-900 dark:to-black from-gray-100 via-gray-200 to-gray-300">
      {/* Gotham-style header with bat signal effect */}
      <div className="relative overflow-hidden border-b border-yellow-500/20 bg-black/40 dark:bg-black/40 bg-white/60 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-6 py-8">
          <h1 className="font-bold text-5xl tracking-tight text-yellow-400 dark:text-yellow-400 text-yellow-600 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]">
            DANIEL SCHEVIS
          </h1>
          <p className="mt-2 font-mono text-sm tracking-widest text-gray-400 dark:text-gray-400 text-gray-700">
            // DEVELOPER • GOTHAM CITY
          </p>
        </div>
      </div>

      {/* Main content area */}
      <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>

      {/* Footer */}
      <footer className="border-t border-yellow-500/20 bg-black/60 dark:bg-black/60 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-center justify-center">
            <p className="font-mono text-sm text-gray-400 dark:text-gray-400 text-gray-700">
              Protecting the campus, one commit at a time
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
