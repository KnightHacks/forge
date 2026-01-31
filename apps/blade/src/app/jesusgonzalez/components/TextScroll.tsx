import React from "react";

const TextScroll = () => {
  const scrollText = [
    "Have a wonderful day!",
    "Flamingos are born green.",
    "Bananas are radioactive.",
    "No number before 1,000 contains the letter A.",
    "The Pope can't be an organ donor.",
    "Sudan has more pyramids than any country in the world.",
    "Honey never spoils!",
    "On average you spend 6 years dreaming.",
    "A group of jellyfish is called a smack.",
    "The word for # is actually octothorpe NOT hashtag.",
    "Lightning can happen in volcanoes."
  ];

  return (
    <div className="flex w-64 overflow-clip">
      <div className="animate-marquee flex whitespace-nowrap">
        {scrollText.map((text, index) => (
          <span key={index} className="px-1">
            {text}
          </span>
        ))}
      </div>
      <div className="animate-marquee flex whitespace-nowrap">
        {scrollText.map((text, index) => (
          <span key={index} className="px-1">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
};

export default TextScroll;
