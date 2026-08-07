"use client";

import type { CSSProperties, ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { Button } from "@forge/ui/button";

/**
 * The drag wrapper around one question. `children` lands directly inside the
 * `grid gap-3` article, so whatever the caller passes has to stay a run of
 * siblings — wrapping it in an element would collapse the gaps between fields.
 */
export function SortableQuestionCard({
  children,
  disabled = false,
  id,
  index,
}: {
  children: ReactNode;
  disabled?: boolean;
  id: string;
  index: number;
}) {
  const {
    attributes,
    isDragging,
    isOver,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ disabled, id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <article
      className="relative grid gap-3 rounded-md border border-white/10 bg-background/60 p-4 pl-12 transition-[border-color,box-shadow,opacity,transform] duration-150 data-[dragging=true]:scale-[1.01] data-[dragging=true]:border-primary/60 data-[over=true]:border-primary/50 data-[over=true]:bg-primary/5 data-[dragging=true]:opacity-90 data-[dragging=true]:shadow-xl motion-reduce:!transition-none motion-reduce:data-[dragging=true]:scale-100"
      data-dragging={isDragging}
      data-over={isOver && !isDragging}
      data-sortable-question={id}
      ref={setNodeRef}
      style={style}
    >
      <Button
        {...attributes}
        {...listeners}
        aria-label={`Drag question ${index + 1} to reorder`}
        className="absolute left-1 top-1 min-h-11 min-w-11 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        disabled={disabled}
        size="icon"
        type="button"
        variant="ghost"
      >
        <GripVertical className="size-4" />
      </Button>
      {children}
    </article>
  );
}
