export default function Page() {
  return (
    <main className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-gray-950 to-emerald-950">
      {/* Simple "Sparkle" effect using absolute positioned divs */}
      <div className="absolute top-1/4 left-1/4 h-2 w-2 animate-pulse rounded-full bg-indigo-300 blur-[1px]"></div>
      <div className="absolute top-1/3 right-1/4 h-3 w-3 animate-pulse rounded-full bg-emerald-300 blur-[2px]"></div>
      <div className="absolute bottom-1/3 left-1/3 h-2 w-2 animate-pulse rounded-full bg-indigo-200 blur-[1px]"></div>
      <div className="absolute bottom-1/4 right-1/3 h-4 w-4 animate-pulse rounded-full bg-emerald-200 blur-[2px]"></div>

      <h1 className="z-10 text-center text-6xl font-extrabold tracking-tighter text-white md:text-8xl lg:text-9xl">
        <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
          Knight Hacks
        </span>
        <br />
        IX
      </h1>
    </main>
  );
}
