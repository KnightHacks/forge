"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

import { Button } from "@blade/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@blade/ui/tabs";

import { api } from "~/trpc/react";

export default function IDE() {
  const { resolvedTheme } = useTheme();

  const [code, setCode] = useState(`#include <stdio.h>
int main() 
{
  printf("Hello, World!");
  return 0;
}
`);
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const runCodeMutation = api.code.runCCode.useMutation();

  const isDarkTheme =
    typeof window !== "undefined" &&
    (resolvedTheme === "dark" ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches &&
        resolvedTheme === "system"));

  const handleRunCode = async () => {
    setIsLoading(true);
    setOutput("");
    try {
      const result = await runCodeMutation.mutateAsync({ code });
      setOutput(result.output ?? result.error);
    } catch (error) {
      console.error(error);
      setOutput("An error occurred while running the code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Code Editor */}
      <div className="flex flex-[3] flex-col">
        <div className="flex-1 border-2 border-accent">
          <Editor
            theme={isDarkTheme ? "vs-dark" : "vs-light"}
            height="100%"
            language="c"
            value={code}
            onChange={(value) => setCode(value ?? "")}
          />
        </div>
        {/* Run Button */}
        <Button
          onClick={handleRunCode}
          disabled={isLoading}
          className="mt-2 self-end"
        >
          {isLoading ? "Running..." : "Run"}
        </Button>
      </div>

      {/* Output Section */}
      <div className="flex flex-[2] flex-col">
        <Tabs defaultValue="output" className="flex h-full flex-1 flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="output">Output</TabsTrigger>
            <TabsTrigger value="testcases">Test Cases</TabsTrigger>
          </TabsList>
          {/* Output Content */}
          <TabsContent value="output" className="flex flex-1">
            <div className="flex flex-1 border-2 border-accent">
              <pre className="flex-1 overflow-auto bg-background p-2">
                {output}
              </pre>
            </div>
          </TabsContent>
          {/* Test Cases Content */}
          <TabsContent value="testcases"></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
