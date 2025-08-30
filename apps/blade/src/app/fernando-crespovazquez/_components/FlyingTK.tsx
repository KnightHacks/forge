'use client';

import React, { useEffect, useRef } from 'react';

export default function FlyingTK() {
  const carRef = useRef<HTMLDivElement>(null);
  const targetPos = useRef({ x: 0, y: 0 });
  const curPos = useRef({ x: 0, y: 0 }); 

  const setNewRandomTarget = () => {
    const padding = 100; 
    const x = Math.random() * (window.innerWidth - padding * 2) + padding;
    const y = Math.random() * (window.innerHeight - padding * 2) + padding;
    targetPos.current = { x, y };
  };

  useEffect(() => {

    curPos.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    setNewRandomTarget();

    let animationFrameId: number;
    const animate = () => {
      const dx = targetPos.current.x - curPos.current.x;
      const dy = targetPos.current.y - curPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 50) {
        setNewRandomTarget();
      } else {

        const angle = Math.atan2(dy, dx);
        const speed = 1.5; 
        
        curPos.current.x += Math.cos(angle) * speed;
        curPos.current.y += Math.sin(angle) * speed;
        
        const rotation = angle * (180 / Math.PI) + 90;
        if (carRef.current) {
          carRef.current.style.transform = `translate3d(${curPos.current.x}px, ${curPos.current.y}px, 0) rotate(${rotation}deg)`;
        }
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div
      ref={carRef}
      className="fixed w-10 h-10 text-blue-600"
      style={{
        pointerEvents: 'none',
        zIndex: 9999,
        left: -20,
        top: -20,
      }}
    >
        {/* was going to be a f1 car but i couldnt find a clear background one */}
      <img src="/tech-knight.png" alt="tk"/>
    </div>
  );
}