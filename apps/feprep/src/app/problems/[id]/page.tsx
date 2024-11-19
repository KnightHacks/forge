import { Tabs, TabsContent, TabsList, TabsTrigger } from "@blade/ui/tabs";

import { SessionStoreProvider } from "~/app/stores/auth/session-store-provider";
import ExcalidrawWrapper from "./_components/excalidraw-wrapper";
import IDE from "./_components/monaco-editor";
import { Navbar } from "./_components/navbar";

export default function Problem() {
  return (
    <SessionStoreProvider>
      <div className="flex h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 flex-col gap-2 px-2 md:flex-row">
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
                <TabsTrigger value="codeEditor">Code Editor</TabsTrigger>
                <TabsTrigger value="comments">Discussion</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>
              <TabsContent value="whiteboard" className="flex-1">
                <ExcalidrawWrapper />
              </TabsContent>
              <TabsContent value="codeEditor" className="flex-1">
                <IDE />
              </TabsContent>
              <TabsContent value="comments">Comments</TabsContent>
              <TabsContent value="resources">Resources</TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SessionStoreProvider>
  );
}
