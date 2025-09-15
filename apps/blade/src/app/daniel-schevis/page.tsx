import { 
  Github, 
  Linkedin, 
  Mail, 
  MapPin, 
  User,
  Activity,
  Wifi
} from "lucide-react";

export default function DanielSchevisPage() {
  return (
    <div className="min-h-screen bg-gray-200 dark:bg-gray-900 text-gray-800 dark:text-gray-100 relative overflow-hidden transition-colors duration-500">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-cyan-100 to-teal-100 dark:from-gray-900 dark:via-blue-950 dark:to-pink-950">
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-repeat opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2306b6d4' fill-opacity='0.1'%3E%3Cpath d='M20 20c0 11.046-8.954 20-20 20V0c11.046 0 20 8.954 20 20z'/%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
      </div>
      
      {/* Glitch Lines */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-0 w-full h-0.5 bg-teal-500 dark:bg-cyan-400 opacity-30 animate-pulse"></div>
        <div className="absolute top-2/3 left-0 w-full h-0.5 bg-cyan-600 dark:bg-pink-500 opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-3/4 left-0 w-full h-0.5 bg-emerald-500 dark:bg-green-400 opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* Header Section */}
          <div className="text-center space-y-6 relative">
            {/* Terminal Window Header */}
            <div className="mx-auto max-w-4xl">
              <div className="bg-gray-300/90 dark:bg-gray-800/90 border border-teal-500 dark:border-cyan-400 rounded-t-lg p-3 flex items-center space-x-2 backdrop-blur-sm">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-teal-600 dark:text-cyan-400 text-sm font-mono">daniel_schevis@cybernet:~$</div>
              </div>
              
              {/* Main Profile Display */}
              <div className="bg-gray-200/95 dark:bg-gray-900/95 border-x border-b border-teal-500 dark:border-cyan-400 rounded-b-lg p-8 relative backdrop-blur-sm">
                {/* Glitch Effect Avatar */}
                <div className="relative mx-auto w-32 h-32 mb-6">
                  <div className="w-32 h-32 bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-500 dark:from-cyan-400 dark:via-pink-500 dark:to-green-400 rounded-lg flex items-center justify-center text-white text-4xl font-bold shadow-2xl transform rotate-3">
                    DS
                  </div>
                </div>
                
                {/* Animated Name */}
                <h1 className="text-5xl md:text-7xl font-bold mb-4 relative">
                  <span className="bg-gradient-to-r from-teal-600 via-cyan-600 to-emerald-600 dark:from-cyan-400 dark:via-pink-500 dark:to-green-400 bg-clip-text text-transparent">
                    DANIEL SCHEVIS
                  </span>
                </h1>
                
                {/* Cyberpunk Subtitle */}
                <div className="text-center space-y-2">
                  <p className="text-xl text-teal-600 dark:text-cyan-400 font-mono tracking-wide">&gt; CYBERNETIC_DEVELOPER.exe</p>
                  <p className="text-lg text-cyan-700 dark:text-pink-400 font-mono">[KNIGHT_HACKS_APPLICANT]</p>
                  <div className="flex justify-center items-center space-x-2 text-emerald-600 dark:text-green-400">
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span className="font-mono text-sm">STATUS: ONLINE</span>
                    <Wifi className="w-4 h-4 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Matrix */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <div className="bg-gray-300/80 dark:bg-gray-800/80 border border-teal-500 dark:border-cyan-400 rounded px-4 py-2 flex items-center space-x-2 hover:bg-teal-500 dark:hover:bg-cyan-400 hover:text-white dark:hover:text-black transition-all duration-300 cursor-pointer group backdrop-blur-sm">
                <Mail className="w-4 h-4 group-hover:animate-spin" />
                <span className="font-mono text-sm"> daniel.schevis@gmail.com</span>
              </div>
              <div className="bg-gray-300/80 dark:bg-gray-800/80 border border-emerald-500 dark:border-green-400 rounded px-4 py-2 flex items-center space-x-2 hover:bg-emerald-500 dark:hover:bg-green-400 hover:text-white dark:hover:text-black transition-all duration-300 cursor-pointer group backdrop-blur-sm">
                <MapPin className="w-4 h-4 group-hover:animate-pulse" />
                <span className="font-mono text-sm">Orlando, FL</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-6 mt-8">
              <a href="https://github.com/Spyderma9" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-bold py-3 px-6 rounded-lg transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-teal-500/50">
                <Github className="w-5 h-5" />
                <span>GITHUB_ACCESS</span>
              </a>
              <a href="https://www.linkedin.com/in/daniel-schevis-8434662b3/" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-pink-500 dark:to-purple-500 hover:from-cyan-500 hover:to-blue-500 dark:hover:from-pink-400 dark:hover:to-purple-400 text-white font-bold py-3 px-6 rounded-lg transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-cyan-500/50 dark:shadow-pink-500/50">
                <Linkedin className="w-5 h-5" />
                <span>NEURAL_LINK</span>
              </a>
              <a 
                href="/resume-daniel-schevis.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-green-500 dark:to-emerald-500 hover:from-emerald-400 hover:to-teal-400 dark:hover:from-green-400 dark:hover:to-emerald-400 text-white font-bold py-3 px-6 rounded-lg transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-emerald-500/50 dark:shadow-green-500/50"
              >
                <User className="w-5 h-5" />
                <span>DATA_FILE</span>
              </a>
            </div>
          </div>

          {/* Neon Separator */}
          <div className="relative">
            <div className="h-0.5 bg-gradient-to-r from-transparent via-teal-500 dark:via-cyan-400 to-transparent animate-pulse"></div>
            <div className="absolute inset-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 dark:via-pink-500 to-transparent animate-ping opacity-50"></div>
          </div>
        </div>
      </div>
    </div>
  );
}