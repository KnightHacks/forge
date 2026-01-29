// this font is aweomse i will not change it
import Image from 'next/image';

export default function App() {
            const name = "Alejandro Jaimes";

    return (
        <div className="min-h-screen p-15 bg-green-800 bg-[radial-gradient(#000000_1px,transparent_2px)] [background-size:32px_32px] no-scrollbar">
            <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
                <div className="flex flex-row items-center justify-center mb-12">
                    <div className="max-w-sm">
                            <p className="hidden md:block text-2xl tracking-tighter font-bold text-black">
                                Application page for 
                             </p>
                     </div>
             <Image src="/khlogo.png" alt="" width={30}
                    height={20} 
                    className="w-60 h-30 hover:saturate-200" 
                    priority/>
                    <div className="max-w-lg">
                    <p className="hidden md:block text-2xl tracking-tighter font-bold text-black ">
                    Development Team
                </p>
            </div>
        </div>
        
                <div className="flex flex-col md:flex-row items-center justify-center md:space-x-25">
                    
                     <p className="funny md:text-7xl text-2xl tracking-tighter font-bold  text-white md:text-black mb-10 text-center">
                    {name}
                </p>
                <Image src="/ale.jpg" alt="" width={55}
                    height={55} 
                    className="w-35 h-35 md:w-55 md:h-55 mb-10 rounded-full"  
                    priority/>
                </div>    
                <p className="md:text-xl text-sm tracking-tighter font-bold text-white md:text-black mb-3">
                    This is the perfect opportunity to look at forge's features and learn a bit more about Knight Hacks!
                </p>
                <p className="md:text-sm text-xs tracking-tighter font-bold text-white md:text-black">
                    Checkout my cool links below!
                </p>
                <p className="hidden sm:block md:text-xs text-xs tracking-tighter font-bold text-black mb-6">
                    please load mobile for a surprise
                </p>
                <div className="flex md:flex-row flex-col space-y-5 md:space-x-20 mt-6 md:items-right justify-center">  
          <a href="https://www.github.com/alecocosette" target="_blank" rel="noopener noreferrer" 
          className="md:opacity-75 hover:opacity-100 transition flex items-center justify-center hover:scale-125 rounded-4xl md:w-40 md:h-15 w-20 h-10 bg-gray-800 shadow-[1px_3px_0px_0px_rgba(0,0,0,1)]">
           <span className=" text-white md:text-2xl text-xs text-center items-center">GitHub</span> 
       </a>
            <a href="/resume.pdf" target="_blank" rel="noopener noreferrer" 
          className="md:opacity-75 hover:opacity-100 transition flex items-center justify-center hover:scale-125 rounded-4xl md:space-x-4  px-2 md:px-4 md:w-40 md:h-15 w-20 h-10 bg-gray-400 shadow-[1px_3px_0px_0px_rgba(0,0,0,1)]">
           <span className=" text-white md:text-2xl text-xs ">Resume</span> 
       </a>
       
          <a href="https://www.linkedin.com/in/alejandro-jaimes-coco/" target="_blank" rel="noopener noreferrer" 
          className="md:opacity-75 hover:opacity-100 transition flex items-center justify-center hover:scale-125 rounded-4xl md:space-x-3  px-2 md:px-4 md:w-40 md:h-15 w-20 h-10 bg-blue-500 shadow-[1px_3px_0px_0px_rgba(0,0,0,1)]">
           <span className=" text-white md:text-2xl text-xs">LinkedIn</span> 
       </a> 
       <a href="https://www.alejaimes.dev" target="_blank" rel="noopener noreferrer" 
          className="md:opacity-75 hover:opacity-100 transition flex items-center justify-center hover:scale-125 rounded-4xl md:space-x-3  px-2 md:px-4 md:w-40 md:h-15 w-20 h-10 bg-purple-500 shadow-[1px_3px_0px_0px_rgba(0,0,0,1)]">
           <span className=" text-white md:text-xl text-xs">Portfolio</span> 
       </a></div>
    </div>
           <video
    autoPlay
    loop
    muted
    playsInline
    className="fixed inset-0 w-full h-full object-cover -z-20"
  >
    <source src="/me.mp4" type="video/mp4" />
  </video>
        </div>
    );
}
