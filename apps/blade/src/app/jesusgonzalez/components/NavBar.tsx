'use client'
import React from 'react';
import { CodeIcon } from '@forge/ui'
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@forge/ui/tooltip"

const NavBar = () => {  
  return (  
    <nav className='sticky top-0 z-50 p-4 flex items-center justify-center bg-white/0 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-[4.4px]'>
      <span className='text-xl font-bold relative z-10'>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <CodeIcon className='h-6 w-6 hover:scale-110 transition' />
            </TooltipTrigger>
            <TooltipContent>
              <p>I Do Nothing :D</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </span>
    </nav>
  );
}

export default NavBar;
