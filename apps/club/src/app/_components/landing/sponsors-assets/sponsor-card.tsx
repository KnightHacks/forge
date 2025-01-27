import React from "react";
import Image from "next/image";

interface SponsorCardProps extends React.HTMLAttributes<HTMLDivElement> {
  fromColor?: string;
  viaColor?: string;
  toColor?: string;
  imgUrl: string;
  sponsor: string;
}

export default function SponsorCard({
  sponsor,
  imgUrl,
  fromColor = "#4158D0",
  viaColor = "#C850C0",
  toColor = "#FFCC70",
}: SponsorCardProps) {
  return (
    <div
      className="hover:shadow-glow group relative overflow-hidden rounded-3xl shadow-lg transition-all duration-300 hover:scale-105"
      style={{
        backgroundImage: `linear-gradient(to right, ${fromColor}, ${viaColor}, ${toColor})`,
        padding: "3px",
      }}
    >
      <div className="relative flex h-44 w-28 flex-col justify-between rounded-[calc(1.5rem-3px)] bg-blue-950 p-4 transition-all duration-300 group-hover:bg-blue-900 md:h-56 md:w-48">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-950/30 to-blue-950/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative z-10 mb-2 text-lg font-bold text-gray-100 transition-colors duration-300 group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-600 group-hover:bg-clip-text group-hover:text-transparent">
          {sponsor}
        </div>

        <div className="relative z-10 flex h-full items-center justify-center">
          <Image
            src={imgUrl}
            alt={`${sponsor} logo`}
            width={120}
            height={120}
            className="max-h-32 w-auto object-contain transition-all duration-300"
          />
        </div>
      </div>
    </div>
  );
}
