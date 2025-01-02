import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import MemberDashboard from "./member-dashboard/member-dashboard";

export function UserInterface() {
  return (
    <div className="flex justify-center">
      <Tabs defaultValue="Member" className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="Member"
            className="data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            Member
          </TabsTrigger>
          <TabsTrigger
            value="Hacker"
            className="data-[state=active]:bg-primary data-[state=active]:text-white"
            disabled
          >
            Hacker (soon)
          </TabsTrigger>
        </TabsList>
        <TabsContent className="absolute left-0 w-full" value="Member">
          <MemberDashboard />
        </TabsContent>
        <TabsContent value="Hacker"></TabsContent>
      </Tabs>
    </div>
  );
}
