import Link from "next/link";
import { Code, Swords } from "lucide-react";

import { cn } from "@forge/ui";
import { Button, buttonVariants } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

export function MemberAppCard() {
  return (
    <Card className="flex flex-col hover:border-primary">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 rounded-full bg-primary/10 p-3">
          <Swords className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Become a Member</CardTitle>
        <CardDescription>
          Join our community of passionate students!
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <ul className="space-y-2">
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Access to exclusive content
          </li>
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Monthly newsletters
          </li>
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Community events
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <Link
          href={"/member/application"}
          className={cn(buttonVariants({ variant: "primary" }), "w-full")}
        >
          Join as Member
        </Link>
      </CardFooter>
    </Card>
  );
}

export function HackerAppCard() {
  return (
    <Card className="flex flex-col px-4 hover:border-primary">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 rounded-full bg-primary/10 p-3">
          <Code className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Join the Hackathon!</CardTitle>
        <CardDescription>Build, innovate, and compete!</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <ul className="space-y-2">
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Prizes available
          </li>
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Free developer tools and APIs
          </li>
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Networking opportunities
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <Link href={"/hacker/application/gemiknights"} className="w-full">
          <Button className="w-full">Register to Hack</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
