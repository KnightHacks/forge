"use client";

import { useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";

import type { SelectEvent, InsertMember } from "@forge/db/schemas/knight-hacks"

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@forge/ui/dialog";
import {
    EVENT_FEEDBACK_HEARD,
    EVENT_FEEDBACK_SIMILAR_EVENT,
    EVENT_FEEDBACK_SLIDER_MINIMUM,
    EVENT_FEEDBACK_SLIDER_MAXIMUM,
    EVENT_FEEDBACK_SLIDER_STEP,
    EVENT_FEEDBACK_SLIDER_VALUE,
    EVENT_FEEDBACK_TEXT_ROWS,
} from "@forge/consts/knight-hacks"

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    useForm
} from "@forge/ui/form";
import { Button } from "@forge/ui/button";
import { Slider } from "@forge/ui/slider";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@forge/ui/select";
import { InsertEventFeedbackSchema } from "@forge/db/schemas/knight-hacks";
import { z } from "zod";

import { api } from "~/trpc/react";

export function EventFeedbackForm({
    event, member
}: { event: SelectEvent, member: InsertMember }) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const createFeedback = api.eventFeedback.createEventFeedback.useMutation({
        onSuccess() {
            toast.success("Feedback submitted successfully!");
        },
        onError() {
            toast.error("Oops! Something went wrong. Please try again later.");
        },
        onSettled() {
            setIsLoading(false);
        }
    });

    const form = useForm({
        schema: InsertEventFeedbackSchema.extend({
            memberId: z.string().nonempty(),
            eventId: z.string().nonempty(),
            overallEventRating: z.number().min(EVENT_FEEDBACK_SLIDER_MINIMUM).max(EVENT_FEEDBACK_SLIDER_MAXIMUM),
            funRating: z.number().min(EVENT_FEEDBACK_SLIDER_MINIMUM).max(EVENT_FEEDBACK_SLIDER_MAXIMUM),
            learnedRating: z.number().min(EVENT_FEEDBACK_SLIDER_MINIMUM).max(EVENT_FEEDBACK_SLIDER_MAXIMUM),
            heardAboutUs: z.enum(EVENT_FEEDBACK_HEARD),
            additionalFeedback: z.string(),
            similarEvent: z.enum(EVENT_FEEDBACK_SIMILAR_EVENT)
        }),
        defaultValues: {
            memberId: member.id,
            eventId: event.id,
            additionalFeedback: "",
        },
    });

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <MessageCircle className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>Your Feedback For {event.name}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit((values) => {
                                setIsLoading(true);
                                createFeedback.mutate({
                                    memberId: values.memberId,
                                    eventId: values.eventId,
                                    overallEventRating: values.overallEventRating,
                                    funRating: values.funRating,
                                    learnedRating: values.learnedRating,
                                    heardAboutUs: values.heardAboutUs,
                                    additionalFeedback: values.additionalFeedback,
                                    similarEvent: values.similarEvent,
                                });
                            })}
                            noValidate
                        >
                        <div className="flex flex-col gap-5 mt-5">
                            {/*  Slider for general rating of event */}
                            <FormField
                                control={form.control}
                                name="overallEventRating"
                                render={({ field }) => (
                                    <FormItem className="text-center">
                                        <FormLabel>How would you rate this event overall?</FormLabel>
                                        <FormControl>
                                            <Slider
                                                min={EVENT_FEEDBACK_SLIDER_MINIMUM}
                                                max={EVENT_FEEDBACK_SLIDER_MAXIMUM}
                                                step={EVENT_FEEDBACK_SLIDER_STEP}
                                                onValueChange={field.onChange}
                                                value={[EVENT_FEEDBACK_SLIDER_VALUE]}
                                                className="w-1/2 mx-auto"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/*  Slider for fun rating of the event */}
                            <FormField
                                control={form.control}
                                name="funRating"
                                render={({ field }) => (
                                    <FormItem className="text-center">
                                        <FormLabel>How much fun did you have?</FormLabel>
                                        <FormControl>
                                            <Slider
                                                min={EVENT_FEEDBACK_SLIDER_MINIMUM}
                                                max={EVENT_FEEDBACK_SLIDER_MAXIMUM}
                                                step={EVENT_FEEDBACK_SLIDER_STEP}
                                                onValueChange={field.onChange}
                                                value={[EVENT_FEEDBACK_SLIDER_VALUE]}
                                                className="w-1/2 mx-auto"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* Slider for rating of how much you learned */}
                            <FormField
                                control={form.control}
                                name="learnedRating"
                                render={({ field }) => (
                                    <FormItem className="text-center">
                                        <FormLabel>How much did you learn?</FormLabel>
                                        <FormControl>
                                            <Slider
                                                min={EVENT_FEEDBACK_SLIDER_MINIMUM}
                                                max={EVENT_FEEDBACK_SLIDER_MAXIMUM}
                                                step={EVENT_FEEDBACK_SLIDER_STEP}
                                                onValueChange={field.onChange}
                                                value={[EVENT_FEEDBACK_SLIDER_VALUE]}
                                                className="w-1/2 mx-auto"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* Dropdown for where you heard about us */}
                            <FormField
                                control={form.control}
                                name="heardAboutUs"
                                render={({ field }) => (
                                    <FormItem className="text-center">
                                        <FormLabel>Where did you hear about us?</FormLabel>
                                        <FormControl>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                            <FormControl>
                                                <SelectTrigger className="w-1/2 mx-auto">
                                                    <SelectValue placeholder="Select a place..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {EVENT_FEEDBACK_HEARD.map((place) => (
                                                    <SelectItem key={place} value={place}>
                                                        {place}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            { /* Text field for additional feedback */}
                            <FormField
                                control={form.control}
                                name="additionalFeedback"
                                render={({ field }) => (
                                    <FormItem className="text-center">
                                        <FormLabel>Do you have any additional feedback about this event?</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                id="additionalFeedback"
                                                placeholder="Enter additional feedback..."
                                                rows={EVENT_FEEDBACK_TEXT_ROWS}
                                                {...field}

                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* Toggle button for similar event */}
                            <FormField
                                control={form.control}
                                name="similarEvent"
                                render={({ field }) => (
                                    <FormItem className="text-center">
                                        <FormLabel>Would you like to see similar events to this one?</FormLabel>
                                        <FormControl>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="w-1/2 mx-auto">
                                                        <SelectValue placeholder="Select an option..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {EVENT_FEEDBACK_SIMILAR_EVENT.map((option) => (
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
                        <DialogFooter className="flex flex-row justify-between mt-5">
                            <Button
                                variant="outline"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setIsOpen(false);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">
                                {isLoading ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    "Submit"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}