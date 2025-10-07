"use client";

import { useState } from "react";
import { QrReader } from "react-qr-reader";
import { z } from "zod";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@forge/ui/form";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

interface CodeScanningProps {
  processingScan?: boolean;
}

const HackerScanner = () => {
  const { data: hackathons } = api.hackathon.getHackathons.useQuery();
  const [open, setOpen] = useState(false);
  const [openPersistentDialog, setOpenPersistentDialog] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [assignedClass, setAssignedClass] = useState("");

  const checkIn = api.hackathon.hackathonCheckIn.useMutation({
    onSuccess(opts) {
      if (!opts) {
        toast.success("Hacker Checked in Successfully!");
        return;
      }
      toast.success(opts.message);
      setFirstName(opts.firstName);
      setLastName(opts.lastName);
      setAssignedClass(opts.class ?? "No class assigned");
      setOpenPersistentDialog(true);
    },
    onError(opts) {
      toast.error(opts.message, {
        icon: "⚠️",
      });
    },
  });
  const form = useForm({
    schema: z.object({
      userId: z.string(),
      hackathonId: z.string(),
    }),
    defaultValues: {
      hackathonId: "",
      userId: "",
    },
  });

  const closeModal = () => {
    setOpen(false);
    window.location.reload();
  };

  return (
    <Dialog open={open}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)} size="lg" className="gap-2">
          <span>Check In Hacker</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="h-auto max-h-[80vh] w-full overflow-y-auto [&>button:last-child]:hidden">
        <DialogHeader>
          <DialogTitle>Check In Hacker</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <QrReader
            constraints={{ facingMode: "environment" }}
            onResult={async (result, _, codeReader) => {
              const scanProps = codeReader as CodeScanningProps;
              if (!scanProps.processingScan && !!result) {
                scanProps.processingScan = true;

                try {
                  const userId = result.getText().substring(5);
                  form.setValue("userId", userId);

                  const hackathonId = form.getValues("hackathonId");
                  if (hackathonId) {
                    await form.handleSubmit((data) => checkIn.mutate(data))();
                  } else {
                    toast.error("Please select a hackathon first!");
                  }
                } finally {
                  setTimeout(() => (scanProps.processingScan = false), 9000);
                }
              }
            }}
          />
        </div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              checkIn.mutate(data);
            })}
            className="space-y-4"
          >
            <FormField
              name="hackathonId"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hackathon</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded border p-2"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select a hackathon
                      </option>
                      {hackathons?.map((hackathon) => (
                        <option key={hackathon.id} value={hackathon.id}>
                          {hackathon.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <div className="flex space-x-2">
          <Button onClick={() => closeModal()} className="w-full">
            Close
          </Button>
        </div>
        {openPersistentDialog && (
          <div>
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-10 bg-black text-center text-white">
              <div className="absolute top-5 px-5 font-bold">
                If this is the check-in at the start of the Hackathon, and you
                see this but the little toast says they are not confirmed, it
                means the scanner scanned twice, let bro in
              </div>
              <div className="text-6xl font-bold">{firstName}</div>
              <div className="text-6xl font-bold">{lastName}</div>
              <div className="text-2xl font-bold">{assignedClass}</div>
              <button
                className="absolute bottom-10 rounded-xl bg-blue-500 px-8 py-2 font-bold hover:bg-blue-600"
                onClick={() => setOpenPersistentDialog(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HackerScanner;
