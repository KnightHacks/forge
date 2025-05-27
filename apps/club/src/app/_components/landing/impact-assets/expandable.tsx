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
  const isActive = index === activeItem;

  return (
    <div
      className={cn(
        "relative h-40 cursor-pointer overflow-hidden rounded-md transition-all duration-300 ease-in-out md:h-full",
        isActive
          ? "z-10 w-full scale-100 md:w-[720px]"
          : "w-full scale-95 opacity-70 blur-[1px] md:w-32",
        className,
      )}
      style={{ willChange: "transform, width, opacity" }}
      {...props}
    >
      <Image
        src={item.image}
        alt={item.title}
        width={800}
        height={600}
        loading={isActive ? "eager" : "lazy"}
        priority={isActive}
        className="h-full w-full object-cover transition-all duration-300 ease-in-out"
      />
      {isActive && (
        <div className="backdrop-blur-xs absolute bottom-4 left-4 z-10 rounded-xl bg-[#281a37]/80 px-4 py-2 shadow-md md:bottom-6 md:left-6">
          <WaveReveal
            duration="1000ms"
            className="font-pragati text-xl font-bold tracking-tight text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] md:text-4xl"
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
    image: "/workshops2.jpg",
    title: "Workshops",
  },
  {
    image: "/projects1.JPG",
    title: "Projects",
  },
  {
    image: "/workshops.jpg",
    title: "Mentorship",
  },
  {
    image: "/community.png",
    title: "Community",
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
    }, 6000);

    return () => clearInterval(interval);
  }, [autoPlay, list.length, isHovering]);

  return (
    <div
      className={cn(
        "mt-10 flex h-auto w-full flex-col items-center justify-center gap-2 md:h-full md:flex-row",
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