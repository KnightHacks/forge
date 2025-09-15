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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

interface CodeScanningProps {
  processingScan?: boolean;
}

const ScannerPopUp = () => {
  const { data: events } = api.event.getEvents.useQuery();
  const [open, setOpen] = useState(false);

  // Separate current and previous events
  const now = new Date();
  const currentEvents = (events ?? []).filter((event) => {
    const eventEndTime = new Date(event.end_datetime);
    const dayAfterEvent = new Date(eventEndTime);
    dayAfterEvent.setDate(dayAfterEvent.getDate() + 1);
    return dayAfterEvent >= now;
  });
  const previousEvents = (events ?? []).filter((event) => {
    const eventEndTime = new Date(event.end_datetime);
    const dayAfterEvent = new Date(eventEndTime);
    dayAfterEvent.setDate(dayAfterEvent.getDate() + 1);
    return dayAfterEvent < now;
  });
  const checkIn = api.member.eventCheckIn.useMutation({
    onSuccess(opts) {
      toast.success(opts.message);
      return;
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
      eventId: z.string(),
      eventPoints: z.number(),
    }),
    defaultValues: {
      eventId: "",
      userId: "",
      eventPoints: 0,
    },
  });

  const closeModal = () => {
    setOpen(false);
    window.location.reload();
  };

  const renderEventSelect = (eventsList: typeof events) => (
    <FormField
      name="eventId"
      control={form.control}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Event</FormLabel>
          <FormControl>
            <select
              {...field}
              className="w-full rounded border p-2"
              defaultValue=""
              onChange={(e) => {
                const selectedEventId = e.target.value;
                field.onChange(e);
                const selectedEvent = eventsList?.find(
                  (event) => event.id === selectedEventId,
                );
                form.setValue("eventPoints", selectedEvent?.points ?? 0);
              }}
            >
              <option value="" disabled>
                Select an event
              </option>
              {eventsList?.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)} size="lg" className="gap-2">
          <span>Check In Member</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="h-auto max-h-[80vh] w-full overflow-y-auto [&>button:last-child]:hidden">
        <DialogHeader>
          <DialogTitle>Check In Member</DialogTitle>
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

                  const eventId = form.getValues("eventId");
                  if (eventId) {
                    await form.handleSubmit((data) => checkIn.mutate(data))();
                  } else {
                    toast.error("Please select an event first!");
                  }
                } finally {
                  setTimeout(() => (scanProps.processingScan = false), 3000);
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
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="current">Upcoming Events</TabsTrigger>
                <TabsTrigger value="previous">Previous Events</TabsTrigger>
              </TabsList>
              <TabsContent value="current" className="space-y-4">
                {renderEventSelect(currentEvents)}
              </TabsContent>
              <TabsContent value="previous" className="space-y-4">
                {renderEventSelect(previousEvents)}
              </TabsContent>
            </Tabs>
          </form>
        </Form>
        <div className="flex space-x-2">
          <Button onClick={() => closeModal()} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScannerPopUp;
