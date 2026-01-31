import Link from "next/link";
import Image from "next/image";
import { cn } from "@forge/ui";

export default function Page() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 font-mono text-foreground">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-12 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-6 md:max-w-md">


                    <p className="leading-relaxed">
                        Hello! I’m Ralph. I am interested in joining the Dev Team because I would like the opportunity to reinforce my understanding of current skills and most importantly, I want to work on Blade and be surrounded by other like-minded people and learn SWE principles that would not be taught in the classroom.
                        <br />
                        <span className="mt-4 block">Thank you for reading.</span>
                    </p>

                    <nav className="flex flex-wrap gap-4 text-sm font-medium">

                        <a
                            href="https://github.com/GridGxly"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-1 transition-colors hover:text-blue-500"
                        >
                            <span>GitHub</span>
                        </a>
                        <a
                            href="https://www.linkedin.com/in/ralphnoel/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-1 transition-colors hover:text-blue-500"
                        >
                            <span>LinkedIn</span>
                        </a>
                        <a
                            href="/Ralph_Clavens_Love_Noel_Resume_pdf.pdf"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-1 transition-colors hover:text-blue-500"
                        >
                            <span>Resume</span>
                        </a>
                    </nav>
                </div>

                <div className="relative shrink-0 mt-8 md:mt-0">
                    <span className="absolute -top-14 -left-8 z-20 rotate-[-4deg] font-mono text-xl font-bold italic text-white md:-left-16 md:-top-16">
                        This is me!
                    </span>

                    <svg className="absolute -top-10 -left-12 z-10 h-24 w-24 rotate-[0deg] text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 20 Q 50 10, 80 80" />
                        <path d="M80 80 L 65 75" />
                        <path d="M80 80 L 85 60" />
                    </svg>

                    <svg className="absolute -bottom-10 -right-10 z-10 h-24 w-24 rotate-[0deg] text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M90 80 Q 50 90, 20 20" />
                        <path d="M20 20 L 35 25" />
                        <path d="M20 20 L 15 40" />
                    </svg>

                    <svg className="absolute -bottom-10 -left-12 z-10 h-24 w-24 rotate-[0deg] text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 80 Q 50 90, 80 20" />
                        <path d="M80 20 L 65 25" />
                        <path d="M80 20 L 85 40" />
                    </svg>

                    <svg className="absolute -top-10 -right-10 z-10 h-24 w-24 rotate-[0deg] text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M90 20 Q 50 10, 20 80" />
                        <path d="M20 80 L 35 75" />
                        <path d="M20 80 L 15 60" />
                    </svg>


                    <div className="relative aspect-square w-64 md:w-80 overflow-hidden rounded-2xl ring-1 ring-inset ring-foreground/10">
                        <Image
                            src="/headshot.jpeg"
                            alt="Ralph Noel"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
