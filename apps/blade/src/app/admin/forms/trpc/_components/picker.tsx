"use client"

import React, { useState } from 'react';
import { z } from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@forge/ui/select';
import { Label } from '@forge/ui/label';
import { Button } from '@forge/ui/button';
import { Input } from '@forge/ui/input';

import type { ProcedureMeta } from '../page';
import { api } from '~/trpc/react';
import { toast } from '@forge/ui/toast';

const matchingSchema = z.object({
  proc: z.string().optional(),
  form: z.string().optional(),
  connections: z.array(z.object({
    procField: z.string(),
    formField: z.string().optional(),
  })),
});

export default function ListMatcher({ procs, forms }: {procs: Record<string, ProcedureMeta>, forms: Record<string, { questions: string[], id: string }>}) {
  const [procSelection, setProcSelection] = useState('');
  const [formSelection, setFormSelection] = useState('');
  const [procFields, setProcFields] = useState<string[]>([]);
  const [formFields, setFormFields] = useState<string[]>([]);
  const [connections, setConnections] = useState<{procField: string, formField: string}[]>([]);

  const addConnection = api.forms.addConnection.useMutation({
    onSuccess() {
      toast.success("Added connection");
    },
    onError() {
      toast.error("Failed to add connections");
    },
  });

  const handleProcChange = (value: string) => {
		if(!procs[value]) return;
    setProcSelection(value);
    const newProcFields = procs[value].inputSchema;
    setProcFields(newProcFields);
    setConnections(newProcFields.map(item => ({ procField: item, formField: '' })));
  };

  const handleFormChange = (value: string) => {
		if(!forms[value]) return;
    setFormSelection(value);
    setFormFields(forms[value].questions);
    setConnections(prev => prev.map(conn => ({ ...conn, formField: '' })));
  };

  const updateConnection = (index: number, value: string) => {
    setConnections(prev => {
      const updated = [...prev];
			if(!updated[index]) return updated;
      updated[index] = { ...updated[index], formField: value };
      return updated;
    });
  };

  const getAvailableFormFields = (currentIndex: number) => {
    const usedItems = connections
      .filter((_, i) => i !== currentIndex)
      .map(c => c.formField)
      .filter(Boolean);
    return formFields.filter(item => !usedItems.includes(item));
  };

  const handleSubmit = () => {
		if(!forms[formSelection]) return;

    const data = {
      form: forms[formSelection].id,
      proc: procSelection,
      connections: connections,
    };
    
    try {
      matchingSchema.parse(data);
			addConnection.mutate(data);
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="list1">Select tRPC procedure</Label>
          <Select value={procSelection} onValueChange={handleProcChange}>
            <SelectTrigger id="list1">
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

        <div className="space-y-2">
          <Label htmlFor="list2">Select form</Label>
          <Select value={formSelection} onValueChange={handleFormChange}>
            <SelectTrigger id="list2">
              <SelectValue placeholder="Choose an item" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(forms).map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {procFields.length > 0 && formFields.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold">Connect Items</h3>

          {connections.map((connection, index) => (
            <div key={index} className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`list3-${index}`}>Proc field</Label>
                <Input
                  id={`list3-${index}`}
                  value={connection.procField}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="flex-1 space-y-2">
                <Label htmlFor={`list4-${index}`}>Form field</Label>
                <Select
                  value={connection.formField}
                  onValueChange={(value) => updateConnection(index, value)}
                >
                  <SelectTrigger id={`list4-${index}`}>
                    <SelectValue placeholder="Select item (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableFormFields(index).map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          <Button onClick={handleSubmit} className="w-full">
            Submit Connections
          </Button>
        </div>
      )}
    </div>
  );
}
