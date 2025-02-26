"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const Navbar = () => {
  const [showJumpscare, setShowJumpscare] = useState(false);
  const [fade, setFade] = useState(false);
  const [showBegging, setShowBegging] = useState(false);
  const playJakingit = () => {
    const audio = new Audio("/audio/im-jaking-it-made-with-Voicemod.mp3");
    audio.loop = true;
    void audio.play();
  };

  const jumpscare = () => {
    const audio = new Audio("/audio/vine-boom.mp3");
    void audio.play();
    // Show the jumpscare div
    setShowJumpscare(true);
    //Starts fading process
    setFade(false);

    // After 500ms, start fading out
    setTimeout(() => {
      setFade(true);
    }, 500);

    // After 1500ms, remove the jumpscare div from view
    setTimeout(() => {
      setShowJumpscare(false);
    }, 1500);
  };
  // link too long so I put it here
  const contactme = () => {
    window.open(
      "https://www.google.com/maps/dir/28.608511,-81.2158656/1600+Pennsylvania+Avenue+NW,+Washington,+DC+20500/@23.515461,-73.0231338,5z/data=!4m9!4m8!1m1!4e1!1m5!1m1!1s0x89b7b7bcdecbb1df:0x715969d86d0b76bf!2m2!1d-77.0365298!2d38.8976763?entry=ttu&g_ep=EgoyMDI1MDIyNC4wIKXMDSoJLDEwMjExNDUzSAFQAw%3D%3D",
    );
  };
  const beggingshow = () => {
    setShowBegging(true);
  };
  const begginhide = () => {
    setShowBegging(false);
  };

  return (
    <>
      <nav className="flex h-28 items-center justify-evenly rounded-sm bg-gray-800 text-lg">
        <Link href="/arthurteng" onClick={playJakingit}>
          Home
        </Link>
        <span>|</span>
        <Link href="/arthurteng" onClick={jumpscare}>
          About
        </Link>
        <span>|</span>
        <Link href="/arthurteng" onClick={contactme}>
          Contact
        </Link>
        <span>|</span>
        <Link href="https://github.com/Arthur1asdf" target="_blank">
          Github
        </Link>
        <span>|</span>
        <Link
          href="https://www.linkedin.com/in/at8/?trk=opento_sprofile_topcard"
          target="_blank"
        >
          LinkedIn
        </Link>
        <span>|</span>
        <Link href="/images/Arthur_s_Resume.pdf" target="_blank">
          Resume
        </Link>
        <span>|</span>
        <Link
          href="https://my-very-cool-personal-website.vercel.app/"
          target="_blank"
        >
          Website
        </Link>
        <span>|</span>
        <Link href="/arthurteng" onClick={beggingshow}>
          Mercari
        </Link>
      </nav>

      {/* If showJumpscare is true then show the div */}
      {showJumpscare && (
        // fixed and inset-0 makes the div cover the whole screen
        // h-full and w-full does full w and h but its relative for some reason
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-1000 ${
            fade ? "opacity-0" : "opacity-100"
          }`}
        >
          <Image
            src="/images/blue-lobster.jpg"
            alt="something thats cool"
            layout="fill"
            objectFit="fill"
          />
        </div>
      )}
      {showBegging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
          <p>Please buy my anime figures I'm so poor auuuuugggghhhhh</p>
          <Link
            href="https://www.mercari.com/u/huterrat/"
            target="_blank"
            onClick={begginhide}
          >
            My Mecari Link {"<--  "} click here
          </Link>
        </div>
      )}
    </>
  );
};

export default Navbar;
