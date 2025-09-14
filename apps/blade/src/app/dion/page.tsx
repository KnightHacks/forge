"use client";
import { useEffect, useState } from "react";
import { Linkedin } from "lucide-react";

export default function App() {
  const [bubbles, setBubbles] = useState<{ left: string; delay: string; dur: string }[]>([]);

  useEffect(() => {
    const arr = Array.from({ length: 20 }).map(() => ({
      left: `${Math.random() * 150}%`,
      delay: `${Math.random() * 10}s`,
      dur: `${6 + Math.random() * 6}s`,
    }));
    setBubbles(arr);
  }, []);

  return (
    <>
      <style>{`
        /* Background water */
        .water {
          position: fixed;
          inset: 0;
          background: linear-gradient(to bottom, #23639c, #098ed9, #0f93d7, #3bc1cf, #52c5bd);
          overflow: hidden;
          z-index: -1;
        }

        /* Bubble rising */
        .bubble {
          position: absolute;
          bottom: -10%;
          width: 20px;
          height: 20px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          animation-name: rise;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in;
        }

        @keyframes rise {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          10%  { opacity: 0.9; }
          100% { transform: translateY(-120vh) scale(1.2); opacity: 0; }
        }

        /* Luffy */
        .Luffy-wrap {
          position: absolute;
          bottom: 10vh;
          left: 0;
          width: max-content;
          animation: swim-right 18s linear infinite;
        }
        .Luffy {
          width: 120px;
          animation: bob 4s ease-in-out infinite;
        }

        @keyframes swim-right {
          from { transform: translateX(-15vw); }
          to   { transform: translateX(115vw); }
        }
        @keyframes bob {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(12px); }
        }

        /* Sand */
        .sand {
          width: 100%;
          height: 100px;
          background: linear-gradient(to top, #ac9138, #d1bc85, #e8d89d);
          position: fixed;
          bottom: 0;
          left: 0;
          border-top-left-radius: 50% 20px;
          border-top-right-radius: 50% 20px;
          box-shadow: 0 -5px 15px rgba(0,0,0,0.1);
          z-index: 0;
        }

        /* chopper */
        .chopper {
          position: fixed;
          bottom: 10px;
          right: 50px;
          width: 100px;
          animation: bob 5s ease-in-out infinite alternate;
        }

        /* Starmie */
        .Starmie {
          position: fixed;
          bottom: 10px;
          left: 50px;
          width: 70px;
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
      `}</style>

      <div className="water">
        {bubbles.map((b, i) => (
          <div
            key={i}
            className="bubble"
            style={{
              left: b.left,
              animationDuration: b.dur,
              animationDelay: b.delay,
              width: b.size,
              height: b.size,
              opacity: b.opacity,
              filter: `blur(${b.blur})`,
              boxShadow: "0 0 8px 2px rgba(255,255,255,0.2)",
              border: "1.5px solid rgba(255,255,255,0.7)",
            }}
          />
        ))}

        {/* luffy */}
        <div className="Luffy-wrap">
          <img
            src="/luffy.gif"
            alt="Luffy"
            className="Luffy"
          />
        </div>

        {/* sand */}
        <div className="sand relative">
          {/* sand bits */}
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                bottom: `${5 + Math.random() * 80}px`,
                left: `${Math.random() * 98}%`,
                width: `${4 + Math.random() * 8}px`,
                height: `${4 + Math.random() * 8}px`,
                background: `rgba(191,167,106,${0.6 + Math.random() * 0.3})`,
                borderRadius: "50%",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                zIndex: 1,
              }}
            />
          ))}
        </div>
        <img
          src="/chopper.gif"
          alt="chopper"
          className="chopper"
        />
        <img
          src="/STARMIE.png"
          alt="Starmie"
          className="Starmie"
        />
      </div>

      {/* resume */}
      <div className="relative z-10 min-h-screen flex flex-col items-center p-8 text-gray-800">
        {/* header */}
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">Dion Lin</h1>
          <p className="text-lg text-blue-200">
            Software Engineer | Front-End Dev | Web Designer
          </p>
        </header>

        {/* abt me */}
        <section className="w-full max-w-2xl bg-white bg-opacity-90 shadow-lg rounded-2xl p-6 mb-10">
          <h2 className="text-2xl font-semibold mb-4">About Me</h2>
          <ul className="space-y-3">
            <li>
              <strong>Experiences</strong>
              <ul className="list-disc list-inside ml-4 text-gray-700">
                <li>Software Developer @ Resilience</li>
                <li>Created a Kpop Demon Hunters Web Player</li>
                <li>Designed an interactive mathematics website</li>
              </ul>
            </li>
            <li>
              <strong>Things I Like</strong>
              <ul className="list-disc list-inside ml-4 text-gray-700">
                <li>League of Legends</li>
                <li>ONE PIECE / Attack on Titan / Haikyuu</li>
                <li>Coding meaningful projects</li>
                <li>Baking AND Cooking</li>
                <li>Pokemon</li>
              </ul>
            </li>
          </ul>
        </section>
        
        {/* resume + linkedin */}
        <div className="flex justify-center items-center gap-8 mb-10">
          <a
            href="https://www.linkedin.com/in/dion-lin/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/ONEPIECE.png"
              alt="LinkedIn"
              width={200}
              height={150}
              className="shadow-lg hover:scale-105 transition cursor-pointer"
            />
          </a>
          <a
            href="/Dion_Lins_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/RESUMEOP.png"
              alt="Resume"
              width={200}
              height={150}
              className="shadow-lg hover:scale-105 transition cursor-pointer"
            />
          </a>
          <a
            href="https://github.com/ddsalmon1"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/GITHUB.png"
              alt="GitHub"
              width={190}
              height={140}
              className="shadow-lg hover:scale-100 transition cursor-pointer"
            />
          </a>
        </div>
      </div>
    </>
  );
}
