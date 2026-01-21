"use client";

import React from "react";
import Link from "next/link";

import {
  EnvelopeClosedIcon,
  FileTextIcon,
  GitHubLogoIcon,
  InstagramLogoIcon,
  LinkedInLogoIcon,
  ClockIcon,
} from "@forge/ui";
import { Separator } from "@forge/ui/separator";
import { Badge } from "@forge/ui/badge"
import TextScroll from "./TextScroll";

interface SocialLink {
  social: string; // If I want to add it as text
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const Footer = () => {
  const socialLinks: SocialLink[] = [
    {
      social: "Github",
      href: "https://github.com/jesusthecreator017",
      icon: GitHubLogoIcon,
    },
    {
      social: "Linkedin",
      href: "https://www.linkedin.com/in/jesusg107/",
      icon: LinkedInLogoIcon,
    },
    {
      social: "Instagram",
      href: "https://www.instagram.com/jesus.gon16/",
      icon: InstagramLogoIcon,
    },
    {
      social: "Gmail",
      href: "mailto:jesus.r.gonzalez@gmail.com",
      icon: EnvelopeClosedIcon,
    },
  ];

  const currentDate: Date = new Date();

  return (
    <footer className="flex justify-center bg-background p-5">
      <div className="flex max-w-fit items-center justify-between space-x-4 rounded-2xl border bg-card p-5 px-6 py-3">
        {/* Left Side */}
        <p>© Jesus Rey Gonzalez</p>
        <p>-</p>
        <Badge className="flex gap-1" variant='outline' >
          <ClockIcon />
          <p>{currentDate.toLocaleDateString()}</p>
        </Badge>
        <Separator orientation="vertical" />

        {/* Middle */}
        <TextScroll />

        {/* Rights Side */}
        <Separator orientation="vertical" />
        {socialLinks.map((links) => (
          <Link
            key={links.social}
            href={links.href}
            target="_blank"
            rel="noopener nonreferrer"
          >
            <links.icon className="h-6 w-6 hover:scale-110 transition" />
          </Link>
        ))}
        <a href="apps/blade/public/Jesus_Gonzalez_2025_V2.pdf" download>
          <FileTextIcon className="h-6 w-6 hover:scale-110 transition" />
        </a>
      </div>
    </footer>
  );
};

export default Footer;
