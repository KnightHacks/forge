"use client";

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { z } from "zod";

import type { InsertEvent } from "@forge/db/schemas/knight-hacks";
import { EVENT_TAGS } from "@forge/consts/knight-hacks";
import { InsertEventSchema } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

// 12-hour-based hours (1–12)
const hours = Array.from({ length: 12 }, (_, i) =>
  (i + 1).toString().padStart(2, "0"),
);

// Minutes (00, 05, 10, ... , 55)
const minutes = Array.from({ length: 12 }, (_, i) =>
  (i * 5).toString().padStart(2, "0"),
);

const amPmOptions = ["AM", "PM"] as const;

const UpdateFormSchema = InsertEventSchema.omit({
  start_datetime: true,
  end_datetime: true,
  discordId: true,
  googleId: true,
}).extend({
  date: z.string(),
  endDate: z.string(),
  startHour: z.string(),
  startMinute: z.string(),
  startAmPm: z.enum(amPmOptions),
  endHour: z.string(),
  endMinute: z.string(),
  endAmPm: z.enum(amPmOptions),
});

function parseDateTime(value: string | Date) {
  const d = value instanceof Date ? new Date(value) : new Date(value);
  if (isNaN(d.getTime())) {
    return { date: "", hour: "", minute: "", amPm: "PM" as const };
  }

  d.setDate(d.getDate() + 1);

  // Format local YYYY-MM-DD for <input type="date">
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const formattedDate = `${yyyy}-${mm}-${dd}`;

  let hour24 = d.getHours();
  const mins = d.getMinutes();
  const amPm = hour24 >= 12 ? "PM" : "AM";

  // 24h -> 12h
  if (hour24 === 0) hour24 = 12;
  else if (hour24 > 12) hour24 -= 12;

  return {
    date: formattedDate,
    hour: String(hour24).padStart(2, "0"),
    minute: String(mins).padStart(2, "0"),
    amPm,
  };
}

export function UpdateEventButton({ event }: { event: InsertEvent }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: hackathons } = api.hackathon.getHackathons.useQuery();

  // TRPC update mutation
  const utils = api.useUtils();
  const updateEvent = api.event.updateEvent.useMutation({
    onSuccess() {
      toast.success("Event updated successfully!");
      setIsOpen(false);
    },
    onError(opts) {
      toast.error(opts.message);
    },
    async onSettled() {
      await utils.event.invalidate();
      setIsLoading(false);
    },
  });

  const {
    date,
    hour: startHour,
    minute: startMinute,
    amPm: startAmPm,
  } = parseDateTime(event.start_datetime.toString());
  const {
    date: endDate,
    hour: endHour,
    minute: endMinute,
    amPm: endAmPm,
  } = parseDateTime(event.end_datetime.toString());

  // Initialize form
  const form = useForm({
    schema: UpdateFormSchema,
    defaultValues: {
      name: event.name || "",
      description: event.description || "",
      location: event.location || "",
      tag: event.tag,
      date: date,
      endDate: endDate,
      dues_paying: event.dues_paying,
      hackathonId: event.hackathonId,
      hackathonName:
        hackathons?.find((v) => {
          return v.id == event.hackathonId;
        })?.displayName ?? null,
      startHour: startHour,
      startMinute: startMinute,
      startAmPm: startAmPm as "AM" | "PM",
      endHour: endHour,
      endMinute: endMinute,
      endAmPm: endAmPm as "AM" | "PM",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setIsLoading(true);

    if (values.dues_paying && values.hackathonId) {
      toast.error("Hackathon events cannot require dues.");
      setIsLoading(false);
      return;
    }

    // Extract year, month, and day explicitly to construct a local Date object
    const [year, month, day] = values.date.split("-").map(Number);

    if (!year || !month || !day) {
      toast.error("Invalid date format.");
      setIsLoading(false);
      return;
    }

    // Convert start date + hour/minute/amPm to a valid Date object
    const finalStartDate = new Date(year, month - 1, day); // Months are 0-based in JS
    let hour24 = parseInt(values.startHour, 10) || 0;
    if (values.startAmPm === "PM" && hour24 < 12) {
      hour24 += 12;
    }
    if (values.startAmPm === "AM" && hour24 === 12) {
      hour24 = 0;
    }
    finalStartDate.setHours(hour24, parseInt(values.startMinute, 10) || 0);

    const [eyear, emonth, eday] = values.endDate.split("-").map(Number);
    if (!eyear || !emonth || !eday) {
      toast.error("Invalid end date format.");
      setIsLoading(false);
      return;
    }

    // Convert end date + hour/minute/amPm to a valid Date object
    const finalEndDate = new Date(eyear, emonth - 1, eday);
    let endHour24 = parseInt(values.endHour, 10) || 0;
    if (values.endAmPm === "PM" && endHour24 < 12) endHour24 += 12;
    if (values.endAmPm === "AM" && endHour24 === 12) endHour24 = 0;
    finalEndDate.setHours(endHour24, parseInt(values.endMinute, 10) || 0);

    // Ensure the end date is after the start date
    if (finalEndDate <= finalStartDate) {
      toast.error("End date must be after the start date.");
      setIsLoading(false);
      return;
    }

    // Make update call
    updateEvent.mutate({
      id: event.id,
      discordId: event.discordId,
      googleId: event.googleId,
      name: values.name,
      dues_paying: values.dues_paying,
      description: values.description,
      location: values.location,
      tag: values.tag,
      start_datetime: finalStartDate,
      end_datetime: finalEndDate,
      hackathonId: values.hackathonId == "none" ? null : values.hackathonId,
      hackathonName:
        hackathons?.find((v) => {
          return v.id == values.hackathonId;
        })?.displayName ?? null,
    });
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {/* Use an icon or text to trigger the dialog */}
        <Button variant="outline">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[70vh] overflow-y-auto sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px]">
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Update Event</DialogTitle>
              <DialogDescription>
                Update the details for the new event. Click update when you're
                done.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <FormLabel htmlFor="name" className="text-right">
                        Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="name"
                          placeholder="Enter event name"
                          {...field}
                          className="col-span-3"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tag"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <FormLabel htmlFor="tag" className="text-right">
                        Tag
                      </FormLabel>
                      <FormControl>
                        <Select
                          // Use defaultValue if the field already has a value
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select a tag" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EVENT_TAGS.map((tagOption) => (
                              <SelectItem key={tagOption} value={tagOption}>
                                {tagOption}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hackathon (pulls from Hackathon table) */}
              <FormField
                control={form.control}
                name="hackathonId"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <FormLabel htmlFor="tag" className="text-right">
                        Hackathon
                      </FormLabel>
                      <FormControl>
                        <Select
                          // Use defaultValue if the field already has a value
                          onValueChange={field.onChange}
                          defaultValue={field.value ? field.value : "none"}
                        >
                          <FormControl>
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select a tag" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem key="none" value="none">
                              None
                            </SelectItem>
                            {hackathons?.map((h) => (
                              <SelectItem key={h.id} value={h.id}>
                                {h.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Date</FormLabel>
                      <FormControl className="col-span-3">
                        <Input type="date" {...field} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Time (Hour, Minute, AM/PM) */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Start</Label>
                <div className="col-span-3 flex items-center space-x-2">
                  {/* Hour */}
                  <FormField
                    control={form.control}
                    name="startHour"
                    render={({ field }) => (
                      <FormItem className="mb-0">
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[80px]">
                                <SelectValue placeholder="HH" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {hours.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <span>:</span>

                  {/* Minute */}
                  <FormField
                    control={form.control}
                    name="startMinute"
                    render={({ field }) => (
                      <FormItem className="mb-0">
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[80px]">
                                <SelectValue placeholder="MM" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {minutes.map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* AM/PM */}
                  <FormField
                    control={form.control}
                    name="startAmPm"
                    render={({ field }) => (
                      <FormItem className="mb-0">
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[80px]">
                                <SelectValue placeholder="AM/PM" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {amPmOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* End Date — NEW */}
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">End Date</FormLabel>
                      <FormControl className="col-span-3">
                        <Input type="date" {...field} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Time (Hour, Minute, AM/PM) */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">End</Label>
                <div className="col-span-3 flex items-center space-x-2">
                  {/* Hour */}
                  <FormField
                    control={form.control}
                    name="endHour"
                    render={({ field }) => (
                      <FormItem className="mb-0">
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[80px]">
                                <SelectValue placeholder="HH" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {hours.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <span>:</span>

                  {/* Minute */}
                  <FormField
                    control={form.control}
                    name="endMinute"
                    render={({ field }) => (
                      <FormItem className="mb-0">
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[80px]">
                                <SelectValue placeholder="MM" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {minutes.map((m) => (
                                <SelectItem key={m} value={m}>
                                  {m}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* AM/PM */}
                  <FormField
                    control={form.control}
                    name="endAmPm"
                    render={({ field }) => (
                      <FormItem className="mb-0">
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[80px]">
                                <SelectValue placeholder="AM/PM" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {amPmOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <FormLabel htmlFor="location" className="text-right">
                        Location
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="location"
                          placeholder="Enter location"
                          {...field}
                          className="col-span-3"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <FormLabel htmlFor="description" className="text-right">
                        Description
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          id="description"
                          placeholder="Enter description..."
                          rows={4}
                          {...field}
                          className="col-span-3"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dues Paying */}
              <FormField
                control={form.control}
                name="dues_paying"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right">Dues Paying?</FormLabel>
                      <FormControl className="col-span-3">
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex flex-row justify-between">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  setIsOpen(false);
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <div className="flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Button type="submit">Update Event</Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
