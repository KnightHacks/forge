"use client";

import { useState } from "react";
import { AwardIcon, Check, ChevronsUpDown } from "lucide-react";
import { z } from "zod";

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

import { api } from "~/trpc/react";

export function ManualEntryForm() {
  const { data: events } = api.event.getEvents.useQuery();

  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);
  const [open, setOpen] = useState(false);

  // Only show club events (events without hackathonId)
  const filteredEvents = events?.filter((v) => !v.hackathonId);

  // Get all members
  const { data: members } = api.member.getMembers.useQuery();

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

  const memberEventCheckIn = api.member.eventCheckIn.useMutation({
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

  const form = useForm({
    schema: z.object({
      userId: z.string().min(1, "Please select a member"),
      eventId: z.string().min(1, "Event is required"),
      eventPoints: z.number(),
    }),
    defaultValues: {
      eventId: "",
      userId: "",
      eventPoints: 0,
    },
  });

  const onSubmit = (data: {
    userId: string;
    eventId: string;
    eventPoints: number;
  }) => {
    memberEventCheckIn.mutate(data);
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
                Club events for member check-ins
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

  return (
    <div className="space-y-6">
      {/* Club Events Header */}
      <div className="flex items-center gap-2 text-lg font-semibold">
        <AwardIcon className="h-5 w-5" />
        Club Events
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Member Search */}
          <FormField
            name="userId"
            control={form.control}
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Search Member</FormLabel>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                      >
                        {selectedMember
                          ? `${selectedMember.firstName} ${selectedMember.lastName} (${selectedMember.email})`
                          : "Select member..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search members by name or email..." />
                      <CommandList>
                        <CommandEmpty>No members found.</CommandEmpty>
                        <CommandGroup>
                          {members?.map((member) => (
                            <CommandItem
                              key={member.id}
                              value={`${member.firstName} ${member.lastName} ${member.email}`}
                              onSelect={() => {
                                setSelectedMember({
                                  id: member.id,
                                  firstName: member.firstName,
                                  lastName: member.lastName,
                                  email: member.email,
                                });
                                field.onChange(member.userId);
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedMember?.id === member.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {member.firstName} {member.lastName}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {member.email}
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
            </TabsContent>
            <TabsContent value="previous" className="space-y-4">
              {renderEventSelect(previousEvents)}
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={memberEventCheckIn.isPending}
          >
            {memberEventCheckIn.isPending ? "Processing..." : "Check-in Member"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
