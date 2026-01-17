"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { toast } from "@forge/ui/toast";

import type { ProcedureMeta } from "~/lib/utils";
import { api } from "~/trpc/react";

const matchingSchema = z.object({
  proc: z.string().optional(),
  form: z.string().optional(),
  connections: z.array(
    z.object({
      procField: z.string(),
      formField: z.string().optional(),
      customValue: z.string().optional(),
    }),
  ),
});

export type MatchingType = z.infer<typeof matchingSchema>;

export default function ListMatcher({
  procs,
  form,
}: {
  procs: Record<string, ProcedureMeta>;
  form: { questions: string[]; id: string };
}) {
  const utils = api.useUtils();
  const [procSelection, setProcSelection] = useState("");
  const [procFields, setProcFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connections, setConnections] = useState<
    { procField: string; formField?: string; customValue?: string }[]
  >([]);

  const formFields = form.questions;

  const addConnection = api.forms.addConnection.useMutation({
    onSuccess() {
      toast.success("Added connection");
    },
    onError() {
      toast.error("Failed to add connections");
    },
    async onSettled() {
      setIsLoading(false);
      await utils.forms.getConnections.invalidate();
    },
  });

  const handleProcChange = (value: string) => {
    if (!procs[value]) return;
    setProcSelection(value);
    const newProcFields = procs[value].inputSchema;
    setProcFields(newProcFields);
    setConnections(newProcFields.map((item) => ({ procField: item })));
  };

  const updateConnection = (index: number, value: string) => {
    setConnections((prev) => {
      const updated = [...prev];
      if (!updated[index]) return updated;
      if (value === "__CUSTOM__") {
        updated[index] = {
          ...updated[index],
          formField: undefined,
          customValue: updated[index].customValue || "",
        };
      } else {
        updated[index] = {
          ...updated[index],
          formField: value,
          customValue: undefined,
        };
      }
      return updated;
    });
  };

  const updateCustomValue = (index: number, value: string) => {
    setConnections((prev) => {
      const updated = [...prev];
      if (!updated[index]) return updated;
      updated[index] = { ...updated[index], customValue: value };
      return updated;
    });
  };

  const getAvailableFormFields = (currentIndex: number) => {
    const usedItems = connections
      .filter((_, i) => i !== currentIndex)
      .map((c) => c.formField)
      .filter(Boolean);
    return formFields.filter((item) => !usedItems.includes(item));
  };

  const isCustomValue = (index: number) => {
    const conn = connections[index];
    return conn && !conn.formField && conn.customValue !== undefined;
  };

  const handleSubmit = () => {
    setIsLoading(true);

    const cleanedConnections = connections.map((conn) => {
      const cleaned: {
        procField: string;
        formField?: string;
        customValue?: string;
      } = {
        procField: conn.procField,
      };
      if (conn.formField) {
        cleaned.formField = conn.formField;
      }
      if (conn.customValue !== undefined && conn.customValue !== "") {
        cleaned.customValue = conn.customValue;
      }
      return cleaned;
    });

    const data = {
      form: form.id,
      proc: procSelection,
      connections: cleanedConnections,
    };

    try {
      matchingSchema.parse(data);
      addConnection.mutate(data);
    } catch {
      toast.error("Could not parse connections");
    }
  };

  return (
    <div className="mx-auto mb-10 w-full max-w-4xl space-y-6 rounded-xl bg-card p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="procs">Select tRPC procedure</Label>
          <Select value={procSelection} onValueChange={handleProcChange}>
            <SelectTrigger id="procs">
              <SelectValue placeholder="Choose an item" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(procs).map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {procFields.length > 0 && (
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-semibold">Connect Items</h3>

          {connections.map((connection, index) => (
            <div key={index} className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`proc-${index}`}>Proc field</Label>
                <Input
                  id={`proc-${index}`}
                  value={connection.procField}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="flex-1 space-y-2">
                <Label htmlFor={`form-${index}`}>Form field</Label>
                <Select
                  value={
                    isCustomValue(index)
                      ? "__CUSTOM__"
                      : connection.formField || ""
                  }
                  onValueChange={(value) => updateConnection(index, value)}
                >
                  <SelectTrigger id={`form-${index}`}>
                    <SelectValue placeholder="Select item (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableFormFields(index).map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                    <SelectItem value="__CUSTOM__">Input Custom</SelectItem>
                  </SelectContent>
                </Select>
                {isCustomValue(index) && (
                  <Input
                    id={`custom-${index}`}
                    placeholder="Enter custom value"
                    value={connection.customValue || ""}
                    onChange={(e) => updateCustomValue(index, e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            </div>
          ))}

          {isLoading ? (
            <div className="flex justify-center">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <Button onClick={handleSubmit} className="w-full">
              Submit Connections
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
