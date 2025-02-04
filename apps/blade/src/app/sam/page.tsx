import { HydrateClient } from "~/trpc/server";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@forge/ui/card";
import { Badge } from "@forge/ui/badge";

export default function SamPage() {
  return (
    <HydrateClient>
      <div suppressHydrationWarning className="theme-container">
        <div className="min-h-screen justify-center items-center text-center">
          Sam's Awesome Dev Application

          <Card className="max-w-sm mx-auto ">
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>
                <Badge>
                  <Image src="/cat.gif" alt=":3" width={50} height={50}/>
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>Card Content</CardContent>
            <CardFooter>Card Footer</CardFooter>
          </Card>
        </div>
      </div>
    </HydrateClient>
  );
}
