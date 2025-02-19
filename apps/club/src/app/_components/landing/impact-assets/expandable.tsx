import type { HTMLAttributes } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";

import { cn } from "@forge/ui";

import WaveReveal from "./wave-reveal";

interface ImageProps extends HTMLAttributes<HTMLDivElement> {
  item: { image: string; title: string };
  index: number;
  activeItem: number;
}

interface ExpandableProps {
  list?: { image: string; title: string }[];
  autoPlay?: boolean;
  className?: string;
}

const List = ({ item, className, index, activeItem, ...props }: ImageProps) => {
  return (
    <div
      className={cn(
        "relative flex h-40 w-full cursor-pointer overflow-hidden rounded-md transition-all delay-0 duration-300 ease-in-out md:h-full md:w-20",
        {
          "flex-grow": index === activeItem,
        },
        className,
      )}
      {...props}
    >
      <Image
        src={item.image}
        alt={item.title}
        height={0}
        width={0}
        className={cn("h-full w-full object-cover", {
          "blur-[2px]": index !== activeItem,
        })}
      />
      {index === activeItem && (
        <div className="absolute bottom-2 left-2 rounded-lg bg-gradient-to-r from-purple-900 to-[#0F172A] py-1 text-xs sm:bottom-4 sm:left-4 md:h-auto md:text-lg">
          <WaveReveal
            duration="1000ms"
            className="font-pragati bg-clip-text text-[20px] font-bold leading-tight md:mb-2 md:items-start md:justify-start md:text-center md:text-[60px] text-white"
            text={item.title}
            direction="up"
          />
        </div>
      )}
    </div>
  );
};

const items = [
  {
    image: "/hackathon.JPG",
    title: "Hackathons",
  },
  {
    image: "/jeff.png",
    title: "Workshops",
  },
  {
    image: "/members.JPG",
    title: "Leadership",
  },
];

export default function Expandable({
  list = items,
  autoPlay = true,
  className,
}: ExpandableProps) {
  const [activeItem, setActiveItem] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!autoPlay) {
      return;
    }

    const interval = setInterval(() => {
      if (!isHovering) {
        setActiveItem((prev) => (prev + 1) % list.length);
      }
    }, 6000); // Slower autoplay for better mobile UX

    return () => clearInterval(interval);
  }, [autoPlay, list.length, isHovering]);

  return (
    <div
      className={cn(
        "flex h-auto w-full flex-col items-center gap-2 md:h-full md:flex-row",
        className,
      )}
    >
      {list.map((item, index) => (
        <List
          key={item.title}
          item={item}
          index={index}
          activeItem={activeItem}
          onMouseEnter={() => {
            setActiveItem(index);
            setIsHovering(true);
          }}
          onMouseLeave={() => {
            setIsHovering(false);
          }}
        />
      ))}
    </div>
  );
}
