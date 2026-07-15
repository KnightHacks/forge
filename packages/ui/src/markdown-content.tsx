import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";

import { cn } from "@forge/ui";

export interface MarkdownContentProps {
  children: string;
  className?: string;
  compact?: boolean;
}

export function MarkdownContent({
  children,
  className,
  compact = false,
}: MarkdownContentProps) {
  const components: Components = {
    a: ({ node: _node, ...props }) => (
      <a
        {...props}
        className="font-medium text-primary underline decoration-primary/50 underline-offset-2 transition-colors hover:decoration-primary"
        rel="noopener noreferrer"
        target="_blank"
      />
    ),
    ...(compact
      ? {
          p: ({ children: paragraphChildren }) => <>{paragraphChildren} </>,
        }
      : {}),
  };

  return (
    <div
      className={cn(
        "min-w-0 break-words [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_em]:italic [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5",
        !compact &&
          "space-y-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:mt-1",
        className,
      )}
    >
      <ReactMarkdown components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
