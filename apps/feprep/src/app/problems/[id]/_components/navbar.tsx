import Link from "next/link";

export function Navbar() {
  return (
    <nav className="flex items-center justify-between px-4 py-2.5">
      <Link href="/problems" className="text-xl font-bold">
        <span>FEPrep</span>
      </Link>
    </nav>
  );
}
