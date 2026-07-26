"use client";

import type { ComponentProps } from "react";
import { EmailEditor } from "@react-email/editor";

import type { VisualEmailDocument, VisualEmailNode } from "@forge/email";

import "@react-email/editor/themes/default.css";
import "@react-email/editor/styles/bubble-menu.css";
import "@react-email/editor/styles/slash-command.css";

type EditorContent = NonNullable<ComponentProps<typeof EmailEditor>["content"]>;

interface EditorNode {
  attrs?: Record<string, unknown>;
  content?: EditorNode[];
  text?: string;
  type?: string;
}

function textContent(node: EditorNode): string {
  if (typeof node.text === "string") return node.text;
  return (node.content ?? []).map(textContent).join("");
}

function textNodes(value: string): VisualEmailNode {
  const children: (VisualEmailNode | { text: string })[] = [];
  const pattern =
    /\{\{\s*((?:recipient|member|hacker|hackathon|team)\.[A-Za-z][A-Za-z0-9.]*)\s*(?:\|\s*([^}]+?)\s*)?\}\}/g;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index;
    if (index > cursor) children.push({ text: value.slice(cursor, index) });
    children.push({
      fallback: match[2]?.trim(),
      field: match[1] ?? "recipient.name",
      type: "merge",
    });
    cursor = index + match[0].length;
  }
  if (cursor < value.length) children.push({ text: value.slice(cursor) });
  return children.length === 1 && "text" in (children[0] ?? {})
    ? { text: value, type: "text" }
    : { children, type: "text" };
}

function toVisualNodes(node: EditorNode): VisualEmailNode[] {
  if (node.type === "doc") {
    return (node.content ?? []).flatMap(toVisualNodes);
  }
  if (node.type?.toLowerCase().includes("button")) {
    const href =
      typeof node.attrs?.href === "string"
        ? node.attrs.href
        : typeof node.attrs?.url === "string"
          ? node.attrs.url
          : "https://knighthacks.org";
    return [
      {
        href,
        label: textContent(node) || "Open link",
        type: "button",
      },
    ];
  }
  const text = textContent(node).trim();
  if (text) return [textNodes(text)];
  return (node.content ?? []).flatMap(toVisualNodes);
}

function toVisualDocument(content: EditorNode): VisualEmailDocument & {
  editor: EditorNode;
} {
  return {
    editor: content,
    root: {
      children: toVisualNodes(content),
      type: "root",
    },
    version: 1,
  };
}

function initialEditorContent(document: Record<string, unknown>) {
  const editor = document.editor;
  if (typeof editor === "object" && editor !== null) {
    return editor as EditorContent;
  }
  return {
    content: [
      {
        content: [
          { text: "Hello {{ recipient.firstName | friend }}", type: "text" },
        ],
        type: "paragraph",
      },
    ],
    type: "doc",
  } satisfies EditorContent;
}

export function VisualEmailEditor({
  document,
  onChange,
}: {
  document: Record<string, unknown>;
  onChange: (document: Record<string, unknown>) => void;
}) {
  return (
    <div className="min-h-80 rounded-md border border-white/10 bg-white text-slate-950">
      <EmailEditor
        className="min-h-80 px-5 py-4"
        content={initialEditorContent(document)}
        onUpdate={(editor) =>
          onChange(
            toVisualDocument(
              editor.getJSON() as unknown as EditorNode,
            ) as unknown as Record<string, unknown>,
          )
        }
        placeholder="Build the email body. Type / for blocks."
      />
    </div>
  );
}
