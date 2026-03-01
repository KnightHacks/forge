"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Award, Github, GlobeIcon, Info, Linkedin } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Separator } from "@forge/ui/separator";

import { ResumeButton } from "./resume-button";

interface MemberForCard {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl: string | null;
  tagline: string | null;
  school: string | null;
  gradDate: string | null;
  about: string | null;
  githubProfileUrl: string | null;
  linkedinProfileUrl: string | null;
  websiteUrl: string | null;
  resumeUrl: string | null;
}

interface GuildMembersDisplayProps {
  members: MemberForCard[];
}

const anchors = [
  { term: "Spring", month: 4, day: 2 },
  { term: "Summer", month: 7, day: 6 },
  { term: "Fall", month: 11, day: 10 },
] as const;

function termInfo(dateIso: string | null) {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();

  let best = {
    term: "Spring" as "Spring" | "Summer" | "Fall",
    anchor: new Date(0),
  };
  let minDiff = Infinity;

  anchors.forEach(({ term, month, day }) => {
    const anchor = new Date(Date.UTC(year, month, day));
    const diff = Math.abs(anchor.getTime() - d.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      best = { term, anchor };
    }
  });

  const isPast = best.anchor.getTime() < Date.now();
  return { term: best.term, year, isPast } as const;
}

function capitalizeFirstLetter(string: string | null | undefined) {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const CARD_ACCENT_GRADIENT = "before:from-violet-600/30 before:to-cyan-500/30";

const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
};

const cardLoadInVariants = {
  hidden: { y: 25, opacity: 0, scale: 0.95 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
  },
};

export function GuildMembersDisplay({ members }: GuildMembersDisplayProps) {
  if (members.length === 0) {
    return (
      <p className="col-span-full p-10 text-center text-slate-500">
        No members found matching your criteria.
      </p>
    );
  }

  return (
    <motion.div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      variants={gridContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {members.map((m, index) => {
        const grad = termInfo(m.gradDate);
        const isAlumni = !!grad?.isPast;
        const initialBorderColor = isAlumni
          ? "rgba(251, 191, 36, 0.4)"
          : "rgba(51, 65, 85, 0.7)";
        const profileSrc =
          m.profilePictureUrl && m.profilePictureUrl.trim().length > 0
            ? m.profilePictureUrl
            : "/placeholder-avatar.png";

        return (
          <motion.div
            key={m.id}
            variants={cardLoadInVariants}
            initial="hidden"
            animate="visible"
            transition={{
              type: "spring",
              stiffness: 80,
              damping: 20,
              delay: Math.random() * 0.5,
            }}
            whileHover={{
              y: -8,
              scale: 1.04,
              borderColor: isAlumni
                ? "rgba(250, 176, 5, 0.7)"
                : "rgba(139, 92, 246, 0.7)",
              boxShadow: isAlumni
                ? "0px 8px 25px rgba(250, 176, 5, 0.3)"
                : "0px 8px 25px rgba(139, 92, 246, 0.25)",
              transition: { type: "spring", stiffness: 300, damping: 15 },
            }}
            style={{
              borderColor: initialBorderColor,
            }}
            className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-slate-900/70 shadow-lg ring-1 backdrop-blur-md before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br before:opacity-60 before:transition-opacity hover:before:opacity-100 ${CARD_ACCENT_GRADIENT} ${
              isAlumni ? "ring-yellow-500/30" : "ring-slate-700/50"
            } min-h-[380px]`}
          >
            <Dialog>
              {isAlumni && (
                <motion.div
                  initial={{ opacity: 0, top: "-20px" }}
                  animate={{ opacity: 1, top: "0.75rem" }}
                  transition={{
                    type: "spring",
                    stiffness: 250,
                    damping: 12,
                    delay: 0.4 + index * 0.02,
                  }}
                  className="absolute right-3 z-10 flex items-center gap-1.5 rounded-full bg-gradient-to-br from-amber-500/40 to-yellow-400/40 px-3 py-1.5 text-xs font-bold text-amber-100 shadow-md backdrop-blur-sm"
                >
                  <Award size={14} className="opacity-90" />
                  ALUMNI
                </motion.div>
              )}

              <div className="flex flex-grow flex-col p-5">
                <div className="flex items-center gap-4">
                  <Image
                    src={profileSrc}
                    alt={`${capitalizeFirstLetter(m.firstName)} ${capitalizeFirstLetter(m.lastName)}'s avatar`}
                    width={80}
                    height={80}
                    className="h-20 w-20 flex-shrink-0 rounded-full object-cover ring-2 ring-slate-700"
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-semibold text-slate-100">
                      {capitalizeFirstLetter(m.firstName)}{" "}
                      {capitalizeFirstLetter(m.lastName)}
                    </h2>
                    {m.tagline && (
                      <p className="line-clamp-2 text-sm text-slate-400">
                        {m.tagline}
                      </p>
                    )}
                  </div>
                </div>

                {(m.school ?? grad ?? m.about) && (
                  <div className="mt-4 flex-grow space-y-1 border-t border-slate-700/70 pt-4 text-sm">
                    {m.school && (
                      <p className="font-medium text-slate-300">{m.school}</p>
                    )}
                    {grad && (
                      <p className="text-slate-400">
                        {isAlumni ? "Graduated:" : "Graduates:"}&nbsp;
                        {grad.term} {grad.year}
                      </p>
                    )}
                    {m.about && (
                      <p className="mt-2 line-clamp-3 text-slate-400/90">
                        {m.about}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-auto">
                  <div className="mt-5 flex flex-nowrap items-center gap-3 border-t border-slate-700/70 pt-4">
                    {m.githubProfileUrl && (
                      <Link
                        href={m.githubProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 transition-colors duration-200 hover:text-violet-400"
                        aria-label={`${capitalizeFirstLetter(m.firstName)}'s Github Profile`}
                      >
                        <Github size={20} />
                      </Link>
                    )}
                    {m.linkedinProfileUrl && (
                      <Link
                        href={m.linkedinProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 transition-colors duration-200 hover:text-violet-400"
                        aria-label={`${capitalizeFirstLetter(m.firstName)}'s LinkedIn Profile`}
                      >
                        <Linkedin size={20} />
                      </Link>
                    )}
                    {m.websiteUrl && (
                      <Link
                        href={m.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 transition-colors duration-200 hover:text-violet-400"
                        aria-label={`${capitalizeFirstLetter(m.firstName)}'s Personal Website`}
                      >
                        <GlobeIcon size={20} />
                      </Link>
                    )}

                    <DialogTrigger asChild>
                      <div
                        className="ml-auto text-slate-500 transition-colors duration-200 hover:text-violet-400"
                        aria-label="Show more info"
                      >
                        <Info size={20} />
                      </div>
                    </DialogTrigger>

                    {m.resumeUrl && (
                      <span>
                        <ResumeButton memberId={m.id} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <DialogContent className="dark border-slate-700 bg-slate-900/95 text-slate-100 backdrop-blur-lg">
                <DialogHeader className="items-center text-center">
                  <Image
                    src={profileSrc}
                    alt={`${capitalizeFirstLetter(m.firstName)} ${capitalizeFirstLetter(
                      m.lastName,
                    )}'s avatar`}
                    width={96}
                    height={96}
                    className="mb-4 h-24 w-24 rounded-full object-cover ring-2 ring-slate-600"
                  />
                  <DialogTitle className="text-2xl">
                    {capitalizeFirstLetter(m.firstName)}{" "}
                    {capitalizeFirstLetter(m.lastName)}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    {m.tagline}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {m.about && (
                    <p className="text-center text-sm text-slate-300">
                      {m.about}
                    </p>
                  )}
                  <Separator className="bg-slate-700" />
                  <div className="text-sm text-slate-400">
                    <p>
                      <span className="font-semibold text-slate-300">
                        School:
                      </span>{" "}
                      {m.school}
                    </p>
                    {grad && (
                      <p>
                        <span className="font-semibold text-slate-300">
                          Status:
                        </span>{" "}
                        {isAlumni ? "Alumni" : "Student"}, {grad.term}{" "}
                        {grad.year}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-4 pt-2">
                    {m.githubProfileUrl && (
                      <Link
                        href={m.githubProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 transition-colors duration-200 hover:text-violet-400"
                      >
                        <Github />
                      </Link>
                    )}
                    {m.linkedinProfileUrl && (
                      <Link
                        href={m.linkedinProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 transition-colors duration-200 hover:text-violet-400"
                      >
                        <Linkedin />
                      </Link>
                    )}
                    {m.websiteUrl && (
                      <Link
                        href={m.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 transition-colors duration-200 hover:text-violet-400"
                      >
                        <GlobeIcon />
                      </Link>
                    )}
                    {m.resumeUrl && <ResumeButton memberId={m.id} />}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
