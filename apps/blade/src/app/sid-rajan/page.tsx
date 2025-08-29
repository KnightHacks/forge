
import Link from "next/link";

export default function SidRajan() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-black text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-32">

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <img
              src="/sidpfp.jpeg"
              alt="sid"
              className="h-28 w-28 rounded-2xl object-cover ring-4 ring-white/10 shadow-xl"
            />
            <div className="flex-1">
              <h1 className="text-3xl font-semibold tracking-tight">
                Hello, I’m Sid Rajan <span className="align-baseline">✌🏾</span>
              </h1>
              <p className="mt-2 text-slate-300">
                Welcome to my Knight Hacks Dev Team application page!
              </p>


              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/resume.pdf"
                  target="_blank"
                  className="inline-flex items-center justify-center 
             rounded-xl bg-gradient-to-r from-indigo-900 via-purple-500 to-blue-400 
             pl-4 pr-4 py-2 font-bold text-white text-center
             hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-purple-300"
                >

                  View Resume (PDF)
                </Link>

                <a
                  href="https://www.linkedin.com/in/siddanth-rajan/"
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-medium text-slate-100 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-300"
                >
                    <img 
                        src="/linked-in.png" 
                        alt="LinkedIn" 
                        className="h-7 w-7" 
                    />
                  LinkedIn
                </a>

                <a
                  href="https://github.com/s1drajan"
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-medium text-slate-100 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-300"
                >
                    <img 
                        src="/github.png" 
                        alt="GitHub" 
                        className="h-6 w-6 invert brightness-0" 
                    />
                    
                  
                  GitHub
                </a>
              </div>
            </div>
          </div>


          <div className="my-8 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />


          <div className="space-y-3">
            <h2 className="text-xl font-semibold">About Me</h2>
            <p className="leading-relaxed text-white">
              I’m a Computer Science student at UCF, passionate about software development
              and building applications that solve real problems. I'm excited about the
              opportunity to join the Dev Team to grow my skills as a developer
              and contribute to some cool projects!
            </p>
          </div>
        </section>



      </div>
    </main>
  );
}
