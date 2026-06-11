"use client";

export default function GlobalError() {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-[#140316] px-6 text-center text-white">
          <div className="max-w-xl">
            <p className="club-eyebrow text-sm font-black">Knight Hacks</p>
            <h1 className="mt-5 text-4xl font-black uppercase md:text-6xl">
              Something went wrong
            </h1>
            <p className="mt-5 text-base font-semibold leading-7 text-[#d1d5dc]">
              Please refresh the page or try again in a moment.
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
