"use client";

import { useRef, useState } from "react";
import { AwardIcon, WrenchIcon } from "lucide-react";
import { QrReader } from "react-qr-reader";
import { z } from "zod";

import type { HackerClass } from "@forge/db/schemas/knight-hacks";
import { HACKER_CLASSES } from "@forge/db/schemas/knight-hacks";
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

import { getClassTeam } from "~/lib/utils";
import { api } from "~/trpc/react";
import ToggleButton from "~/app/_components/admin/hackathon/hackers/toggle-button";

const ScannerPopUp = ({ eventType }: { eventType: "Member" | "Hacker" }) => {
  const { data: events } = api.event.getEvents.useQuery();

  const filteredEvents = events?.filter((v) => {
    if (eventType == "Member") return !v.hackathonId;
    else return v.hackathonId;
  });

  const [open, setOpen] = useState(false);
  const [openPersistentDialog, setOpenPersistentDialog] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [assignedClass, setAssignedClass] = useState("");
  const [checkInMessage, setCheckInMessage] = useState("");
  const [toggleRepeatedCheckIn, setToggleRepeatedCheckIn] = useState(false);
  const [errorColor, setErrorColor] = useState("text-red-500");

  const scanningRef = useRef(false);

  const now = new Date();
  const currentEvents = (filteredEvents ?? []).filter((event) => {
    const eventEndTime = new Date(event.end_datetime);
    const dayAfterEvent = new Date(eventEndTime);
    dayAfterEvent.setDate(dayAfterEvent.getDate() + 1);
    return dayAfterEvent >= now;
  });
  const previousEvents = (filteredEvents ?? []).filter((event) => {
    const eventEndTime = new Date(event.end_datetime);
    const dayAfterEvent = new Date(eventEndTime);
    dayAfterEvent.setDate(dayAfterEvent.getDate() + 1);
    return dayAfterEvent < now;
  });

  const memberCheckIn = api.member.eventCheckIn.useMutation({
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
  const hackerEventCheckIn = api.hacker.eventCheckIn.useMutation({
    onSuccess(opts) {
      toast.success(opts.message);
      setErrorColor(
        opts.messageforHackers.includes("[ERROR]") ? "text-red-500" : "",
      );
      setFirstName(opts.firstName);
      setLastName(opts.lastName);
      setAssignedClass(opts.class ?? "No class assigned");
      setCheckInMessage(opts.messageforHackers);
      setOpenPersistentDialog(true);

      return;
    },
    onError(opts) {
      if (!openPersistentDialog) {
        toast.error(opts.message, {
          icon: "⚠️",
        });
        setErrorColor("text-red-500");
        setCheckInMessage(opts.message);
        setFirstName("Error");
        setLastName("Error");
        setAssignedClass("");
        setOpenPersistentDialog(true);
      }
      toast.error(opts.message, {
        icon: "⚠️",
      });
    },
  });
  const AssignedClassCheckinSchema = z.union([
    z.literal("All"),
    z.enum(HACKER_CLASSES),
  ]);
  const form = useForm({
    schema: z.object({
      userId: z.string(),
      eventId: z.string(),
      eventPoints: z.number(),
      hackathonId: z.string(),
      assignedClassCheckin: AssignedClassCheckinSchema,
      repeatedCheckin: z.boolean(),
    }),
    defaultValues: {
      eventId: "",
      userId: "",
      eventPoints: 0,
      hackathonId: "",
      assignedClassCheckin: "All",
      repeatedCheckin: false,
    },
  });
  const closeModal = () => {
    setOpen(false);
    window.location.reload();
  };
  const closePersistentDialog = () => {
    setOpenPersistentDialog(false);
  };

  const renderEventSelect = (filteredEvents: typeof events) => (
    <FormField
      name="eventId"
      control={form.control}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            <span className="flex flex-row gap-2">
              Event
              <span className="text-muted-foreground">
                This event only accepts{" "}
                <span className="font-bold text-primary">{eventType}</span> QR
                codes.
              </span>
            </span>
          </FormLabel>
          <FormControl>
            <select
              {...field}
              className="w-full rounded border p-2"
              defaultValue=""
              onChange={(e) => {
                const selectedEventId = e.target.value;
                field.onChange(e);
                const selectedEvent = filteredEvents?.find(
                  (event) => event.id === selectedEventId,
                );
                form.setValue("eventPoints", selectedEvent?.points ?? 0);
                form.setValue("hackathonId", selectedEvent?.hackathonId ?? "");
              }}
            >
              <option value="" disabled>
                Select an event
              </option>
              {filteredEvents?.map((event) => (
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
  const renderClassCheckinSelect = () => (
    <FormField
      name="assignedClassCheckin"
      control={form.control}
      render={({ field }) => (
        <FormItem className="space-y-2">
          <FormLabel>Check-in class</FormLabel>
          <FormControl>
            <select
              {...field}
              className="w-full rounded border p-2"
              defaultValue=""
              onChange={(e) => {
                const selectedClass = e.target.value;
                field.onChange(e);
                form.setValue("assignedClassCheckin", selectedClass);
              }}
            >
              <option value="" disabled>
                Select a class
              </option>
              <option key="All" value="All">
                All
              </option>
              {HACKER_CLASSES.map((HackerClass) => (
                <option key={HackerClass} value={HackerClass}>
                  {HackerClass}
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
          <span className="flex flex-row gap-2">
            {eventType == "Member" ? <AwardIcon /> : <WrenchIcon />}
            <span className="my-auto">Check-in {eventType}</span>
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="h-auto w-full overflow-y-auto 2xl:max-h-[90vh] [&>button:last-child]:hidden">
        <DialogHeader>
          <DialogTitle className="absolute">Check-in {eventType}</DialogTitle>
        </DialogHeader>
        <div>
          <QrReader
            scanDelay={2000}
            constraints={{ facingMode: "environment" }}
            onResult={async (result, _) => {
              if (!result) return;
              if (scanningRef.current) return;
              scanningRef.current = true;
              try {
                const userId = result.getText().substring(5);
                form.setValue("userId", userId);
                const eventId = form.getValues("eventId");
                if (eventId) {
                  if (eventType === "Hacker") {
                    await form.handleSubmit((data) =>
                      hackerEventCheckIn.mutate(data),
                    )();
                  } else {
                    await form.handleSubmit((data) =>
                      memberCheckIn.mutate(data),
                    )();
                  }
                } else {
                  toast.error("Please select an event first!");
                }
              } finally {
                setTimeout(() => {
                  scanningRef.current = false;
                }, 3000);
              }
            }}
          />
        </div>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              if (eventType == "Hacker") hackerEventCheckIn.mutate(data);
              else memberCheckIn.mutate(data);
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
                {eventType === "Hacker" && renderClassCheckinSelect()}
                {eventType === "Hacker" && (
                  <ToggleButton
                    isToggled={toggleRepeatedCheckIn}
                    onToggle={(value) => {
                      setToggleRepeatedCheckIn(value);
                      form.setValue("repeatedCheckin", value);
                    }}
                  />
                )}
              </TabsContent>
              <TabsContent value="previous" className="space-y-4">
                {renderEventSelect(previousEvents)}
                {eventType === "Hacker" && renderClassCheckinSelect()}
                {eventType === "Hacker" && (
                  <ToggleButton
                    isToggled={toggleRepeatedCheckIn}
                    onToggle={(value) => {
                      setToggleRepeatedCheckIn(value);
                      form.setValue("repeatedCheckin", value);
                    }}
                  />
                )}
              </TabsContent>
            </Tabs>
          </form>
        </Form>
        <div className="flex space-x-2">
          <Button onClick={() => closeModal()} className="w-full">
            Close
          </Button>
        </div>
        {openPersistentDialog && (
          <div className="fixed inset-0 z-[1000] flex w-full flex-col items-center justify-center gap-6 bg-black p-10 text-center text-3xl font-bold">
            <Button
              onClick={closePersistentDialog}
              className="absolute top-10 w-56 text-lg font-semibold"
            >
              CLOSE
            </Button>
            <div className="-mb-2 w-56 border-b pb-2 text-lg font-bold text-muted-foreground">
              CHECKED IN
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">FIRST</div>
              <div>{firstName}</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">LAST</div>
              <div>{lastName}</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">CLASS</div>
              <div
                className="text-2xl"
                style={{
                  color: getClassTeam(assignedClass as HackerClass).teamColor,
                  textShadow: `0 0 10px ${getClassTeam(assignedClass as HackerClass).teamColor}, 0 0 20px ${getClassTeam(assignedClass as HackerClass).teamColor}`,
                }}
              >
                {assignedClass}
              </div>
            </div>
            <div className="-my-2 w-56 border-t" />
            {errorColor != "" ? (
              <div
                className={`top-10 w-56 whitespace-pre-line rounded-sm border border-red-500 bg-red-900 p-1 text-base font-normal text-white`}
              >
                {checkInMessage}
              </div>
            ) : (
              <div className="top-10 w-56 whitespace-pre-line text-base font-normal">
                {checkInMessage}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScannerPopUp;
