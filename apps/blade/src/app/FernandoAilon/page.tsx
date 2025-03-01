"use client";

import { GitHubLogoIcon, LinkedInLogoIcon, ReaderIcon, InstagramLogoIcon} from "@forge/ui";

export default function Page()
{
    return (
      
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6"
      style={{ backgroundImage: "url('/clouds.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="bg-gray-800 bg-opacity-90 p-6 rounded-lg shadow-lg w-96 text-center border-blue-500 mt-6">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50 rounded-lg"
        ></div>
        <p className="text-lg font-bold text-white">Hello KightHacks Dev Team!</p>
        <h1 className="text-2xl text-blue-500 font-bold">I'm</h1>
        <h1 className="text-2xl font-bold text-blue-500">Fernando Ailon</h1>
        </div>
          <div className="mt-4 flex justify-center gap-4">
          <a
            href="./about"
            className="p-3 bg-gray-800 rounded-lg hover:bg-blue-500 transition-transform transform hover:scale-110"
            target="_blank" 
            rel="noopener noreferrer"
          >About Me</a>
          <a
            href="https://github.com/FernandoAilon"
            className="p-3 bg-gray-800 rounded-lg hover:bg-blue-500 transition-transform transform hover:scale-110"
            target="_blank" 
            rel="noopener noreferrer"
          >
            <GitHubLogoIcon className="h-6 w-6 text-white" />
          </a>
          <a
            href="https://www.linkedin.com/in/fernando-ailon/"
            className="p-3 bg-gray-800 rounded-lg hover:bg-blue-500 transition-transform transform hover:scale-110"
            target="_blank" 
            rel="noopener noreferrer"
          >
            <LinkedInLogoIcon className="h-6 w-6 text-white" />
          </a>

          <a
            href="/fernandoAilonResume.pdf"
            className="p-3 bg-gray-800 rounded-lg hover:bg-blue-500 transition-transform transform hover:scale-110"
            target="_blank" 
            rel="noopener noreferrer"
          > 
            <ReaderIcon className="h-6 w-6 text-white"/>
          </a> 

          <a
            href="https://devpost.com/fernandoailon6?ref_content=user-portfolio&ref_feature=portfolio&ref_medium=global-nav"
            className="p-3 bg-gray-800 rounded-lg hover:bg-blue-500 transition-transform transform hover:scale-110"
            target="_blank" 
            rel="noopener noreferrer"
          > 
            <img src="/devpost.svg" alt="Custom Icon" className="h-6 w-6" />
          </a> 

          <a
            href="https://www.instagram.com/fffernanddoo/"
            className="p-3 bg-gray-800 rounded-lg hover:bg-blue-500 transition-transform transform hover:scale-110"
            target="_blank" 
            rel="noopener noreferrer"
          > 
            <InstagramLogoIcon className="h-6 w-6 text-white"/>
          </a>
          
        </div>
        

      </div>
    );
  

}