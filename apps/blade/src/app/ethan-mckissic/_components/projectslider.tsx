"use client";

import { useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination } from "swiper/modules";

// styling classes
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

interface Project {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt?: string;
  url?: string;
}

interface Props {
  projects: Project[];
}

export default function ProjectCoverflow({ projects }: Props) {
  const [active, setActive] = useState(0);
  const current = projects[active];

  return (
    <div className="w-full">
      {/* Slider */}
      <Swiper
        effect="coverflow"
        grabCursor
        centeredSlides
        slidesPerView="auto"
        coverflowEffect={{
          rotate: 40,
          stretch: 0,
          depth: 120,
          modifier: 1,
          slideShadows: true,
        }}
        pagination={{ clickable: true }}
        modules={[EffectCoverflow, Pagination]}
        onSlideChange={(swiper) => setActive(swiper.realIndex)}
        className="py-12"
      >
        {projects.map((p, i) => (
          <SwiperSlide
            key={p.title + i}
            className="!w-72 !h-72 md:!w-[28rem] md:!h-[20rem] !rounded-xl !overflow-hidden !bg-transparent"
          >
            <div className="relative w-full h-full rounded-xl overflow-hidden shadow-xl ring-1 ring-white/10">
              <Image
                src={p.imageSrc}
                alt={p.imageAlt ?? p.title}
                fill
                priority={i === 0}
                className="object-cover"
                sizes="(max-width: 900px) 20rem, 30rem"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

    {/* Current project */}
      {current && (
        <div className="mt-6 text-center">
          {current.url ? (
            <a
              href={current.url}
              target="_blank"
              rel="noreferrer"
              className="text-2xl md:text-3xl font-medium text-white tracking-wide italic underline hover:opacity-90 transition"
            >
              {current.title}
            </a>
          ) : (
            <h2 className="text-2xl md:text-3xl font-medium text-white tracking-wide italic">
              {current.title}
            </h2>
          )}

          <p className="mt-3 text-white/90 text-base md:text-lg leading-relaxed max-w-3xl mx-auto">
            {current.description}
          </p>
        </div>
      )}
    </div>
  );
}
