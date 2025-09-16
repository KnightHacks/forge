"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import MatrixRain from "./components/MatrixRain";

interface LanyardData {
  discord_status: "online" | "idle" | "dnd" | "offline";
  avatar?: string;
}

interface LanyardResponse {
  data: LanyardData;
  success: boolean;
}

interface DiscordStatusReturn {
  text: string;
  color: string;
  percentage: number;
  avatar: string | null;
}

const useDiscordStatus = (): DiscordStatusReturn => {
  const [status, setStatus] = useState<LanyardData | null>(null);
  useEffect(() => {
    const fetchStatus = async (): Promise<void> => {
      try {
        const response = await fetch(
          "https://api.lanyard.rest/v1/users/297469573253300224",
        );
        const data = (await response.json()) as LanyardResponse;
        setStatus(data.data);
      } catch {
        setStatus(null);
      }
    };
    void fetchStatus();
    const interval = setInterval(() => {
      void fetchStatus();
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  if (!status)
    return {
      text: "Discord: Offline",
      color: "text-red-400",
      percentage: 25,
      avatar: null,
    };
  const statusColor =
    status.discord_status === "online"
      ? "text-green-400"
      : status.discord_status === "idle"
        ? "text-yellow-400"
        : status.discord_status === "dnd"
          ? "text-red-400"
          : "text-gray-400";
  const percentage =
    status.discord_status === "online"
      ? 95
      : status.discord_status === "idle"
        ? 75
        : status.discord_status === "dnd"
          ? 60
          : 40;
  return {
    text: `Remeruu (${status.discord_status})`,
    color: statusColor,
    percentage,
    avatar: status.avatar || null,
  };
};

interface TerminalCommand {
  command: string;
  output: string | JSX.Element;
  timestamp: string;
}
const InteractiveTerminal: React.FC = () => {
  const [commands, setCommands] = useState<TerminalCommand[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableCommands = {
    help: `Available commands: about, skills, projects, resume, contact, clear, ls, rm -rf /`,
    about: `Hi! I'm Dhruv, an IT student and senior at UCF who likes getting stuck in tutorial hell. I'm obsessed with terminal UIs and currently applying to KnightHacks because I want to gain confidence and experience working with amazing developers!`,
    "rm -rf /":
      " SYSTEM DESTROYED! \n\nJust kidding! Nice try though \nThis is why we don't run random commands as root!",
    "rm -rf":
      '  Missing target directory. Did you mean "rm -rf /" ?\n(Please don\'t actually try that on a real system!)',
    "sudo rm -rf /":
      " CRITICAL ERROR \n\nAccess denied! Even sudo can't save you from my portfolio!\nTrying to delete the entire filesystem, eh? \n\n...Actually, that would be pretty impressive if it worked ",
    skills: `Languages: C, Python, Java, JavaScript, HTML, CSS
Frameworks & Libraries: Next.js, React, Tailwind CSS, TensorFlow, PyTorch, Transformers, PostCSS, Discord.py
Tools & Platforms: Git, GitHub, VS Code, Linux, Windows, Supabase, MySQL, HuggingFace Transformers, WSL2, Docker`,
    projects: (
      <div className="space-y-2">
        <div className="border-l-4 border-green-500 pl-3">
          <h4 className="font-bold text-green-400">Remeruu-AI</h4>
          <p className="text-gray-300">
            Currently developing a modular AI focused on Discord chat and voice
            features.
          </p>
        </div>
        <div className="mt-4 border-l-4 border-green-500 pl-3">
          <h4 className="font-bold text-green-400">Portfolio Website</h4>
          <p className="text-gray-300">
            Personal site (WIP) using Next.js, React, and Tailwind CSS.
            Responsive, mobile-first, and deployed with GitHub Pages.
          </p>
        </div>
        <div className="mt-4 border-l-4 border-green-500 pl-3">
          <h4 className="font-bold text-green-400">Bill’s Equipment Website</h4>
          <p className="text-gray-300">
            Rental business site built for a client in HTML/CSS/JS.{" "}
          </p>
        </div>
      </div>
    ),
    resume: (
      <div>
        <p className="text-green-400">Resume available at:</p>
        <a
          href="https://drive.google.com/file/d/1JalDbrHCP1AHxansU7S88AF6MF8oVahx/view?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          → View Resume
        </a>
      </div>
    ),
    contact: (
      <div>
        <h4 className="font-bold text-green-400">Let's connect!</h4>
        <a
          href="https://github.com/vasubawa"
          className="block text-blue-400 hover:underline"
        >
          → GitHub: @vasubawa
        </a>
        <a
          href="https://linkedin.com/in/DhruvSharma2000"
          className="block text-blue-400 hover:underline"
        >
          → LinkedIn: /in/DhruvSharma2000
        </a>
        <a
          href="mailto:dh664191@ucf.edu"
          className="block text-blue-400 hover:underline"
        >
          → Email: dh664191@ucf.edu
        </a>
      </div>
    ),
    ls: `
drwxr-xr-x  dhruv  staff   projects/
drwxr-xr-x  dhruv  staff   skills/
-rw-r--r--  dhruv  staff   resume.pdf
-rw-r--r--  dhruv  staff   about.txt
-rw-r--r--  dhruv  staff   contact.info`,

    clear: "CLEAR_TERMINAL",
  };

  const addCommand = (command: string, output: string | JSX.Element) => {
    const newCommand: TerminalCommand = {
      command,
      output,
      timestamp: new Date().toLocaleTimeString(),
    };
    setCommands((prev) => [...prev, newCommand]);
  };

  const handleCommand = (input: string) => {
    const cmd = input.toLowerCase().trim();

    if (cmd === "clear") {
      setCommands([]);
      return;
    }

    if (
      cmd === "rm -rf / --no-preserve-root" ||
      cmd === "sudo rm -rf / --no-preserve-root"
    ) {
      setCommands([]);
      addCommand(
        input,
        ' SYSTEM OBLITERATED \n\nCongratulations! You\'ve successfully deleted:\n• All my skills\n• All my projects  \n• My entire existence\n• The concept of employment\n\nType "restore" to undo this catastrophe...',
      );
      return;
    }

    if (cmd === "restore") {
      setCommands([]);
      addCommand(
        "restore",
        " SYSTEM RESTORED \n\nPhew! Everything is back to normal.\nMy application has been recovered from the void.\n\nNote: This restoration was sponsored by Raid Shadow Legends",
      );
      return;
    }

    if (cmd in availableCommands) {
      addCommand(
        input,
        availableCommands[cmd as keyof typeof availableCommands],
      );
    } else if (cmd === "") {
      return;
    } else {
      addCommand(
        input,
        `Command not found: ${input}. Type 'help' for available commands.`,
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim()) {
      handleCommand(currentInput);
      setCurrentInput("");
    }
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commands]);

  useEffect(() => {
    const welcomeMessage = `Welcome to my application!
Type 'help' to see available commands or just start exploring!

Fun fact: I need a job :(`;

    setTimeout(() => {
      const welcomeCommand: TerminalCommand = {
        command: "",
        output: welcomeMessage,
        timestamp: new Date().toLocaleTimeString(),
      };
      setCommands([welcomeCommand]);
    }, 500);
  }, []);

  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div
        className="cursor-text overflow-hidden rounded-lg border-2 border-green-500 bg-gray-900 shadow-2xl"
        onClick={handleTerminalClick}
      >
        <div className="flex items-center gap-2 bg-gray-800 px-4 py-2">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
          </div>
          <div className="flex-1 text-center font-mono text-sm text-gray-300">
            dhruv@knighthacks:~/portfolio
          </div>
        </div>

        <div
          ref={terminalRef}
          className="h-96 overflow-y-auto p-4 font-mono text-sm"
        >
          {commands.map((cmd, index) => (
            <div key={index} className="mb-4">
              {cmd.command && (
                <div className="flex items-center gap-2">
                  <span className="text-green-400">dhruv@knighthacks</span>
                  <span className="text-gray-400">:</span>
                  <span className="text-blue-400">~/portfolio</span>
                  <span className="text-gray-400">$</span>
                  <span className="text-white">{cmd.command}</span>
                </div>
              )}
              <div className="mt-1 whitespace-pre-wrap text-gray-300">
                {cmd.output}
              </div>
            </div>
          ))}

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <span className="text-green-400">dhruv@knighthacks</span>
            <span className="text-gray-400">:</span>
            <span className="text-blue-400">~/portfolio</span>
            <span className="text-gray-400">$</span>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              className="flex-1 bg-transparent text-white caret-green-400 outline-none"
              autoFocus
              spellCheck={false}
            />
            <span className="animate-pulse text-green-400">_</span>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function DhruvSharmaPage() {
  const [showTerminal, setShowTerminal] = useState(false);
  const discordStatus = useDiscordStatus();

  useEffect(() => {
    const timer = setTimeout(() => setShowTerminal(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const generateProgressBar = (percentage: number, status: string) => {
    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;

    const getProgressColor = () => {
      switch (status) {
        case "online":
          return "text-green-400";
        case "idle":
          return "text-yellow-400";
        case "dnd":
          return "text-red-400";
        default:
          return "text-gray-400";
      }
    };

    return {
      filled: "█".repeat(filled),
      empty: "░".repeat(empty),
      color: getProgressColor(),
    };
  };

  const progressBar = generateProgressBar(
    discordStatus.percentage,
    discordStatus.text.includes("online")
      ? "online"
      : discordStatus.text.includes("idle")
        ? "idle"
        : discordStatus.text.includes("dnd")
          ? "dnd"
          : "offline",
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-green-400">
      <MatrixRain />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        <div className="animate-fade-in mb-8 text-center">
          <h1 className="mb-4 font-mono text-4xl font-bold text-green-400 md:text-6xl">
            &gt; DHRUV_SHARMA.EXE
          </h1>
          <div className="mb-2 flex flex-col items-center justify-center">
            <div className="mb-1 flex items-center gap-3">
              <Image
                src="/Remeruu.gif"
                alt="Profile"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full border-2 border-gray-700 bg-gray-900 shadow-md"
                style={{ objectFit: "cover" }}
                priority
                unoptimized
              />
              <span className={`font-mono text-lg ${discordStatus.color}`}>
                Remeruu
              </span>
              <span
                className={`rounded border border-gray-700 px-2 py-1 font-mono text-base ${discordStatus.color}`}
              >
                {discordStatus.text
                  .replace("Remeruu", "")
                  .replace("(", "")
                  .replace(")", "")
                  .replace("Discord:", "")
                  .trim()}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className={progressBar.color}>{progressBar.filled}</span>
            <span className="text-gray-600">{progressBar.empty}</span>
            <span className={`${progressBar.color} animate-pulse font-mono`}>
              {discordStatus.percentage}%
            </span>
          </div>
        </div>
        {showTerminal && (
          <div className="animate-slide-up w-full">
            <InteractiveTerminal />
            <div className="mt-6 text-center font-mono text-sm text-gray-400">
              <p>
                Quick start: Try <span className="text-green-400">'about'</span>
                , <span className="text-green-400">'projects'</span>, or{" "}
                <span className="text-green-400">'contact'</span>
              </p>
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}
