'use client';

import { GitHubLogoIcon, LinkedInLogoIcon, FileIcon } from "@forge/ui";

export default function Page() {

    const projects = [
        {
            title: 'Socket Sense',
            description: 'Real-time hardware sorting system using a CNN and synchronized high level Python ML with low level C++ control logic',
            techStack: ['Python', 'TensorFlow', 'C++', 'Embedded Systems'],
            link: 'https://github.com/GerardGz/SocketSense',
            color: 'from-emerald-600 to-emerald-500'
        },
        {
            title: 'LockedIn',
            description: 'Low latency behavior platform that uses computer vision to detect study distractions',
            techStack: ['Next.js', 'FastAPI', 'Google API', 'WebSockets', 'YOLOv8'],
            link: 'https://github.com/PabloMCodes/LockedIn',
            color: 'from-cyan-600 to-cyan-500'
        },
        {
            title: 'Public Notes',
            description: 'Note sharing platform featuring secure file distribution and role-based access',
            techStack: ['Next.js', 'tRPC', 'AWS S3', 'AWS Lambda'],
            link: 'https://public-notes-six.vercel.app/',
            color: 'from-teal-600 to-teal-500'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
                <div className="text-center mb-16">
                    <h1 className="text-6xl font-bold mb-4 text-white">
                        Fernando Crespo Vazquez
                    </h1>
                    <div className="h-1 w-24 bg-gradient-to-r from-emerald-400 to-cyan-400 mx-auto rounded-full"></div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 mb-12 hover:border-emerald-500/50 transition-all duration-300">
                    <h2 className="text-2xl font-semibold mb-4 text-white">About Me</h2>
                    <p className="text-gray-300 leading-relaxed mb-4">
                        My name is Fernando and I like building out solutions to complex problems. My interests lean heavily into backend development and data systems. I enjoy working in collaborative environments where I can learn and grow alongside like minded individuals.
                    </p>
                    <p className="text-gray-300 leading-relaxed">
                        I would love to join the team and help contribute to software that impacts many people in a helpful way!
                    </p>
                </div>

                <div className="mb-12">
                    <h2 className="text-3xl font-semibold mb-8 text-center">Recent Projects</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {projects.map((project, index) => (
                            <a
                                key={index}
                                href={project.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-slate-500 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-900/50"
                            >
                                <div className={`h-2 w-12 bg-gradient-to-r ${project.color} rounded-full mb-4 group-hover:w-full transition-all duration-300`}></div>
                                <h3 className="text-lg font-semibold mb-3 group-hover:text-emerald-300 transition-colors">
                                    {project.title}
                                </h3>
                                <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                                    {project.description}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {project.techStack.map((tech, i) => (
                                        <span
                                            key={i}
                                            className="text-xs px-3 py-1 bg-slate-700/50 border border-slate-600 rounded-full text-gray-300 group-hover:bg-slate-600 transition-colors"
                                        >
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </a>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                    <a
                        href="https://www.linkedin.com/in/fernando-crespo-vazquez/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 transform hover:scale-105"
                    >
                        <LinkedInLogoIcon />
                        <span>LinkedIn</span>
                    </a>
                    <a
                        href="https://github.com/crespofer"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-cyan-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 transform hover:scale-105"
                    >
                        <GitHubLogoIcon />
                        <span>GitHub</span>
                    </a>
                    <a
                        href="/resumev1.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-600 to-teal-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition-all duration-300 transform hover:scale-105"
                    >
                        <FileIcon />
                        <span>Resume</span>
                    </a>
                </div>

               
            </div>
        </div>
    );
}