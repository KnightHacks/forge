'use client'
import React from 'react';



const NavBar = () => {
  

  return (
    <nav className='sticky top-0 z-50 flex items-center justify-between border-b bg-background p-4'>
      {/* Left: Logo */}
      <span className='text-xl font-bold'>JG</span>
      {/* Center: Logo */}
      {/* Right: Logo */}
      <div className='flex items-center gap-4'>
        Rights Side
      </div>
    </nav>
  );
}

export default NavBar;
