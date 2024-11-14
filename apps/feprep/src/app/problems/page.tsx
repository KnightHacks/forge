// export default function Problems() {
//   return <div>Problems</div>;
// }
// create endpoints w/ trpc for problems page - pharit
// endpoint to get all problems
// want filters to persist when user navigates back to explore page- store in url rather than state

// import { validateRequest } from "@feprep/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@blade/ui/tabs";

// import { Nav } from "./nav";
import { QuestionsTab } from "./questions-tab";

export default function Problems() {
  // const { user } = await validateRequest();

  return (
    <div className="mx-auto flex h-screen w-full max-w-screen-xl flex-col">
      {/* <Nav user={user} /> */}
      <Tabs
        className="flex flex-1 flex-col p-6 lg:min-h-0"
        defaultValue="questions"
      >
        <TabsList className="mb-8 self-start">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          {/* <TabsTrigger value="study">Study Sets</TabsTrigger> */}
        </TabsList>
        <TabsContent value="questions">
          <QuestionsTab />
        </TabsContent>
        {/* <TabsContent
          className="flex flex-1 flex-col gap-4 md:min-h-0 lg:flex-row"
          value="study"
        >
          <StudySetsTab />
        </TabsContent> */}
      </Tabs>
    </div>
  );
}
