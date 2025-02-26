"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface CarouselProps {
  slides: string[]; // Array of image URLs or paths
  autoPlay?: boolean;
  autoPlayInterval?: number; // in milliseconds
}

const Carousel: React.FC<CarouselProps> = ({
  slides,
  autoPlay = true,
  autoPlayInterval = 3000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Function to go to the previous slide
  const previousSlide = () => {
    if (currentIndex === 0) {
      setCurrentIndex(slides.length - 1);
    } else {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Function to go to the next slide
  const nextSlide = () => {
    if (currentIndex === slides.length - 1) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Auto-play: advance slide every autoPlayInterval milliseconds if autoPlay is true
  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      // Update slide based on previous index
      setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, slides.length]);

  return (
    <div className="relative mt-6 h-[300px] w-full overflow-hidden">
      {/* Slides container */}
      <div
        className="flex transition-transform duration-500"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div key={index} className="relative h-[300px] min-w-full">
            <Image
              src={slide}
              alt={`Slide ${index}`}
              layout="fill"
              objectFit="cover"
            />
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      <button
        onClick={previousSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded bg-gray-800 p-2 text-white"
      >
        Prev
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded bg-gray-800 p-2 text-white"
      >
        Next
      </button>
    </div>
  );
};

export default Carousel;
