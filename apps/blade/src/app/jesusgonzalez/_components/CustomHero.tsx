import Image from 'next/image';
import React from 'react';

const CustomHero = () => {
  return (
    <section className='flex flex-row items-center gap-12 max-w-5xl mx-auto px-8 py-24'>
      <div className='flex flex-col'>
        <h1 className='text-4xl font-bold font-mono md:text-5xl whitespace-nowrap'>
          Hey! I'm
          <span className='text-4xl font-bold md:text-5xl text-violet-400 underline decoration-dashed pl-6'>
            Jesus Gonzalez
          </span>
        </h1>
        <p className='italic text-gray-400 mt-4 max-w-2xl text-xl'>
          I'm a sophomore at UCF studying to become a Full Stack Developer, but my curiosity runs deeper into low-level programming, game
          engines, and visual systems. I've built a physics engine in C, pathfinding tools, and an issue tracker. My homelab keeps me
          grounded in IT fundamentals, and I'm always looking for people to build with.
        </p>
      </div>
      <Image 
        src='/JesusGonzalezHeadshot.jpg'
        alt='Jesus Gonzalez'
        width={256}
        height={256}
        className='w-64 h-64 rounded-2xl object-cover flex-shrink-0'
      />
    </section>
  );
}

export default CustomHero;
