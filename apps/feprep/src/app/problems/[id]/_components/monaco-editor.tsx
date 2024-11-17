"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

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
    <div className="flex h-full w-full flex-col border-2 border-accent">
      <Editor
        theme={isDarkTheme ? "vs-dark" : "vs-light"}
        height="83vh"
        language="c"
        value={code}
        onChange={(value) => setCode(value ?? "")}
      />
      <button onClick={handleRunCode} disabled={isLoading} className="mt-2">
        {isLoading ? "Running..." : "Run"}
      </button>
      <div className="mt-4">
        <h2>Output:</h2>
        <pre className="bg-gray-100 p-2">{output}</pre>
      </div>
    </div>
  );
}
