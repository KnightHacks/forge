"use client";

import React from "react";
import Link from "next/link";

const Navbar = () => {
  const playJakingit = () => {
    const audio = new Audio("/audio/im-jaking-it-made-with-Voicemod.mp3");
    audio.loop = true;
    void audio.play();
  };
  return (
    <nav className="flex h-28 items-center justify-evenly rounded-sm bg-gray-800 text-lg">
      <Link href="/" onClick={playJakingit}>
        Home
      </Link>
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
