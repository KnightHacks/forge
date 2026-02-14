"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, WrenchIcon } from "lucide-react";
import { z } from "zod";

import { HACKER_CLASSES } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@forge/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@forge/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@forge/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";
import { toast } from "@forge/ui/toast";

import ToggleButton from "~/app/_components/admin/hackathon/hackers/toggle-button";
import { api } from "~/trpc/react";

export function ManualEntryForm() {
  const { data: events } = api.event.getEvents.useQuery();
  const { data: hackathons } = api.hackathon.getHackathons.useQuery();

  const [toggleRepeatedCheckIn, setToggleRepeatedCheckIn] = useState(false);
  const [selectedHacker, setSelectedHacker] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [activeHackathon, setActiveHackathon] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Only show hackathon events (events with hackathonId)
  const filteredEvents = events?.filter((v) => v.hackathonId);

  // Get hackers for the selected hackathon
  const { data: hackers } = api.hacker.getAllHackers.useQuery(
    { hackathonName: activeHackathon?.name },
    { enabled: !!activeHackathon },
  );

  // Default to the closest hackathon that hasn't passed
  useEffect(() => {
    if (!activeHackathon && hackathons?.length) {
      const now = new Date();
      const upcomingHackathons = hackathons.filter(
        (h) => new Date(h.endDate) > now,
      );
      const closestHackathon = upcomingHackathons.sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      )[0];

      setActiveHackathon(closestHackathon ?? hackathons[0] ?? null);
    }
  }, [hackathons, activeHackathon]);

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

  const hackerEventCheckIn = api.hacker.eventCheckIn.useMutation({
    onSuccess(opts) {
      toast.success(opts.message);
      form.reset();
      return;
    },
    onError(opts) {
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
      userId: z.string().min(1, "Please select a hacker"),
      eventId: z.string().min(1, "Event is required"),
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

  const onSubmit = (data: {
    userId: string;
    eventId: string;
    eventPoints: number;
    hackathonId: string;
    assignedClassCheckin: string;
    repeatedCheckin: boolean;
  }) => {
    hackerEventCheckIn.mutate(data);
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
                Hackathon events for hacker check-ins
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
    <div className="space-y-6">
      {/* Hackathon Events Header */}
      <div className="flex items-center gap-2 text-lg font-semibold">
        <WrenchIcon className="h-5 w-5" />
        Hackathon Events
      </div>

      {/* Hackathon Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Hackathon</label>
        <select
          value={activeHackathon?.name ?? ""}
          onChange={(e) => {
            const selectedHackathon = hackathons?.find(
              (h) => h.name === e.target.value,
            );
            setActiveHackathon(selectedHackathon ?? null);
            setSelectedHacker(null);
            form.setValue("userId", "");
          }}
          className="w-full rounded border p-2"
        >
          <option value="" disabled>
            Select a hackathon
          </option>
          {hackathons?.map((hackathon) => (
            <option key={hackathon.id} value={hackathon.name}>
              {hackathon.displayName}
            </option>
          ))}
        </select>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Hacker Search */}
          <FormField
            name="userId"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Search Hacker</FormLabel>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                      >
                        {selectedHacker
                          ? `${selectedHacker.firstName} ${selectedHacker.lastName} (${selectedHacker.email})`
                          : "Select hacker..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search hackers by name or email..." />
                      <CommandList>
                        <CommandEmpty>No hackers found.</CommandEmpty>
                        <CommandGroup>
                          {hackers?.map((hacker) => (
                            <CommandItem
                              key={hacker.id}
                              value={`${hacker.firstName} ${hacker.lastName} ${hacker.email}`}
                              onSelect={() => {
                                setSelectedHacker({
                                  id: hacker.id,
                                  firstName: hacker.firstName,
                                  lastName: hacker.lastName,
                                  email: hacker.email,
                                });
                                field.onChange(hacker.userId);
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedHacker?.id === hacker.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {hacker.firstName} {hacker.lastName}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {hacker.email}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Event Selection Tabs */}
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current">Upcoming Events</TabsTrigger>
              <TabsTrigger value="previous">Previous Events</TabsTrigger>
            </TabsList>
            <TabsContent value="current" className="space-y-4">
              {renderEventSelect(currentEvents)}
              {renderClassCheckinSelect()}
              <ToggleButton
                isToggled={toggleRepeatedCheckIn}
                onToggle={(value) => {
                  setToggleRepeatedCheckIn(value);
                  form.setValue("repeatedCheckin", value);
                }}
              />
            </TabsContent>
            <TabsContent value="previous" className="space-y-4">
              {renderEventSelect(previousEvents)}
              {renderClassCheckinSelect()}
              <ToggleButton
                isToggled={toggleRepeatedCheckIn}
                onToggle={(value) => {
                  setToggleRepeatedCheckIn(value);
                  form.setValue("repeatedCheckin", value);
                }}
              />
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={hackerEventCheckIn.isPending}
          >
            {hackerEventCheckIn.isPending ? "Processing..." : "Check-in Hacker"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
