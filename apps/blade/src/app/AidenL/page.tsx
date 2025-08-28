"use client";

import Link from "next/link";

const PANELS = [
  "/bluelock/panel01.jpg",
  "/bluelock/panel02.jpg",
  "/bluelock/panel03.jpg",
  "/bluelock/panel04.jpg",
  "/bluelock/panel05.jpg",
  "/bluelock/panel06.jpg",
  "/bluelock/panel07.jpg",
  "/bluelock/panel08.jpg",
  "/bluelock/panel09.jpg",
  "/bluelock/panel10.jpg",
  "/bluelock/panel11.jpg",
  "/bluelock/panel12.jpg",
  "/bluelock/panel13.jpg",
  "/bluelock/panel14.jpg",
  "/bluelock/panel15.jpg",
  "/bluelock/panel16.jpg",
];

const COLS = 7;                         // number of columns
const COL_WIDTH = 220;                  // px per column
const GAP_X = 16;                       // px between columns
const SPEED_RANGE = [18, 34] as const;  // seconds per loop [min, max]
const MIN_IMGS_PER_COL = 16;            // how many unique panels per column (before duplication to loop)

function randBetween([min, max]: readonly [number, number]) {
  return min + Math.random() * (max - min);
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

function sample<T>(arr: T[], k: number): T[] {
  if (k >= arr.length) return shuffle(arr);
  return shuffle(arr).slice(0, k);
}

function Column({ index }: { index: number }) {
  // Different pictures per column
  const baseSet = sample(PANELS, Math.max(MIN_IMGS_PER_COL, Math.ceil(PANELS.length * 0.5)));
  const images = shuffle(baseSet); // unique order per column

  // Unique speed & offset
  const duration = randBetween(SPEED_RANGE);
  const delay = -Math.random() * duration; // negative = start mid-cycle

  const directionUp = index % 2 === 0;

  return (
    <div
      className="col"
      style={{ width: `${COL_WIDTH}px`, marginRight: `${GAP_X}px` }}
    >
      <div
        className="stack"
        style={{
          animation: `${directionUp ? "scroll-up" : "scroll-down"} ${duration}s linear infinite`,
          animationDelay: `${delay}s`,
          WebkitAnimation: `${directionUp ? "scroll-up" : "scroll-down"} ${duration}s linear infinite`,
          WebkitAnimationDelay: `${delay}s`,
          willChange: "transform",
        }}
      >
        {/* Stack A */}
        <div className="panel-stack">
          {images.map((src, i) => (
            <img key={`a-${i}`} src={src} alt="" className="panel-img" />
          ))}
        </div>
        {/* Stack B (duplicate for seamless loop) */}
        <div className="panel-stack">
          {images.map((src, i) => (
            <img key={`b-${i}`} src={src} alt="" className="panel-img" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <main className="root">
      {/* Animated Background */}
      <div className="bg-root" aria-hidden="true">
        <div className="columns">
          {Array.from({ length: COLS }).map((_, i) => (
            <Column key={i} index={i} />
          ))}
        </div>
        <div className="fade fade-top" />
        <div className="fade fade-bottom" />
      </div>

      {/* Foreground Content */}
      <section className="content">
        <div className="card">
          <h1 className="title">Aiden Letourneau</h1>
          <p className="subtitle">
            Hey, I'm Aiden. I really enjoy building with a team. 
            I'm here to learn from you guys and contribute using 
            the experience I already have. I look forward to this 
            season of KnightHacks! <br/> 
            P.S. Talk to me about Blue Lock 😛</p>
          <div className="links">
            <iframe 
            src="/Letourneau_Aiden_Resume.pdf" 
            className="w-full h-[400px] border rounded-lg"
            >
            </iframe>
            <div className="link-row">
              <Link href="https://github.com/aidenletourneau" target="_blank" className="link">
                GitHub
              </Link>
              <Link href="https://www.linkedin.com/in/aiden-letourneau-4670a22a8/" target="_blank" className="link">
                LinkedIn
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Global keyframes so animation names always resolve */}
      <style jsx global>{`
        html, body { height: 100%; overflow: hidden; }

        @keyframes scroll-up {
          0%   { transform: translate3d(0, 0%, 0); }
          100% { transform: translate3d(0, -50%, 0); }
        }
        @keyframes scroll-down {
          0%   { transform: translate3d(0, -50%, 0); }
          100% { transform: translate3d(0, 0%, 0); }
        }
      `}</style>

      <style jsx>{`
        .root {
          height: 100vh;
          overflow: hidden;
          position: relative;
          background: #0b1020; /* deep navy behind columns */
        }

        .bg-root {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .columns {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          height: 100vh;   /* anchor for % heights below */
          padding: 0 24px;
        }

        .col {
          position: relative;
          height: 100%;     /* % for children resolves */
        }

        .stack {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 200%;     /* two stacks tall for seamless loop */
        }

        .panel-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          padding-bottom: 12px;
        }

        .panel-img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
          border-radius: 10px;
          filter: grayscale(100%) contrast(1.1);
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
          user-select: none;
          pointer-events: none;
        }

        .fade {
          position: absolute;
          left: 0;
          width: 100%;
          height: 120px;
          pointer-events: none;
          z-index: 2;
        }
        .fade-top {
          top: 0;
          background: linear-gradient(to bottom, rgba(11,16,32,1), rgba(11,16,32,0));
        }
        .fade-bottom {
          bottom: 0;
          background: linear-gradient(to top, rgba(11,16,32,1), rgba(11,16,32,0));
        }

        .content {
          position: relative;
          z-index: 10;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .card {
          width: 100%;
          max-width: 720px;
          padding: 28px;
          border-radius: 16px;
          backdrop-filter: blur(6px);
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e8ecff;
          text-align: center;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
        }
        .title { font-size: 2.25rem; font-weight: 800; margin: 0 0 6px; }
        .subtitle { margin: 0 0 16px; opacity: 1; }

        .links { display: grid; gap: 12px; justify-items: center; }
        .btn {
          padding: 10px 16px;
          border-radius: 12px;
          background: #5b7cfa;
          color: #fff;
          text-decoration: none;
          font-weight: 700;
          transition: transform .15s ease, box-shadow .15s ease;
          box-shadow: 0 6px 14px rgba(91,124,250,.35);
        }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(91,124,250,.4); }

        .link-row { display: flex; gap: 18px; flex-wrap: wrap; }
        .link { color: #cfe1ff; text-decoration: underline; }

        @media (max-width: 1024px) { .columns { transform: translateX(-50%) scale(.9); } }
        @media (max-width: 768px)  { .columns { transform: translateX(-50%) scale(.8); } }
        @media (max-width: 520px)  { .columns { transform: translateX(-50%) scale(.7); } .card { padding: 18px; } .title { font-size: 1.8rem; } }
      `}</style>
    </main>
  );
}
