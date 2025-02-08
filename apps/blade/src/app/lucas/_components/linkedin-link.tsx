import Link from "next/link";

interface LinkedInLinkProps {
  username: string;
  size?: number;
  color?: string;
}

export default function LinkedInLink({ username, size = 32, color = "text-blue-600" }: LinkedInLinkProps) {
  return (
    <Link
      href={`https://www.linkedin.com/in/${username}`}
      target="_blank"
      aria-label={`Open ${username}'s LinkedIn profile in a new tab`}
      rel="noopener noreferrer"
    >
      <svg
        className={`w-${size} h-${size} ${color} hover:text-blue-800 transition-colors`}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-9h3v9zm-1.5-10.25c-.97 0-1.75-.79-1.75-1.75s.78-1.75 1.75-1.75c.97 0 1.75.79 1.75 1.75s-.78 1.75-1.75 1.75zm13.5 10.25h-3v-5.5c0-1.1-.9-2-2-2s-2 .9-2 2v5.5h-3v-9h3v1.5c.67-.99 2.03-1.5 3-1.5 2.21 0 4 1.79 4 4v5.5z" />
      </svg>
    </Link >
  );
}
