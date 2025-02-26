import React from "react";
import Link from "next/link";

const Navbar = () => {
  return (
    <nav className="flex h-28 items-center justify-evenly rounded-sm bg-gray-800 text-lg">
      <Link href="/">Home</Link>
      <span>|</span>
      <Link href="/about">About</Link>
      <span>|</span>
      <Link href="/contact">Contact</Link>
      <span>|</span>
      <Link href="/github">Github</Link>
      <span>|</span>
      <Link href="/linkedin">LinkedIn</Link>
      <span>|</span>
      <Link href="/resume">Resume</Link>
      <span>|</span>
      <Link href="/website">Website</Link>
      <span>|</span>
      <Link href="/mercari">Mercari</Link>
    </nav>
  );
};

export default Navbar;
