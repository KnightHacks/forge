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
      <Link href="/arthurteng" onClick={playJakingit}>
        Home
      </Link>
      <span>|</span>
      <Link href="/arthurteng">About</Link>
      <span>|</span>
      <Link href="/arthurteng">Contact</Link>
      <span>|</span>
      <Link href="/arthurteng">Github</Link>
      <span>|</span>
      <Link href="/arthurteng">LinkedIn</Link>
      <span>|</span>
      <Link href="/arthurteng">Resume</Link>
      <span>|</span>
      <Link href="/arthurteng">Website</Link>
      <span>|</span>
      <Link href="/arthurteng">Mercari</Link>
    </nav>
  );
};

export default Navbar;
