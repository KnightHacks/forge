import { Mail, Phone, MapPin, Github, AlertTriangle } from "lucide-react";

const CONTACT_INFO = {
  name: "DEANDRE BAILEY",
  title: "Computer Science Student",
  email: "deandrebailey.isaiah@gmail.com",
  phone: "561-497-5405",
  location: "Orlando, Florida",
  github: "github.com/SquidDre",
  githubUrl: "https://github.com/SquidDre",
};



const SKILLS = {
  "Programming Languages": ["Python", "Java", "C", "JavaScript", "TypeScript", "SQL", "HTML/CSS"],
  "Frameworks & Tools": ["React", "Next.js", "React Native", "Node.js", "MongoDB", "PostgreSQL", "Prisma", "TailwindCSS", "Git"],
  "Machine Learning & Data": ["Scikit-learn", "NumPy", "Pandas", "UMAP", "PCA", "FAISS", "Sentence Transformers"],
};

const EXPERIENCE = [
  {
    title: "Office Assistant",
    company: "University of Central Florida",
    location: "Orlando, FL",
    period: "Feb. 2025 – Present",
    description: [
      "Support daily operations, scheduling, document management, and student assistance",
      "Assist 20+ students and faculty, improving office efficiency",
    ],
  },
  {
    title: "Technology Assistant",
    company: "BPCS (Cooper City Elementary School)",
    location: "Cooper City, FL",
    period: "Jun. 2023 – Jul. 2024",
    description: [
      "Maintained 50+ laptops and desktops weekly for classroom readiness",
      "Designed digital displays and managed tech inventory for improved accessibility",
    ],
  },
];

const EDUCATION = [
  {
    degree: "Bachelor of Science in Computer Science",
    school: "University of Central Florida, Burnett Honors College",
    period: "Expected Graduation 2028",
    coursework: [
      "Object-Oriented Programming",
      "Data Structures & Algorithms",
      "Calculus I & II",
      "Discrete Structures",
    ],
  },
];

const PROJECTS = [
  {
    name: "Animore+",
    period: "Aug. 2025 – Present",
    status: "ACTIVE",
    description:
      "ANN-based recommendation system leveraging Sentence Transformers to generate semantic vector embeddings from anime text data with interactive 2D visualization.",
    technologies: ["Python", "Next.js", "React Native", "MongoDB Vector Search", "FAISS", "Scikit-learn", "UMAP"],
    highlights: [
      "Engineered ANN-based recommendation system with Sentence Transformers for semantic embeddings",
      "Implemented high-performance vector retrieval using MongoDB Vector Search and FAISS index",
      "Applied UMAP and PCA to reduce 384-dimensional embeddings to 2D for interactive visualization",
    ],
  },
  {
    name: "DAVe Card",
    period: "Oct. 2025",
    status: "COMPLETED",
    description:
      "Social contact management app with CardDAV backend for real-time multi-client synchronization and OAuth integration.",
    technologies: ["Next.js", "TypeScript", "TailwindCSS", "PostgreSQL", "Prisma", "NextAuth"],
    highlights: [
      "Developed social contact management app with CardDAV backend for real-time synchronization",
      "Designed modern UI and OAuth login (Google, Discord, GitHub) with PostgreSQL via Prisma ORM",
      "Engineered RFC 6352-compliant backend endpoints with optimized caching",
    ],
  },
  {
    name: "Linear Regression App",
    period: "Sep. 2024 – Oct. 2024",
    status: "COMPLETED",
    description:
      "Interactive application predicting student performance using linear regression and gradient descent with real-time visualization.",
    technologies: ["Python", "Pandas", "NumPy", "Scikit-learn", "Matplotlib"],
    highlights: [
      "Built interactive app predicting student performance using linear regression and gradient descent",
      "Leveraged NumPy for matrix operations and Matplotlib for real-time visualization",
    ],
  },
];

const INVOLVEMENT = [
  {
    organization: "Knight Hacks",
    role: "Member",
    period: "Aug. 2024 – Present",
    description: [
      'Led a 4-member team at KnightHacks VII to build "Right Meow," a cat-matching application',
      "Contributed to hackathon planning, project challenges, and prototype presentations",
    ],
  },
];

export default function Resume() {
  return (
    <main className="min-h-screen" style={{
        // Starts black, begins transitioning at 75%, ends pure white at 100%
        background: 'linear-gradient(to bottom, #0a0a0a 0%, #0a0a0a 65%, #ffffff 100%)'
      }}>
      {/* Scanlines overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-10">
        <div className="h-full w-full"style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px)'
        }} />
      </div>


      <div className="container mx-auto px-4 py-16 md:px-6">
        <Header />
        <Education />
        <Projects />
        <Experience />
        <Skills />
        <Footer />
        <div className="h-64" />
        <DeAndre />
      </div>


    </main>


    
  );
}

function Header() {
  return (
    <div className="relative">
      {/* Warning stripes */}
      <div className="absolute -left-4 top-0 h-full w-2 bg-gradient-to-b from-yellow-400 via-black to-yellow-400 opacity-80" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, #fbbf24 0px, #fbbf24 10px, #000 10px, #000 20px)'
      }} />

      <div className="absolute -right-4 top-0 h-full w-2 bg-gradient-to-b from-yellow-400 via-black to-yellow-400 opacity-80" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, #fbbf24 0px, #fbbf24 10px, #000 10px, #000 20px)'
      }} />
      
      <div className="text-center backdrop-blur-sm" style={{
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)'
      }}>
        {/* System text */}
        <div className="mb-4 font-arial text-xs tracking-widest text-green-400">
          [SYSTEM ONLINE] :: PERSONNEL FILE ACCESS GRANTED
        </div>
        
        <h1 className="font-mono text-xl font-bold tracking-tight text-purple-400 md:text-7xl" style={{
        fontFamily: '"Times New Roman", Times, serif',
        fontWeight: 'bold',
        transform: 'scaleX(0.8)', // 70% width - more condensed
        // Keep text aligned properly
        }}>
          {CONTACT_INFO.name}
        </h1>

        {/* Contact grid */}
        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-2 font-arial text-sm sm:grid-cols-2">
          <a href={`mailto:${CONTACT_INFO.email}`} className="flex items-center justify-center gap-2 border border-purple-500/50 bg-black/30 p-2 text-purple-300 transition-all hover:border-purple-400 hover:bg-purple-950/30">
            <Mail className="h-4 w-4" />
            <span>{CONTACT_INFO.email}</span>
          </a>
          <a href={`tel:${CONTACT_INFO.phone}`} className="flex items-center justify-center gap-2 border border-purple-500/50 bg-black/30 p-2 text-purple-300 transition-all hover:border-purple-400 hover:bg-purple-950/30">
            <Phone className="h-4 w-4" />
            <span>{CONTACT_INFO.phone}</span>
          </a>
          <div className="flex items-center justify-center gap-2 border border-purple-500/50 bg-black/30 p-2 text-purple-300">
            <MapPin className="h-4 w-4" />
            <span>{CONTACT_INFO.location}</span>
          </div>
          <a href={CONTACT_INFO.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 border border-purple-500/50 bg-black/30 p-2 text-purple-300 transition-all hover:border-purple-400 hover:bg-purple-950/30">
            <Github className="h-4 w-4" />
            <span>{CONTACT_INFO.github}</span>
          </a>
        </div>
      </div>
    </div>
  );
}


function Education() {
  return (
    <div className="mt-16">
      <SectionHeader title="Education Records" />
      <div className="mx-auto max-w-4xl space-y-6">
        {EDUCATION.map((edu) => (
          <div key={edu.degree} className="border-l-4 border-purple-500 bg-gradient-to-r from-purple-950/50 to-black/50 p-6 backdrop-blur-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-arial text-xl font-bold text-purple-400" 
                style={{
        fontFamily: '"Times New Roman", Times, serif',
        fontWeight: 'bold',
        }}>{edu.degree}</h3>
                <p className="font-arial text-green-400 " >
                  {edu.school}
                </p>
              </div>
              <span className="border border-green-400 bg-black/50 px-3 py-1 font-arial text-sm text-green-400">
                {edu.period}
              </span>
            </div>
            <div className="mt-4">
              <p className="font-arial; text-xs uppercase tracking-wider text-purple-300/70">Relevant Coursework:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {edu.coursework.map((course) => (
                  <span
                    key={course}
                    className="border border-purple-500/50 bg-black/30 px-3 py-1 font-arial text-xs text-purple-300"
                  >
                    {course}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Projects() {
  return (
    <div className="mt-16">
      <SectionHeader title="Project Archives" />
      <div className="mx-auto max-w-4xl space-y-6">
        {PROJECTS.map((project) => (
          <div key={project.name} className="relative border-2 border-purple-500 bg-gradient-to-br from-purple-950/30 via-black/50 to-green-950/30 p-6 backdrop-blur-sm">
            {/* Status indicator */}
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <div className={`h-2 w-2 animate-pulse rounded-full ${
                project.status === 'ACTIVE' ? 'bg-green-400' : 'bg-purple-400'
              }`} />
              <span className={`font-arial text-xs font-bold ${
                project.status === 'ACTIVE' ? 'text-green-400' : 'text-purple-400'
              }`}>
                [{project.status}]
              </span>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-2 pr-32">
              <h3 className="font-arial text-lg font-bold text-purple-400">
                &gt;&gt; {project.name}
              </h3>
              <span className="border border-green-400 bg-black/50 px-2 py-1 font-arial text-xs text-green-400">
                {project.period}
              </span>
            </div>
            
            <p className="mt-3 border-l-2 border-green-400/50 pl-4 font-arial text-sm text-purple-200/80">
              {project.description}
            </p>

            <div className="mt-4 space-y-2">
              {project.highlights.map((highlight, i) => (
                <div key={i} className="flex gap-3 font-arial text-sm text-green-300/90">
                  <span className="text-purple-400">▸</span>
                  <span>{highlight}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="border border-green-500/50 bg-black/50 px-2 py-1 font-arial text-xs text-green-400"
                >
                  {tech}
                </span>
              ))}
            </div>

            {/* Corner decorations */}
            <div className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-purple-500" />
            <div className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-purple-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Experience() {
  return (
    <div className="mt-16">
      <SectionHeader title="Employment History" />
      <div className="mx-auto max-w-4xl space-y-6">
        {EXPERIENCE.map((job) => (
          <div key={job.title + job.company} className="border-l-4 border-green-500 bg-gradient-to-r from-green-950/50 to-black/50 p-6 backdrop-blur-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-arial text-lg font-semibold text-green-400">{job.title}</h3>
                <p className="font-arial text-purple-400">
                  {job.company}
                </p>
                <p className="font-arial text-sm text-purple-300/70">{job.location}</p>
              </div>
              <span className="border border-purple-400 bg-black/50 px-3 py-1 font-arial text-sm text-purple-400">
                {job.period}
              </span>
            </div>
            <ul className="mt-4 space-y-2">
              {job.description.map((item, i) => (
                <li key={i} className="flex gap-3 font-arial text-sm text-green-300/90">
                  <span className="text-purple-400">▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Skills() {
  return (
    <div className="mt-16">
      <SectionHeader title="Technical Specifications" />
      <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
        {Object.entries(SKILLS).map(([category, skills]) => (
          <div key={category} className="border-2 border-green-500 bg-black/80 p-6 backdrop-blur-sm">
            <h3 className="mb-4 border-b border-green-500/50 pb-2 font-arial text-sm font-bold uppercase tracking-wider text-green-400">
              {category}
            </h3>
            <div className="space-y-2">
              {skills.map((skill) => (
                <div
                  key={skill}
                  className="border-l-2 border-purple-500/50 bg-purple-950/20 px-3 py-2 font-arial text-xs text-purple-300"
                >
                  &gt; {skill}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div className="relative mx-auto mt-16 max-w-2xl">
      {/* Warning box */}
      <div className="border-4 border-yellow-400 bg-gradient-to-br from-yellow-950/50 to-black/80 p-8 text-center backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-center gap-2">
          <AlertTriangle className="h-6 w-6 animate-pulse text-yellow-400" />
          <span className="font-arial text-xs font-bold uppercase tracking-widest text-yellow-400">
            Communication Channel Open
          </span>
          <AlertTriangle className="h-6 w-6 animate-pulse text-yellow-400" />
        </div>
        
        <h2 className="font-arial text-2xl font-bold tracking-tight text-purple-400">
          ESTABLISH CONNECTION?
        </h2>
        <p className="mt-3 font-arial text-sm text-green-300">
          Actively seeking internship and full-time opportunities in software engineering.
          <br />
          Transmission frequency ready for synchronization.
        </p>
        
        <a href={`mailto:${CONTACT_INFO.email}`}>
          <button className="mt-6 inline-flex items-center border-2 border-green-400 bg-black px-6 py-3 font-arial text-lg font-bold text-green-400 transition-all hover:bg-green-400 hover:text-black">
            <Mail className="mr-2 h-5 w-5" />
            [INITIATE CONTACT]
          </button>
        </a>

        {/* Corner decorations */}
        <div className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-yellow-400" />
        <div className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-yellow-400" />
        <div className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-yellow-400" />
        <div className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-yellow-400" />
      </div>

      {/* Bottom system text */}
      <div className="mt-4 text-center font-arial text-xs tracking-widest text-green-400/50">
        [END OF PERSONNEL FILE] :: NERV SYSTEMS v2.0.26
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="relative mb-6">
      <div className="flex items-center justify-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500 to-purple-500" />
        <h2 className="border-2 border-purple-500 bg-black px-6 py-2 text-center font-mono text-xl font-bold uppercase tracking-widest text-purple-400" 
        style={{
        fontFamily: '"Times New Roman", Times, serif',
        fontWeight: 'bold',
        transform: 'scaleX(0.7)',
        }}>

          {title}
        </h2>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-purple-500 to-purple-500" />
      </div>
      <div className="mt-1 h-px bg-gradient-to-r from-green-500 via-purple-500 to-green-500 opacity-30" />
    </div>
  );
}

function DeAndre() {
  return (
    <div className="relative">
      
      <div className="text-center backdrop-blur-sm" style={{
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)'
      }}>
        {/* System text */}
        <div className="mb-4 font-arial text-xs tracking-widest text-blue-400">
          [SYSTEM ONLINE] :: WHO AM I? ACCESS GRANTED
        </div>
        
        <h1 className="font-mono text-xl font-bold tracking-tight text-red-700 md:text-7xl mb-8" style={{
        fontFamily: '"Times New Roman", Times, serif',
        fontWeight: 'bold',
        transform: 'scaleX(0.8)',
        }}>
          WHO IS DEANDRE BAILEY?
        </h1>

        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3 mb-12">
          <div className="border-2 border-red-500 bg-black/80 p-6 backdrop-blur-sm">
            <h3 className="mb-4 border-b border-red-500/50 pb-2 font-arial text-sm font-bold uppercase tracking-wider text-red-400">
              FAVORITE SHOW
            </h3>
            <img 
              src="/neon.gif" 
              alt="Neon Genesis Evangelion" 
              className="mx-auto mb-4 h-40 w-auto object-contain rounded"
            />
            <div className="border-l-2 border-red-500/50 bg-red-950/20 px-3 py-2 font-arial text-xs text-red-300">
              Neon Genesis Evangelion. As you can tell from the styling, it's heavily styled that way. I actually didn't like this show when I first watched it, but after multiple viewings I have come to appreciate the crazy amount of philosophical and psychological themes it references. My favorite character is Shinji and my friend got me a Rei Plush very recently.
            </div>
          </div>
      
          <div className="border-2 border-red-500 bg-black/80 p-6 backdrop-blur-sm">
            <h3 className="mb-4 border-b border-red-500/50 pb-2 font-arial text-sm font-bold uppercase tracking-wider text-red-400">
              FAVORITE GAME
            </h3>
            <img 
              src="/valorant.png" 
              alt="Valorant" 
              className="mx-auto mb-4 h-40 w-auto object-contain rounded"
            />
            <div className="border-l-2 border-red-500/50 bg-red-950/20 px-3 py-2 font-arial text-xs text-red-300">
              Valorant. Honestly I would NOT say this is my favorite game right now but it is sadly the game I have played the most consistently over the past 2 years. I mostly play ARC Raiders now but I could never give up Valorant. My main is Clove now but I used to play mainly Viper.
            </div>
          </div>
      
          <div className="border-2 border-red-500 bg-black/80 p-6 backdrop-blur-sm">
            <h3 className="mb-4 border-b border-red-500/50 pb-2 font-arial text-sm font-bold uppercase tracking-wider text-red-400">
              FAVORITE COLOR
            </h3>
            <div className="mx-auto mb-4 h-40 w-full bg-gradient-to-br from-black via-gray-900 to-black rounded flex items-center justify-center">
              <span className="font-arial text-6xl font-bold text-white">BLACK</span>
            </div>
            <div className="border-l-2 border-red-500/50 bg-red-950/20 px-3 py-2 font-arial text-xs text-red-300">
              Black. Yes it's a color, leave me alone.
            </div>
          </div>
        </div>

        {/* Dev Team Motivation Section */}
        <div className="mx-auto max-w-4xl mb-12">
          <div className="border-2 border-blue-500 bg-gradient-to-br from-blue-950/30 to-black/80 p-8 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
              <h3 className="font-arial text-lg font-bold uppercase tracking-wider text-blue-400">
                WHY DEV TEAM?
              </h3>
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
            </div>
            
            <div className="space-y-4 font-arial text-sm text-blue-200/90 leading-relaxed">
              <p>
                I want to join the Dev Team because I want to help create tools and apps for the members of the club to use. When I first heard that the club created and is continuing to develop Blade, I thought it would be cool to code an application that makes doing what the club needs easier by doing the thing that the club does all year round. Code!
              </p>
              <p>
                However, just observing is not enough; I want to keep making the app flourish. Witnessing the improvement of the app when used in Hackathons and new features made me want to get involved. In addition, I want to see what the next amazing tools we can make are, not limited to just Blade, but more amazing tools that will get the next generation of Hack members to take the club and its tools to the next level.
              </p>
            </div>

            {/* Corner decorations */}
            <div className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-blue-500" />
            <div className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-blue-500" />
          </div>
        </div>

        {/* Coolest Project Section */}
        <div className="mx-auto max-w-4xl mb-12">
          <div className="border-2 border-red-500 bg-gradient-to-br from-cyan-950/30 to-black/80 p-8 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
              <h3 className="font-arial text-lg font-bold uppercase tracking-wider text-red-400">
                COOLEST PROJECT: ANIMORE
              </h3>
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            </div>
            
            <div className="space-y-4 font-arial text-sm text-red-200/90 leading-relaxed">
              <p>
                One of the coolest projects I worked on was an anime recommendation system using machine learning I call Animore. I built a neural network-based recommender system that suggests anime based on similarity patterns and user preferences. I focused mainly on the ML side: data processing, feature representation, and model evaluation.
              </p>
              <p>
                In addition to this, I wanted to use a unique way of showing these recommendations, so I used UMAP to map anime to an interactive map for users to navigate for recommendations based on their proximity to other anime. This was also my first time working with MongoDB and Vectors.
              </p>
              <p>
                This project taught me how to work with real data and design ML pipelines to create a project with a personal interest, which I thoroughly enjoyed.
              </p>
            </div>

            {/* Corner decorations */}
            <div className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-cyan-500" />
            <div className="absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-cyan-500" />
          </div>
        </div>

        {/* Final Message */}
        <div className="mx-auto max-w-2xl">
          <div className="border-2 border-red-500 bg-gradient-to-br from-red-950/30 to-black/80 p-6 text-center backdrop-blur-sm">
            <p className="font-arial text-sm text-red-300">
              Thanks for getting to know me a little better.
              <br />
              Let's build something amazing together.
            </p>
            
            {/* Corner decorations */}
            <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-red-500" />
            <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-red-500" />
            <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-red-500" />
            <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-red-500" />
          </div>
        </div>
      </div>
    </div>
  );
}