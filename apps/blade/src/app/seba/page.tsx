import { HydrateClient } from "~/trpc/server";
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@forge/ui/card";
import { Button } from "@forge/ui/button"



export default function SebaPage() {
  return (
    <>
      <div className="min-h-screen justify-center items-center text-center">
        <div className="flex flex-col justify-center items-center py-20">
          <Image src="/owltuah.jpg" className="flex justify-center py-10" alt="I'm a cat and a hawk, too" width={373.78} height={268.63} />
          <Image src="/flamename.gif" className="flex center" alt="Sebastian Garcia (See footer)" width={607} height={119} />
        </div>
        <Card className="w-full items-center">
          <CardContent>
            <h1 className="flex justify-center">
              Hi! This is my dev app! Feel free to look around.
            </h1>
            <div className="flex justify-center py-5">
              <Button variant="outline">Projects</Button>
              <Button variant="outline">Resume</Button>
            </div>
          </CardContent>
        </Card>
        <footer className="footer">
          <p>This is a simple footer. It stays at the bottom of the page.</p>
          <ul>
            <li><a href="/">Contact me</a></li>
          </ul>
          <a href="https://www.flamingtext.com/" target="_blank" rel="noopener noreferrer">
            <img src="https://linkus.flamingtext.com/button2.gif" className="logo react" alt="Create FREE graphics at FlamingText.com" />
          </a>
        </footer>
      </div>
    </>
  );
}