"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface SponsorCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imgUrl: string;
  sponsor: string;
  index: number;
}

export default function SponsorCard({
  imgUrl,
  sponsor,
  index,
}: SponsorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: "easeOut" }}
      viewport={{ once: true }}
      className="group relative flex h-20 w-32 items-center justify-center transition-transform duration-300 hover:scale-105 md:h-24 md:w-36"
    >
      <span className="pointer-events-none absolute -top-11 left-1/2 z-20 -translate-x-1/2 overflow-hidden rounded-md bg-black px-3 py-1 text-xs font-semibold text-white opacity-0 shadow-xl ring-1 ring-white/10 backdrop-blur-md transition-all duration-300 group-hover:opacity-100">
        <span className="relative z-10">{sponsor}</span>
        <span className="absolute inset-0 translate-x-[-100%] bg-white/10 blur-sm transition-transform duration-500 ease-in-out group-hover:translate-x-[100%]" />
      </span>

      <Image
        src={imgUrl}
        alt={`${sponsor} logo`}
        width={120}
        height={60}
        className="max-h-16 w-auto object-contain transition-all duration-300"
      />
    </motion.div>
  );
}
