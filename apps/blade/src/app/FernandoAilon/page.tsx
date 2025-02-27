
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { GitHubLogoIcon, LinkedInLogoIcon } from "@forge/ui";
// import { Button } from "@forge/ui/button";
// //import { Github, Linkedin, FileUser } from "lucide-react";
// import Image from "next/image";

export default function Page()
{
    return (
      
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6"
      style={{ backgroundImage: "url('/emerald-garden.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
        <audio autoPlay loop>
          <source src = "/flowingWater.mp3" type="audio/mpeg" />
        </audio>
      
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-80 text-center">
          <h1 className="text-2xl font-bold">Fernando Ailon</h1>
          <p className="text-gray-400">FernaDevs SICK MINI PORTFOLIO</p>
          <div className="mt-4 flex justify-center gap-4">
            <GitHubLogoIcon className="h-8 w-8 text-white hover:text-blue-400"/>
            <a href="https://github.com/FernandoAilon" className="text-blue-400" target="_blank">GitHub</a>
              <LinkedInLogoIcon className="h-8 w-8 text-white hover:text-blue-400"/>
            <a href="https://www.linkedin.com/in/fernando-ailon/" className="text-blue-400" target="_blank" >LinkedIn</a>
          </div>
        </div>
      </div>
    );
  

}