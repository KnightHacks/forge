"use client";

import React, { useEffect, useState } from 'react';
import Leaf from './leaf';

const MultiLeaf: React.FC = () => {
  const leafCount = 10; 
  
  const [leafStyles, setLeafStyles] = useState<{ left: string; animationDelay: string }[]>([]);

  const randomizeLeafPositions = () => {
    const newLeafStyles = Array.from({ length: leafCount }).map(() => {
      const windowWidth = window.innerWidth;

      const randomLeft = Math.random() * (windowWidth - 50);

      const randomAnimationDelay = `${Math.random() * 5}s`;

      const opacity = randomAnimationDelay > 0 ? 1 : 0;

      return {
        left: `${randomLeft}px`,
        opacity: opacity,
        animationDelay: randomAnimationDelay,
      };
    });
    setLeafStyles(newLeafStyles);
  };


  useEffect(() => {
    randomizeLeafPositions();

    const interval = setInterval(randomizeLeafPositions, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="MultiLeaf">
        
      {leafStyles.map((style, index) => (
        <Leaf key={index} style={style} />
      ))}
    </div>
  );
};

export default MultiLeaf;
