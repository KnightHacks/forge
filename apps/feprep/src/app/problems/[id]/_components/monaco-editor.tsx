"use client";

import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

import { Button } from "@blade/ui/button";

export default function IDE() {
  const handleSubmit = async () => {};

  const { resolvedTheme } = useTheme();

  const checkDarkTheme =
    typeof window !== "undefined" &&
    (resolvedTheme === "dark" ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches &&
        resolvedTheme === "system"));

  // This Should be in a separate file  but i am keeping it here for testing
  const cSourceCode = `#include <stdio.h>

int main() 
{
  printf("Hello, World!");
  return 0;
}
`;

  return (
    <div className="h-full w-full border-2 border-accent">
      <form action="#" onSubmit={handleSubmit}>
        <Editor
          theme={checkDarkTheme ? "vs-dark" : "vs-light"}
          height="83vh"
          defaultLanguage="c"
          defaultValue={cSourceCode}
        />
        {/* <Button>Run</Button> */}
      </form>
    </div>
  );
}
