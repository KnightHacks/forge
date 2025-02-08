import Link from "next/link";

interface GitHubLinkProps {
  username: string;
  size?: number;
  color?: string;
}

export default function GitHubLink({ username, size = 32, color = "text-blue-600" }: GitHubLinkProps) {
  return (
    <Link
      href={`https://www.github.com/${username}`}
      target="_blank"
      aria-label={`Open ${username}'s GitHub profile in a new tab`}
      rel="noopener noreferrer"
    >
      <svg
        className={`w-${size} h-${size} ${color} hover:text-gray-600 transition-colors`}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.1.82-.26.82-.58 0-.28-.01-1.03-.02-2.02-3.34.73-4.04-1.61-4.04-1.61-.55-1.4-1.33-1.78-1.33-1.78-1.09-.74.08-.73.08-.73 1.2.08 1.83 1.24 1.83 1.24 1.07 1.84 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.66-.3-5.46-1.33-5.46-5.92 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.54 11.54 0 0 1 3-.4c1.02 0 2.05.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.6-2.8 5.62-5.46 5.92.43.37.82 1.1.82 2.22 0 1.6-.02 2.9-.02 3.3 0 .32.22.68.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
    </Link >
  );
}
