import Link from "next/link";
import { Swords } from "lucide-react";

import { cn } from "@forge/ui";
import { buttonVariants } from "@forge/ui/button";
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
          Join our community of passionate students at UCF!
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <ul className="space-y-2">
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Fall Kickstart Mentorship
          </li>
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Spring Project Launch
          </li>
          <li className="flex items-center">
            <span className="mr-2">•</span>
            Exclusive Merch
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
