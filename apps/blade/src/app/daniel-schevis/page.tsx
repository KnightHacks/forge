import { 
  Github, 
  Linkedin, 
  Mail, 
  Phone, 
  MapPin, 
  Code, 
  User,
  Briefcase,
  Trophy,
  Terminal,
  Activity,
  Wifi,
  Monitor,
  HardDrive
} from "lucide-react";

export default function DanielSchevisPage() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-repeat opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2300ffff' fill-opacity='0.1'%3E%3Cpath d='M20 20c0 11.046-8.954 20-20 20V0c11.046 0 20 8.954 20 20z'/%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
      </div>
      
      {/* Glitch Lines */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-0 w-full h-0.5 bg-cyan-400 opacity-30 animate-pulse"></div>
        <div className="absolute top-2/3 left-0 w-full h-0.5 bg-pink-500 opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-3/4 left-0 w-full h-0.5 bg-green-400 opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* Header Section */}
          <div className="text-center space-y-6 relative">
            {/* Terminal Window Header */}
            <div className="mx-auto max-w-4xl">
              <div className="bg-gray-900 border border-cyan-400 rounded-t-lg p-3 flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-cyan-400 text-sm font-mono">daniel_schevis@cybernet:~$</div>
              </div>
              
              {/* Main Profile Display */}
              <div className="bg-black border-x border-b border-cyan-400 rounded-b-lg p-8 relative">
                {/* Glitch Effect Avatar */}
                <div className="relative mx-auto w-32 h-32 mb-6">
                  <div className="w-32 h-32 bg-gradient-to-br from-cyan-400 via-pink-500 to-yellow-400 rounded-lg flex items-center justify-center text-black text-4xl font-bold shadow-2xl transform rotate-3">
                    DS
                  </div>
                </div>
                
                {/* Animated Name */}
                <h1 className="text-5xl md:text-7xl font-bold mb-4 relative">
                  <span className="bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 bg-clip-text text-transparent">
                    DANIEL SCHEVIS
                  </span>
                </h1>
                
                {/* Cyberpunk Subtitle */}
                <div className="text-center space-y-2">
                  <p className="text-xl text-cyan-400 font-mono tracking-wide">&gt; CYBERNETIC_DEVELOPER.exe</p>
                  <p className="text-lg text-pink-400 font-mono">[KNIGHT_HACKS_APPLICANT]</p>
                  <div className="flex justify-center items-center space-x-2 text-green-400">
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span className="font-mono text-sm">STATUS: ONLINE</span>
                    <Wifi className="w-4 h-4 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Matrix */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <div className="bg-gray-900 border border-cyan-400 rounded px-4 py-2 flex items-center space-x-2 hover:bg-cyan-400 hover:text-black transition-all duration-300 cursor-pointer group">
                <Mail className="w-4 h-4 group-hover:animate-spin" />
                <span className="font-mono text-sm">daniel.schevis@example.com</span>
              </div>
              <div className="bg-gray-900 border border-pink-400 rounded px-4 py-2 flex items-center space-x-2 hover:bg-pink-400 hover:text-black transition-all duration-300 cursor-pointer group">
                <Phone className="w-4 h-4 group-hover:animate-bounce" />
                <span className="font-mono text-sm">(555) 123-4567</span>
              </div>
              <div className="bg-gray-900 border border-yellow-400 rounded px-4 py-2 flex items-center space-x-2 hover:bg-yellow-400 hover:text-black transition-all duration-300 cursor-pointer group">
                <MapPin className="w-4 h-4 group-hover:animate-pulse" />
                <span className="font-mono text-sm">Orlando, FL</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-6 mt-8">
              <a href="https://github.com/Spyderma9" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold py-3 px-6 rounded-lg transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-cyan-500/50">
                <Github className="w-5 h-5" />
                <span>GITHUB_ACCESS</span>
              </a>
              <button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white font-bold py-3 px-6 rounded-lg transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-pink-500/50">
                <Linkedin className="w-5 h-5" />
                <span>NEURAL_LINK</span>
              </button>
              <a href="/resume-daniel-schevis.pdf" target="_blank" rel="noopener noreferrer" download="Daniel-Schevis-Resume.pdf" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold py-3 px-6 rounded-lg transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-yellow-500/50">
                <User className="w-5 h-5" />
                <span>DATA_FILE</span>
              </a>
            </div>
          </div>

          {/* Neon Separator */}
          <div className="relative">
            <div className="h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
            <div className="absolute inset-0 h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent animate-ping opacity-50"></div>
          </div>

          {/* Main Data Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Panel - Bio Data */}
            <div className="space-y-6">
              
              {/* About Module */}
              <div className="bg-gray-900 border border-cyan-400 rounded-lg p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-400 opacity-10 rounded-full -translate-y-8 translate-x-8"></div>
                <div className="flex items-center space-x-2 mb-4">
                  <User className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-cyan-400 font-mono">BIO_DATA.exe</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  I'm a passionate computer science student at UCF with a strong foundation in 
                  full-stack development. I love building innovative solutions and contributing 
                  to open-source projects.
                </p>
                <div className="space-y-3">
                  <h4 className="font-semibold text-pink-400 font-mono">&gt; INTERESTS:</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-gray-800 border border-cyan-400 text-cyan-400 px-2 py-1 rounded text-xs font-mono">WEB_DEV</span>
                    <span className="bg-gray-800 border border-pink-400 text-pink-400 px-2 py-1 rounded text-xs font-mono">ML_AI</span>
                    <span className="bg-gray-800 border border-yellow-400 text-yellow-400 px-2 py-1 rounded text-xs font-mono">OPEN_SRC</span>
                    <span className="bg-gray-800 border border-green-400 text-green-400 px-2 py-1 rounded text-xs font-mono">HACKATHON</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Center Panel - Skills & Experience */}
            <div className="space-y-6">
              
              {/* Skills Matrix */}
              <div className="bg-gray-900 border border-yellow-400 rounded-lg p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-400 opacity-10 rounded-full -translate-y-8 translate-x-8"></div>
                <div className="flex items-center space-x-2 mb-4">
                  <Code className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-bold text-yellow-400 font-mono">TECH_STACK.json</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 text-cyan-400 font-mono">&gt; LANGUAGES:</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-black border border-cyan-400 text-cyan-400 px-3 py-1 rounded font-mono text-sm">JavaScript</span>
                      <span className="bg-black border border-cyan-400 text-cyan-400 px-3 py-1 rounded font-mono text-sm">TypeScript</span>
                      <span className="bg-black border border-cyan-400 text-cyan-400 px-3 py-1 rounded font-mono text-sm">Python</span>
                      <span className="bg-black border border-cyan-400 text-cyan-400 px-3 py-1 rounded font-mono text-sm">Java</span>
                      <span className="bg-black border border-cyan-400 text-cyan-400 px-3 py-1 rounded font-mono text-sm">C++</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-pink-400 font-mono">&gt; FRAMEWORKS:</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-black border border-pink-400 text-pink-400 px-3 py-1 rounded font-mono text-sm">React</span>
                      <span className="bg-black border border-pink-400 text-pink-400 px-3 py-1 rounded font-mono text-sm">Next.js</span>
                      <span className="bg-black border border-pink-400 text-pink-400 px-3 py-1 rounded font-mono text-sm">Node.js</span>
                      <span className="bg-black border border-pink-400 text-pink-400 px-3 py-1 rounded font-mono text-sm">Express</span>
                      <span className="bg-black border border-pink-400 text-pink-400 px-3 py-1 rounded font-mono text-sm">TailwindCSS</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-green-400 font-mono">&gt; TOOLS:</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-black border border-green-400 text-green-400 px-3 py-1 rounded font-mono text-sm">Git</span>
                      <span className="bg-black border border-green-400 text-green-400 px-3 py-1 rounded font-mono text-sm">Docker</span>
                      <span className="bg-black border border-green-400 text-green-400 px-3 py-1 rounded font-mono text-sm">AWS</span>
                      <span className="bg-black border border-green-400 text-green-400 px-3 py-1 rounded font-mono text-sm">PostgreSQL</span>
                      <span className="bg-black border border-green-400 text-green-400 px-3 py-1 rounded font-mono text-sm">MongoDB</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Experience Timeline */}
              <div className="bg-gray-900 border border-purple-400 rounded-lg p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-400 opacity-10 rounded-full -translate-y-8 translate-x-8"></div>
                <div className="flex items-center space-x-2 mb-4">
                  <Briefcase className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-bold text-purple-400 font-mono">WORK_LOG.sys</h3>
                </div>
                <div className="space-y-4">
                  <div className="border-l-2 border-cyan-400 pl-4 relative">
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-cyan-400 rounded-full animate-pulse"></div>
                    <h4 className="font-semibold text-white">Software Development Intern</h4>
                    <p className="text-sm text-cyan-400 font-mono">TechCorp Solutions</p>
                    <p className="text-xs text-gray-400 font-mono">Summer 2024</p>
                    <p className="text-sm mt-1 text-gray-300">
                      Developed React components and REST APIs, improving user experience 
                      and application performance.
                    </p>
                  </div>
                  <div className="border-l-2 border-pink-400 pl-4 relative">
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    <h4 className="font-semibold text-white">Freelance Web Developer</h4>
                    <p className="text-sm text-pink-400 font-mono">Self-Employed</p>
                    <p className="text-xs text-gray-400 font-mono">2023 - Present</p>
                    <p className="text-sm mt-1 text-gray-300">
                      Built custom websites for local businesses using modern web technologies.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Projects & Achievements */}
            <div className="space-y-6">
              
              {/* Projects Archive */}
              <div className="bg-gray-900 border border-cyan-400 rounded-lg p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-400 opacity-10 rounded-full -translate-y-8 translate-x-8"></div>
                <div className="flex items-center space-x-2 mb-4">
                  <Monitor className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-cyan-400 font-mono">PROJECT_ARCHIVE.zip</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-black border border-gray-600 rounded p-4 hover:border-cyan-400 transition-colors duration-300">
                    <h4 className="font-semibold text-white mb-2">Task Management App</h4>
                    <p className="text-sm text-gray-400 mb-2">
                      Full-stack web application with real-time collaboration features.
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="bg-gray-800 text-cyan-400 px-2 py-1 rounded text-xs font-mono">React</span>
                      <span className="bg-gray-800 text-pink-400 px-2 py-1 rounded text-xs font-mono">Node.js</span>
                      <span className="bg-gray-800 text-yellow-400 px-2 py-1 rounded text-xs font-mono">Socket.io</span>
                    </div>
                    <button className="bg-gray-800 border border-cyan-400 text-cyan-400 px-3 py-1 rounded text-sm hover:bg-cyan-400 hover:text-black transition-colors duration-300 flex items-center space-x-1">
                      <Github className="w-3 h-3" />
                      <span>ACCESS</span>
                    </button>
                  </div>
                  
                  <div className="bg-black border border-gray-600 rounded p-4 hover:border-pink-400 transition-colors duration-300">
                    <h4 className="font-semibold text-white mb-2">AI Study Assistant</h4>
                    <p className="text-sm text-gray-400 mb-2">
                      Machine learning application that helps students optimize study schedules.
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="bg-gray-800 text-cyan-400 px-2 py-1 rounded text-xs font-mono">Python</span>
                      <span className="bg-gray-800 text-pink-400 px-2 py-1 rounded text-xs font-mono">TensorFlow</span>
                      <span className="bg-gray-800 text-yellow-400 px-2 py-1 rounded text-xs font-mono">Flask</span>
                    </div>
                    <button className="bg-gray-800 border border-pink-400 text-pink-400 px-3 py-1 rounded text-sm hover:bg-pink-400 hover:text-black transition-colors duration-300 flex items-center space-x-1">
                      <Github className="w-3 h-3" />
                      <span>ACCESS</span>
                    </button>
                  </div>

                  <div className="bg-black border border-gray-600 rounded p-4 hover:border-yellow-400 transition-colors duration-300">
                    <h4 className="font-semibold text-white mb-2">E-commerce Platform</h4>
                    <p className="text-sm text-gray-400 mb-2">
                      Modern e-commerce solution with payment processing and inventory management.
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="bg-gray-800 text-cyan-400 px-2 py-1 rounded text-xs font-mono">Next.js</span>
                      <span className="bg-gray-800 text-pink-400 px-2 py-1 rounded text-xs font-mono">Stripe</span>
                      <span className="bg-gray-800 text-yellow-400 px-2 py-1 rounded text-xs font-mono">PostgreSQL</span>
                    </div>
                    <button className="bg-gray-800 border border-yellow-400 text-yellow-400 px-3 py-1 rounded text-sm hover:bg-yellow-400 hover:text-black transition-colors duration-300 flex items-center space-x-1">
                      <Github className="w-3 h-3" />
                      <span>ACCESS</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Achievements Database */}
              <div className="bg-gray-900 border border-green-400 rounded-lg p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-green-400 opacity-10 rounded-full -translate-y-8 translate-x-8"></div>
                <div className="flex items-center space-x-2 mb-4">
                  <Trophy className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-bold text-green-400 font-mono">ACHIEVEMENTS.db</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2 bg-black rounded border border-yellow-400">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-mono text-yellow-400">1st Place - UCF Programming Contest 2024</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-black rounded border border-gray-400">
                    <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <span className="text-sm font-mono text-gray-400">2nd Place - HackUCF 2023</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-black rounded border border-green-400">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <span className="text-sm font-mono text-green-400">Open Source Contributor - 50+ commits</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-black rounded border border-blue-400">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                    <span className="text-sm font-mono text-blue-400">Dean's List - Fall 2023, Spring 2024</span>
                  </div>
                </div>
              </div>

              {/* Call to Action Terminal */}
              <div className="bg-gradient-to-r from-cyan-500 via-pink-500 to-yellow-500 p-0.5 rounded-lg">
                <div className="bg-gray-900 rounded-lg p-6 text-center">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <Terminal className="w-6 h-6 text-cyan-400" />
                    <h3 className="text-xl font-bold text-white font-mono">READY_TO_CONNECT</h3>
                  </div>
                  <p className="text-gray-300 mb-4 font-mono text-sm">
                    &gt; System ready for Knight Hacks integration
                  </p>
                  <button className="bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-bold py-3 px-8 rounded-lg transform hover:scale-105 transition-all duration-300 font-mono shadow-lg">
                    INITIATE_CONNECTION
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-8 border-t border-gray-800">
            <p className="text-gray-500 text-sm font-mono">
              © 2025 DANIEL_SCHEVIS.exe | Built with Next.js & TailwindCSS | Cyberpunk Mode: [ACTIVE]
            </p>
            <div className="flex justify-center items-center space-x-2 mt-2">
              <HardDrive className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs text-cyan-400 font-mono">NEURAL_INTERFACE_v2.1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}