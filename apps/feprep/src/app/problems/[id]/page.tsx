import dynamic from "next/dynamic";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@blade/ui/tabs";

// Since client components get prerenderd on server as well hence importing
// the excalidraw stuff dynamically with ssr false

const ExcalidrawWrapper = dynamic(
  async () => (await import("./_components/excalidraw-wrapper")).default,
  {
    ssr: false,
  },
);

export default function Problem() {
  return (
    <div className="flex h-screen flex-col">
      <nav className="border p-4">navbar</nav>
      <main className="flex flex-1 flex-col gap-2 p-2 md:flex-row">
        <div className="min-h-full flex-1 overflow-hidden rounded-lg border">
          <object
            className="h-full w-full"
            data="/example-question.pdf"
            type="application/pdf"
          ></object>
        </div>
        <div className="grid min-h-full flex-1 rounded-lg border p-4">
          <Tabs defaultValue="whiteboard" className="flex flex-col">
            <TabsList className="w-fit">
              <TabsTrigger value="whiteboard">Whiteboard</TabsTrigger>
              <TabsTrigger value="comments">Discussion</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>
            <TabsContent value="whiteboard" className="flex-1">
              <ExcalidrawWrapper />
            </TabsContent>
            <TabsContent value="comments">Comments</TabsContent>
            <TabsContent value="resources">Resources</TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
