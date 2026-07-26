"use client";

import Editor from "@monaco-editor/react";

export function CodeEmailEditor({
  onChange,
  source,
}: {
  onChange: (source: string) => void;
  source: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-[#0d1117]">
      <Editor
        height="30rem"
        language="typescript"
        onChange={(value) => onChange(value ?? "")}
        options={{
          accessibilitySupport: "on",
          ariaLabel: "Template source",
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          fontSize: 13,
          lineNumbersMinChars: 3,
          minimap: { enabled: false },
          padding: { bottom: 16, top: 16 },
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: "on",
        }}
        theme="vs-dark"
        value={source}
      />
    </div>
  );
}
