import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@forge/ui/card";
import { Button } from "@forge/ui/button"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu"
import Link from "next/link";
import '../globals.css';

import { GitHubLogoIcon } from "@forge/ui";
import { LinkedInLogoIcon } from "@forge/ui";
import { ReaderIcon } from "@forge/ui";
import MultiLeaf from "./multileaf";



export default function SebaPage() {
  return (
    <>
    <MultiLeaf/ >
      <div className="min-h-screen justify-center items-center text-center">
        <div className="flex flex-col justify-center items-center py-10">
          <Image src="/owltuah.jpg" className="flex justify-center py-10" alt="I'm a cat and a hawk, too" width={373.78} height={268.63} />
          <Image src="/flamename.gif" className="flex center" alt="Sebastian Garcia (See footer)" width={607} height={119} />
        <Card className="w-3/4 items-center border-0">
        <h1 className="text-2xl font-sans-serif font-bold flex justify-center">
              Hi! This is my dev app! Right click on any of the icons to learn more.
        </h1>
          <CardContent>
            <div className="flex justify-center py-10 gap-10">
              <Button asChild variant="outline" size="icon" className="border-border border-0">
                <Link href="https://github.com/powdermilkjuno"><ReaderIcon /> </Link>
              </Button>
              <Button asChild variant="outline" size="icon" className="border-border border-0">
                <Link href="https://github.com/powdermilkjuno"><GitHubLogoIcon /> </Link>
              </Button>
              <Button asChild variant="outline" size="icon" className="border-border border-0">
                <Link href="hhttps://www.linkedin.com/in/sebastian-garcia-7848a3159/"><LinkedInLogoIcon /> </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
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