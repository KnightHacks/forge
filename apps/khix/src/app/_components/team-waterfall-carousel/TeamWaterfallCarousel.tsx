import { env } from "~/env";
import { TeamWaterfallCarouselClient } from "./TeamWaterfallCarouselClient";

interface TeamWaterfallCarouselProps {
  className?: string;
}

export function TeamWaterfallCarousel({
  className,
}: TeamWaterfallCarouselProps) {
  return (
    <TeamWaterfallCarouselClient
      bladeUrl={env.BLADE_URL}
      className={className}
    />
  );
}
