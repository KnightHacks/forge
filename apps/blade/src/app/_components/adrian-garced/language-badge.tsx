import { Badge } from "@forge/ui/badge"
// Import any generic icons from lucide-react if needed, 
// or use custom inline SVGs for specific language logos.
import { Terminal } from "lucide-react"

interface LanguageBadgeProps {
  language: 'TypeScript' | 'JavaScript' | 'Python' | 'Rust' | 'Go' | 'Cpp';
}

export function LanguageBadge({ language }: LanguageBadgeProps) {
  // Define custom Tailwind colors and logos for each programming language
  const config = {
    TypeScript: {
      className: "bg-blue-600/10 text-blue-500 border-blue-500/20 hover:bg-blue-600/20",
      logo: (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 0h24v24H0V0zm22 17.75c0-.68-.16-1.23-.49-1.65-.32-.42-.81-.74-1.47-.96-.65-.22-1.38-.41-2.18-.57-.8-.16-1.5-.35-2.1-.58-.59-.22-1.03-.53-1.32-.93-.29-.4-.43-.91-.43-1.54 0-.64.16-1.18.49-1.61.32-.43.8-.75 1.42-.97C16.55 9.17 17.3 9.06 18.17 9.06c.89 0 1.66.12 2.3.37.64.25 1.14.61 1.48 1.07.35.46.54 1 .57 1.63h-2.52c-.04-.37-.16-.67-.37-.89-.2-.23-.53-.34-.97-.34-.41 0-.73.1-.94.3-.21.2-.31.46-.31.78 0 .27.07.49.21.67.14.17.37.32.69.44.31.11.72.22 1.21.33.5.11 1.02.24 1.56.39a4.8 4.8 0 011.59.67c.43.32.76.74.98 1.27.22.52.33 1.16.33 1.92 0 .74-.16 1.38-.49 1.91-.33.53-.82.94-1.47 1.23-.65.29-1.45.43-2.39.43-.93 0-1.75-.13-2.45-.39-.7-.26-1.24-.65-1.61-1.18-.38-.53-.58-1.18-.62-1.94h2.55c.04.45.2.8.49 1.04.29.24.72.36 1.29.36.43 0 .78-.1 1.03-.31.26-.2.39-.5.39-.88zm-11.23-7.2h-3.3v10.74H4.93V10.55H1.62V9.06h9.15v1.49z"/>
        </svg>
      )
    },
    JavaScript: {
      className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20",
      logo: (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 0h24v24H0V0zm22.034 18.232c-.173-.91-.703-1.63-1.89-2.14-.64-.268-1.42-.45-2.14-.6-.41-.09-.89-.18-1.28-.29-.44-.12-.66-.31-.66-.66 0-.32.25-.56.74-.56.44 0 .76.16.94.53.13.25.17.5.17.98h2.39v-.06c-.02-1.23-.74-2.17-2.03-2.5-1.16-.3-2.5-.13-3.32.7a2.69 2.69 0 00-.77 1.97c0 1.28.71 2.02 2.16 2.45.89.26 1.76.4 2.6.65.43.12.82.32.96.65.2.46.03.95-.53 1.2-.42.18-.94.19-1.38.07-.63-.18-.89-.58-.99-1.18h-2.42c.03 1.63 1.01 2.59 2.59 2.87 1.53.27 3.2-.2 3.84-1.45.38-.73.43-1.59.23-2.42zM12.24 13.43c0-.8-.19-1.39-.73-1.82-.44-.35-1.13-.48-1.84-.48H6.55v9.12h2.39v-3.05h.68c.74 0 1.45-.14 1.89-.54.54-.45.73-1.12.73-2.23zm-2.39.46c0 .48-.2.7-.68.7h-.68v-2.18h.68c.49 0 .68.21.68.7v.78z"/>
        </svg>
      )
    },
    Cpp: {
      className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20",
      logo: (
        <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>C++</title><path d="M22.394 6c-.167-.29-.398-.543-.652-.69L12.926.22c-.509-.294-1.34-.294-1.848 0L2.26 5.31c-.508.293-.923 1.013-.923 1.6v10.18c0 .294.104.62.271.91.167.29.398.543.652.69l8.816 5.09c.508.293 1.34.293 1.848 0l8.816-5.09c.254-.147.485-.4.652-.69.167-.29.27-.616.27-.91V6.91c.003-.294-.1-.62-.268-.91zM12 19.11c-3.92 0-7.109-3.19-7.109-7.11 0-3.92 3.19-7.11 7.11-7.11a7.133 7.133 0 016.156 3.553l-3.076 1.78a3.567 3.567 0 00-3.08-1.78A3.56 3.56 0 008.444 12 3.56 3.56 0 0012 15.555a3.57 3.57 0 003.08-1.778l3.078 1.78A7.135 7.135 0 0112 19.11zm7.11-6.715h-.79v.79h-.79v-.79h-.79v-.79h.79v-.79h.79v.79h.79zm2.962 0h-.79v.79h-.79v-.79h-.79v-.79h.79v-.79h.79v.79h.79z"/></svg>
      )
    },
    Python: {
      className: "bg-teal-600/10 text-teal-500 border-teal-500/20 hover:bg-teal-600/20",
      logo: <Terminal className="h-3 w-3" />
    },
    Rust: {
      className: "bg-orange-600/10 text-orange-500 border-orange-500/20 hover:bg-orange-600/20",
      logo: <Terminal className="h-3 w-3" />
    },
    Go: {
      className: "bg-cyan-600/10 text-cyan-500 border-cyan-500/20 hover:bg-cyan-600/20",
      logo: <Terminal className="h-3 w-3" />
    }
  };

  const current = config[language];

  return (
    <Badge 
      variant="outline" 
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 font-medium rounded-md transition-colors ${current.className}`}
      data-icon="inline-start"
    >
      {current.logo}
      <span>{language}</span>
    </Badge>
  );
}