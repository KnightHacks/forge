"use client";

import { useEffect, useState } from "react";

const ShootingStars = () => {
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);
  const [starKey, setStarKey] = useState(0);
  const [animationDelay, setAnimationDelay] = useState(1);

  useEffect(() => {
    const spawnsOnTop = Math.random() < 0.5;

    setPositionX(spawnsOnTop ? Math.random() * 100 : 110);
    setPositionY(spawnsOnTop ? -10 : Math.random() * 100);

    setAnimationDelay(Math.random() * 5 + 1);
  }, [starKey]);

  const dx = window.innerWidth;
  const dy = window.innerHeight;
  const speed = 800;

  const distance = Math.hypot(dx, dy);
  const duration = distance / speed;

  return (
    <div
      key={starKey}
      className={`animate-shoot absolute z-[5] h-[1px] w-3 -rotate-45 rounded-full bg-white`}
      style={
        {
          left: `${positionX}%`,
          top: `${positionY}%`,
          animationDelay: `${animationDelay}s`,
          "--dx": `${dx}px`,
          "--dy": `${dy}px`,
          "--duration": `${duration}s`,
        } as React.CSSProperties
      }
      onAnimationEnd={() => {
        setStarKey((k) => k + 1);
      }}
    ></div>
  );
};

export default ShootingStars;
