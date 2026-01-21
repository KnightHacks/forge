'use client'
import React from 'react';
import { CodeIcon } from '@forge/ui'

const NavBar = () => {
  

  return (
    <nav className='sticky top-0 z-50 p-4 flex items-center justify-center bg-background bg-opacity-30 backdrop-blur-lg rounded-lg'>
      <span className='text-xl font-bold'>
        <CodeIcon className='h-7 w-7' />
      </span>
    </nav>
  );
}

export default NavBar;
