"use client";

import { useState } from "react";

const highlights = [
  {
    name: "Sponsor Name",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    image: null,
  },
  {
    name: "Sponsor Name 2",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    image: null,
  },
  {
    name: "Sponsor Name 3",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    image: null,
  },
];

const Highlight = () => {
  const [current, setCurrent] = useState(0);
  const slide = highlights[current];

  return (
    <section>
      <div>
        {/* Left: sponsor image */}
        <div>
          {slide?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slide.image} alt={slide.name} />
          ) : (
            <div>[SPONSOR IMAGE PLACEHOLDER]</div>
          )}
        </div>

        {/* Right: sponsor info */}
        <div>
          <h2>{slide?.name}</h2>
          <p>{slide?.description}</p>
        </div>
      </div>

      {/* Slide navigation: prev · dots · next */}
      <div>
        <button
          onClick={() =>
            setCurrent((current - 1 + highlights.length) % highlights.length)
          }
          aria-label="Previous slide"
        >
          &lsaquo;
        </button>

        {highlights.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
          >
            {i === current ? "●" : "○"}
          </button>
        ))}

        <button
          onClick={() => setCurrent((current + 1) % highlights.length)}
          aria-label="Next slide"
        >
          &rsaquo;
        </button>
      </div>
    </section>
  );
};

export default Highlight;
