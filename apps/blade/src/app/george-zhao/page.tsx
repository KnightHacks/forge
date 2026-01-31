import { GitHubLogoIcon, LinkedInLogoIcon } from "@forge/ui";

export default function Page() {
  const retroCSS = `
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        /* Retro / CRT inspired page styles */
        #george-zhao-page {
          font-family: 'Press Start 2P', ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace;
          background: radial-gradient(ellipse at center, #0b0f14 0%, #050507 60%), linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.6));
          /* non-header default text: light for contrast */
          color: #e6eef6;
          background-color: #05050a;
          position: relative;
          overflow: hidden;
        }

        /* Subtle grid background for retro feel */
        #george-zhao-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: linear-gradient(0deg, rgba(0,255,156,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,156,0.03) 1px, transparent 1px);
          background-size: 24px 24px;
          opacity: 0.6;
          pointer-events: none;
          mix-blend-mode: overlay;
        }

        /* Scanlines overlay */
        #george-zhao-page::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.04) 2px 4px);
          pointer-events: none;
          opacity: 0.4;
        }

        /* Boxy retro cards */
        #george-zhao-page .rounded-2xl,
        #george-zhao-page .rounded-lg,
        #george-zhao-page .rounded-md {
          border-radius: 6px;
          border: 2px solid rgba(0,255,156,0.15);
          background: rgba(2,6,23,0.6);
          box-shadow: 0 6px 18px rgba(0,255,156,0.06), 0 0 18px rgba(0,255,156,0.02) inset;
          transition: transform 100ms ease, box-shadow 120ms ease, border-color 120ms ease;
          backdrop-filter: blur(6px);
          position: relative;
          z-index: 1;
        }
        #george-zhao-page .rounded-2xl:hover,
        #george-zhao-page .rounded-lg:hover,
        #george-zhao-page .rounded-md:hover {
          transform: translateY(-4px);
          border-color: rgba(0,255,156,0.35);
          box-shadow: 0 10px 30px rgba(0,255,156,0.08), 0 0 36px rgba(0,255,156,0.06);
        }

        /* Headings and text */
        #george-zhao-page h1, #george-zhao-page h2, #george-zhao-page h3, #george-zhao-page h4 {
          color: #00ff9c;
          text-shadow: 0 1px 0 rgba(0,0,0,0.6), 0 0 8px rgba(0,255,156,0.06);
          letter-spacing: 0.06em;
        }
        /* paragraphs and non-header utility text use a pale/light color */
        #george-zhao-page p, #george-zhao-page .text-slate-200, #george-zhao-page .text-slate-300 {
          color: #e6eef6;
          opacity: 0.95;
          font-family: 'Press Start 2P', monospace;
          font-size: 12px;
        }

        /* Buttons */
        #george-zhao-page a[class*="rounded-md"].bg-green-600 {
          background: linear-gradient(180deg,#00ff9c 0%, #00b07a 100%);
          color: #00110a;
          border: 2px solid rgba(0,255,156,0.18);
          box-shadow: 0 6px 18px rgba(0,176,122,0.12), 0 0 12px rgba(0,255,156,0.08);
          transition: transform 80ms ease;
        }
        #george-zhao-page a[class*="rounded-md"].bg-green-600:active { transform: translateY(1px) scale(0.998); }

        /* Small chips */
        #george-zhao-page .px-3.py-1.rounded-full {
          border-radius: 4px;
          background: rgba(0,255,156,0.06);
          color: #00ff9c;
          border: 1px solid rgba(0,255,156,0.08);
        }

        /* Avatar styling */
        #george-zhao-page [role="img"] {
          background: linear-gradient(180deg,#00b07a,#007f5f);
          color: #00110a;
          box-shadow: 0 6px 14px rgba(0,0,0,0.6), 0 0 8px rgba(0,255,156,0.06);
          font-family: 'Press Start 2P', monospace;
          letter-spacing: 0.04em;
          image-rendering: pixelated;
          -webkit-font-smoothing: none;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Links */
        #george-zhao-page a { color: #8fffb1; text-decoration: none; }
        #george-zhao-page a:hover { color: #ffffff; text-shadow: 0 0 6px rgba(0,255,156,0.2); }

        /* Card initials */
        #george-zhao-page .h-12.w-12.rounded-md { border-radius: 4px; background: linear-gradient(180deg,#00b07a,#007f5f); color:#00110a; font-family: 'Press Start 2P', monospace; }

        /* Slightly less rounded for boxy retro look */
        #george-zhao-page .rounded-2xl { border-radius: 8px; }
        /* Force gold glow for highlighted card and add outer glow using a pseudo-element */
        #george-zhao-page .highlight-gold {
          position: relative;
          z-index: 2;
        }
        #george-zhao-page .highlight-gold::after {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 10px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 220ms ease, transform 220ms ease;
          transform: scale(0.98);
          box-shadow: 0 8px 24px rgba(250,204,21,0.12), 0 0 40px rgba(250,204,21,0.06) inset;
        }
        #george-zhao-page .highlight-gold:hover::after {
          opacity: 1 !important;
          transform: scale(1);
          box-shadow: 0 16px 48px rgba(250,204,21,0.32), 0 0 80px rgba(250,204,21,0.18) inset;
        }
        /* Also ensure border color and shadow switch to gold on hover */
        #george-zhao-page .highlight-gold:hover {
          border-color: rgba(250,204,21,0.95) !important;
          box-shadow: 0 12px 36px rgba(250,204,21,0.32) !important, 0 0 48px rgba(250,204,21,0.18) !important;
        }
      `;

  return (
    <main id="george-zhao-page" className="min-h-screen text-white py-16 px-6" style={{backgroundColor: 'hsl(220 8% 10%)'}}>
      <style dangerouslySetInnerHTML={{ __html: retroCSS }} />
      <div className="mx-auto max-w-5xl lg:flex lg:gap-12">
        <header className="mb-10 lg:mb-0 lg:w-1/3">
          <div className="rounded-2xl bg-white/4 p-8 shadow-lg backdrop-blur">
            <div role="img" aria-label="Portrait illustration of George Zhao" className="h-32 w-32 rounded-full bg-green-600 flex items-center justify-center text-4xl font-bold text-white mb-4">
              GZ
            </div>
            <h1 className="text-3xl font-extrabold">George Zhao</h1>
            <p className="mt-3 text-slate-200">CS @ UCF • Student Researcher & Software Engineer</p>

            <div className="mt-3 text-slate-200 text-sm">
              <div className="flex gap-3 mt-2">
                <a href="https://www.linkedin.com/in/george-zhao-b22150380" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-300 hover:text-white">
                  <LinkedInLogoIcon className="h-4 w-4" />
                  LinkedIn
                </a>
                <a href="https://github.com/ChillPanda100" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-300 hover:text-white">
                  <GitHubLogoIcon className="h-4 w-4" />
                  GitHub
                </a>
              </div>
            </div>

            <div className="mt-6 space-y-3"></div>
          </div>

          <div className="mt-6 rounded-2xl bg-white/5 p-6">
            <h3 className="text-sm text-slate-300 uppercase tracking-wide">Skills</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {['TypeScript','React','Next.js','Tailwind CSS','Node.js','Postgres', 'MySQL','Discord API','Python','Java','C#',"C++",'Dart'].map(skill => (
                  <span key={skill} className="rounded-full bg-white/6 px-3 py-1 text-xs text-slate-200">{skill}</span>
                ))}
              </div>
          </div>
          
          <div className="mt-6 rounded-2xl bg-white/6 p-6">
            <h3 className="text-sm text-slate-300 uppercase tracking-wide">Resume</h3>
            <div className="mt-3 flex gap-3">
              <a className="rounded-md bg-white/5 px-4 py-2 text-sm hover:bg-white/8" href="/george-zhao/resume" target="_blank" rel="noreferrer">View / Download Resume (PDF)</a>
            </div>
          </div>
        </header>
        
          <div className="mt-6 rounded-2xl bg-white/6 p-6 lg:w-1/3 hidden" />

        <section className="lg:w-2/3">
          <div className="rounded-2xl bg-white/6 p-8 shadow-lg backdrop-blur">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">Application — Dev Team 2026–2027</h2>
                <p className="mt-2 text-slate-200">Hey there! I'm excited to apply for the Dev Team and to have the opportunity to work with so many great people. Below is a summary of my background and a few of my projects.</p>
              </div>
            </div>

            <section className="mt-8 grid gap-6">
              <article>
                <h3 className="text-xl font-semibold">Education</h3>
                <p className="mt-2 text-slate-200">University of Central Florida — Bachelor of Science in Computer Science (Expected May 2029) • GPA: 4.0</p>
                <div className="mt-2 text-slate-300 text-sm">Organizations: Competitive Programming Team, Knight Hacks, Hack@UCF</div>
              </article>

              <article>
                <h3 className="text-xl font-semibold">Experience</h3>
                <ul className="mt-3 space-y-3 text-slate-200">
                  <li>
                    <div className="text-base font-extrabold">Simulation & Modeling Engineering Intern — Institute for Simulation & Training (Dec 2025 – Jan 2026)</div>
                    <div className="text-sm text-slate-300">Designed a real-time cyber–energy training simulation for the Department of Energy; implemented a React + TypeScript front-end and modular simulation logic; built a live telemetry dashboard visualizing multiple metrics at ~1 Hz with a rolling analysis window.</div>
                  </li>
                  <li>
                    <div className="text-base font-extrabold">LLMs / Embedded Systems Research Assistant — University of Central Florida (Sep 2025 – Present)</div>
                    <div className="text-sm text-slate-300">Studied security attacks and soft errors on llama.cpp inference on embedded platforms across 1,000+ fault-injection scenarios; identified vulnerability classes and developed mitigation techniques improving model robustness up to 25% and reducing error rates from 12% to 3% under simulated faults.</div>
                  </li>
                </ul>
              </article>

              <article>
                <h3 className="text-xl font-semibold">Some Cool Projects</h3>
                <div className="mt-3 grid gap-3">
                  <Card highlight title="Zero Panic in Movement" desc="Flutter, Dart, ROS, Python — ROS2 swarm robotics project; 1st place Pheratech Systems ROS2 Autonomy Challenge." link="https://devpost.com/software/zero-panic-in-movement-zpm"/>
                  <Card title="Q-READY" desc="React, Typescript — Post-Quantum cyber-energy simulation for energy grids." link="https://chillpanda100.github.io/Q-READY/"/>
                </div>
              </article>



              

            </section>
          </div>
        </section>
      </div>
    </main>
  )
}

function Card({title, desc, link, highlight}: {title:string, desc:string, link:string, highlight?:boolean }){
  const initials = title.split(' ').map(w => w[0]).slice(0,2).join('')
  const base = 'block rounded-lg bg-white/4 p-4 hover:scale-[1.01] transition-transform flex items-center gap-4';
  const highlightClass = 'ring-2 ring-amber-400/40 bg-gradient-to-r from-[#2b2209] to-[#3b2d0b] transition-all duration-200';
  const highlightHover = 'hover:shadow-[0_10px_30px_rgba(250,204,21,0.28)] hover:ring-4 hover:ring-amber-400/70';
  const classes = `${base} ${highlight ? `${highlightClass} ${highlightHover} highlight-gold` : ''}`;
  return (
    <a href={link} target="_blank" rel="noreferrer" className={classes}>
      <div className={"h-12 w-12 rounded-md flex-shrink-0 flex items-center justify-center text-white font-bold " + (highlight ? 'bg-amber-400 text-black' : 'bg-green-600')}>{initials}</div>
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="mt-1 text-sm text-slate-200">{desc}</p>
      </div>
      {highlight && (
        <div className="ml-auto px-2 py-1 rounded text-xs bg-amber-400 text-black font-bold">1st Place</div>
      )}
    </a>
  )
}
