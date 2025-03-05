"use client";
import Image from "next/image";


export default function Page()
{
    return (
      
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6"
      style={{ backgroundImage: "url('/clouds.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>

        <Image src="/catSpin.gif" alt="Left GIF" className="absolute left-10 top-1/2 transform -translate-y-1/2 w-24 h-auto" width={96} height={96}/>

       <Image src="/catSpin.gif" alt="Right GIF" className="absolute right-10 top-1/2 transform -translate-y-1/2 w-24 h-auto" width={96} height={96} />

        <div className="bg-gray-800 bg-opacity-90 p-6 rounded-lg shadow-lg min-w-[24rem] max-w-2xl w-full text-center border-blue-500 mt-8">
        <h3 className="text-2xl font-bold text-blue-400">About Me</h3>
        <p className="mt-2 text-gray-300 text-md">
          I’m a passionate developer with a love for learning and building new things! 
          I'd like to say I've been pretty active in the club since Fall 2024 participating in events such as KightHacks 2024. 
          I was also a mentee in the mentorship progamm. I try to go to most of the events nowadays. I'm also participating in project launch and trying my best to make an end product. I wanted to do this application for the Dev team and I'm hoping I can join to get more involved in the software side of the club rather than just going to events. If I don't make the cut, this was a nice learning experience overall!💀
        </p>
          <div className="text-left">
              <h3 className="text-xl font-bold text-blue-400">Some of my favorite Animes/films:</h3>
          </div>

          <div className="flex justify-center gap-4 mt-4">
            <a href="https://gkids.com/films/look-back/" target="_blank">
              <Image src="/lookback.png" alt="anime 1" className="rounded-lg object-cover" width={96} height={144}/>
            </a>
            <a href="https://www.crunchyroll.com/series/GYVNXMVP6/cowboy-bebop" target="_blank">
              <Image src="/CowboyBebop.png" alt="anime 2" className=" rounded-lg object-cover" width={96} height={144} />
            </a>
            <a href="https://www.crunchyroll.com/series/GY3VKX1MR/hunter-x-hunter" target="_blank">
               <Image src="/hunter.png" alt="anime 3" className=" rounded-lg object-cover" width={96} height={144} />
            </a>
           
          </div>
      
      </div>



      </div>
    );
  

}