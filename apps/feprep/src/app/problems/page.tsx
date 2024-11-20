import { Tabs, TabsContent, TabsList, TabsTrigger } from "@blade/ui/tabs";

export default function Problems() {
  return (
    <div className="mx-auto flex h-screen w-full max-w-screen-xl flex-col">
      {/* <Nav user={user} /> */}
      <Tabs
        className="flex flex-1 flex-col p-6 lg:min-h-0"
        defaultValue="questions"
      >
        <TabsList className="mb-8 self-start">
          <TabsTrigger value="questions">Questions</TabsTrigger>
        </TabsList>
        <TabsContent value="questions">{/* <QuestionsTab /> */}</TabsContent>
      </Tabs>
    </div>
  );
}
