"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { z } from "zod";

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

// 12-hour-based hours (1–12), displayed as "01", "02", ..., "12"
const hours = Array.from({ length: 12 }, (_, i) =>
  (i + 1).toString().padStart(2, "0"),
);

// Minutes (00, 05, 10, ... , 55)
const minutes = Array.from({ length: 12 }, (_, i) =>
  (i * 5).toString().padStart(2, "0"),
);

const amPmOptions = ["AM", "PM"] as const;

export function CreateEventButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const utils = api.useUtils();

  // TRPC mutation
  const createEvent = api.event.createEvent.useMutation({
    onSuccess() {
      toast.success("Event created successfully!");

      // Close dialog & reset form
      setIsOpen(false);
      form.reset();
    },
    onError(opts) {
      toast.error(opts.message);
    },
    async onSettled() {
      await utils.event.invalidate();
      setIsLoading(false);
    },
  });

  // Initialize form with Zod schema
  const FormSchema = InsertEventSchema.omit({
    start_datetime: true,
    end_datetime: true,
    discordId: true,
    googleId: true,
  }).extend({
    date: z.string(),
    startHour: z.string(),
    startMinute: z.string(),
    startAmPm: z.enum(["AM", "PM"]),
    endHour: z.string(),
    endMinute: z.string(),
    endAmPm: z.enum(["AM", "PM"]),
  });

  const form = useForm({
    schema: FormSchema,
    defaultValues: {
      name: "",
      description: "",
      dues_paying: false,
      location: "",
      tag: EVENT_TAGS[0],
      date: "",
      startHour: "",
      startMinute: "",
      startAmPm: "PM",
      endHour: "",
      endMinute: "",
      endAmPm: "PM",
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create Event
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[70vh] overflow-y-auto sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px]">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => {
              setIsLoading(true);
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
              finalStartDate.setHours(
                hour24,
                parseInt(values.startMinute, 10) || 0,
              );

              // Convert end date + hour/minute/amPm to a valid Date object
              const finalEndDate = new Date(year, month - 1, day); // Construct date in local time
              let endHour24 = parseInt(values.endHour, 10) || 0;
              if (values.endAmPm === "PM" && endHour24 < 12) {
                endHour24 += 12;
              }
              if (values.endAmPm === "AM" && endHour24 === 12) {
                endHour24 = 0;
              }
              finalEndDate.setHours(
                endHour24,
                parseInt(values.endMinute, 10) || 0,
              );

              // Ensure the end date is after the start date
              if (finalEndDate <= finalStartDate) {
                toast.error("End date must be after the start date.");
                setIsLoading(false);
                return;
              }

              // Pass the final date/time to TRPC
              createEvent.mutate({
                name: values.name,
                description: values.description,
                location: values.location,
                dues_paying: values.dues_paying,
                tag: values.tag,
                start_datetime: finalStartDate,
                end_datetime: finalEndDate,
              });
            })}
            noValidate
          >
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
              <DialogDescription>
                Fill in the details for the new event. Click create when you're
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

              {/* Tag (enum from EVENT_TAGS) */}
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

              {/* Date (Calendar popover) */}
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
                      <FormControl>
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

            <DialogFooter>
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Button type="submit">Create Event</Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
