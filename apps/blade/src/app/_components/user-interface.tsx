import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import { api } from "~/trpc/server";

export async function UserInterface() {
  const hackathons = await api.payment.validatePaidDues();

  console.log(hackathons);

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
            Hacker (Coming soon)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="Member">
          Make changes to your account here.
        </TabsContent>
        <TabsContent value="Hacker">Change your password here.</TabsContent>
      </Tabs>
    </div>
  );
}
