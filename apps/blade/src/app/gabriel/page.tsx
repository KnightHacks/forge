const links = [
  {
    label: "Resume",
    href: "/Gabriel-Barreto-Otero-Resume.pdf",
  },
  {
    label: "GitHub",
    href: "https://github.com/Luxx12",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/gabriel-b-otero/",
  },
];

const projects = [
  {
    name: "Kinexis",
    award: "Best App – KnightHacks VIII",
    description:
      "Full-stack computer vision web app that helps physical therapists assess patient range of motion using real-time pose detection. Reduces assessment time from 15-20 minutes to under 5 minutes. Features include live webcam tracking with MediaPipe, SQLite database for patient data, and automatic generation of APTA-compliant PDF medical reports.",
    tech: ["Python", "Flask", "OpenCV", "MediaPipe", "SQLite"],
    href: "https://github.com/Luxx12",
  },
  {
    name: "InfoScope",
    award: "Built at ShellHacks",
    description:
      "Chrome extension that extracts article content and provides AI-powered summaries and Q&A functionality using Google's Gemini API. Built with vanilla JavaScript to keep it lightweight and fast.",
    tech: ["JavaScript", "Chrome APIs", "Gemini API"],
    href: "https://github.com/Luxx12",
  },
  {
    name: "Ping",
    description:
      "Simple TCP chat app built with C++ and Qt. Allows two users to connect and message each other in real-time using the Asio networking library.",
    tech: ["C++", "Qt", "Asio"],
    href: "https://github.com/Luxx12",
  },
];

export default function GabrielPage() {
  return (
    <main className="min-h-screen text-white relative overflow-hidden" 
         style={{
           backgroundColor: '#18181b',
           backgroundImage: `
             linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
             linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
           `,
           backgroundSize: '30px 30px'
         }}>
      
      <div className="mx-auto max-w-3xl px-6 py-16 relative z-10">
        
        <div className="text-center">
          <h1 className="text-5xl font-bold">Gabriel Barreto Otero</h1>
          
          <div className="mt-12 border border-white/20 py-8" style={{ backgroundColor: '#0d1b2a' }}>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
              CS student at UCF. I've been competing in hackathons across various colleges since high school. 
              I build full-stack apps, work on game development projects, and taught game development during high school. 
              I like building stuff and solving problems.
            </p>
          </div>

          <div className="mt-6 flex gap-4 justify-center">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target={l.href.startsWith("/") ? undefined : "_blank"}
                rel={l.href.startsWith("/") ? undefined : "noreferrer"}
                className="text-blue-400 hover:text-blue-300"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Projects</h2>
          
          <div className="space-y-6">
            {projects.map((p) => (
              <div 
                key={p.name} 
                className="border border-white/20 p-6"
                style={{ backgroundColor: '#0d1b2a' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xl font-semibold hover:text-blue-400"
                  >
                    {p.name}
                  </a>
                  {p.award && (
                    <span className="text-sm text-gray-400">
                      {p.award}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-gray-300">{p.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  {p.tech.map((t) => (
                    <span key={t} className="bg-white/10 px-3 py-1 text-gray-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-800 text-gray-400">
          barretgaby12@gmail.com
        </div>
      </div>
    </main>
  );
}
