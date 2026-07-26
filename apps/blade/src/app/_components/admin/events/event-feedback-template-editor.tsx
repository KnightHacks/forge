"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import type { FormDefinition, FormQuestion } from "@forge/validators";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { Input } from "@forge/ui/input";

import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/admin/admin-page";
import { api } from "~/trpc/react";

const CORE_COUNT = 6;

export function EventFeedbackTemplateEditor({
  definition: initialDefinition,
  revision,
}: {
  definition: FormDefinition;
  revision: number;
}) {
  const [definition, setDefinition] = useState(initialDefinition);
  const [currentRevision, setCurrentRevision] = useState(revision);
  const [message, setMessage] = useState<string | null>(null);
  const save = api.event.updateFeedbackTemplate.useMutation();

  useEffect(() => {
    setCurrentRevision(revision);
  }, [revision]);

  function addQuestion(type: "linear_scale" | "paragraph") {
    const question: FormQuestion =
      type === "paragraph"
        ? {
            id: crypto.randomUUID(),
            maxLength: 2_000,
            prompt: "New feedback question",
            required: false,
            retired: false,
            type,
          }
        : {
            id: crypto.randomUUID(),
            max: 5,
            min: 1,
            prompt: "New rating",
            required: false,
            retired: false,
            type,
          };
    setDefinition((current) => ({
      ...current,
      questions: [...current.questions, question],
    }));
  }

  return (
    <main className={adminPageLayoutClassName}>
      <Button asChild variant="ghost" className="-ml-3 min-h-11 w-fit gap-2">
        <Link href="/admin/events">
          <ArrowLeft className="h-4 w-4" /> Events
        </Link>
      </Button>
      <AdminPageHeader
        actions={
          <Button
            className="min-h-11 gap-2"
            disabled={save.isPending}
            onClick={() =>
              void save
                .mutateAsync({
                  definition,
                  expectedRevision: currentRevision,
                })
                .then((saved) => {
                  setCurrentRevision(saved.revision);
                  setMessage("Template saved for future events.");
                })
                .catch((cause) =>
                  setMessage(
                    cause instanceof Error ? cause.message : "Save failed.",
                  ),
                )
            }
          >
            <Save className="h-4 w-4" /> Save template
          </Button>
        }
        description="Changes apply to future qualifying events. Comparable core questions remain locked."
        eyebrow="Event configuration"
        icon={MessageSquareText}
        title="Event feedback template"
      />

      {message && (
        <p
          role="status"
          className="rounded-md border border-white/10 bg-card/95 p-3 text-sm"
        >
          {message}
        </p>
      )}

      <section className="grid gap-3">
        {definition.questions.map((question, index) => {
          const core = index < CORE_COUNT;
          return (
            <Card
              className="border-white/10 bg-card/95 shadow-xl shadow-black/15"
              key={question.id}
            >
              <CardHeader className="flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">
                    Question {index + 1}
                  </CardTitle>
                  <Badge variant="outline">{question.type}</Badge>
                  {core && (
                    <Badge variant="secondary" className="gap-2">
                      <LockKeyhole className="h-3 w-3" /> Comparable core
                    </Badge>
                  )}
                </div>
                {!core && (
                  <Button
                    aria-label={`Remove ${question.prompt}`}
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDefinition((current) => ({
                        ...current,
                        questions: current.questions.filter(
                          ({ id }) => id !== question.id,
                        ),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <Input
                  className="h-11"
                  disabled={core}
                  value={question.prompt}
                  onChange={(event) =>
                    setDefinition((current) => ({
                      ...current,
                      questions: current.questions.map((candidate) =>
                        candidate.id === question.id
                          ? ({
                              ...candidate,
                              prompt: event.target.value,
                            } as FormQuestion)
                          : candidate,
                      ),
                    }))
                  }
                />
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="min-h-11 gap-2"
          onClick={() => addQuestion("paragraph")}
        >
          <Plus className="h-4 w-4" /> Add written question
        </Button>
        <Button
          variant="outline"
          className="min-h-11 gap-2"
          onClick={() => addQuestion("linear_scale")}
        >
          <Plus className="h-4 w-4" /> Add 1–5 rating
        </Button>
      </div>
    </main>
  );
}
