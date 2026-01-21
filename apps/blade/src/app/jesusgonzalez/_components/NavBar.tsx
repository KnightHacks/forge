'use client'
import React from 'react';
import { CodeIcon } from '@forge/ui'

const NavBar = () => {  
  return (  
    <nav className='sticky top-0 z-50 p-4 flex items-center justify-center bg-white/0 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-[4.4px]'>
      <span className='text-xl font-bold relative z-10'>
        <CodeIcon className='h-7 w-7 hover:scale-110 transition' />
      </span>
    </nav>
  );
}

export default NavBar;
