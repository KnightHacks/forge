"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { InsertJudgedSubmissionSchema } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Slider } from "@forge/ui/slider";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

const RUBRIC_SLIDER_MINIMUM = 1;
const RUBRIC_SLIDER_MAXIMUM = 10;
const RUBRIC_SLIDER_STEP = 1;

export function RubricForm({
  submissionId,
  judgeId,
  projectName,
  size,
}: {
  submissionId: string;
  judgeId: string;
  projectName: string;
  size: "md" | "sm" | "lg" | "icon" | null | undefined;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [originalityValue, setOriginalityValue] = useState(5);
  const [designValue, setDesignValue] = useState(5);
  const [technicalValue, setTechnicalValue] = useState(5);
  const [implementationValue, setImplementationValue] = useState(5);
  const [wowFactorValue, setWowFactorValue] = useState(5);

  const utils = api.useUtils();

  interface CustomError {
    data: {
      code: string;
    } | null;
    message: string;
  }

  const createRubric = api.judge.createJudgedSubmission.useMutation({
    async onSuccess() {
      toast.success("Rubric submitted successfully!");
      setIsOpen(false);
      await utils.judge.invalidate();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError(error: any) {
      if (!(error as CustomError).data) {
        toast.error("Submission failed, contact an adminstrator");
      }
      if ((error as CustomError).data?.code === "FORBIDDEN") {
        toast.error(
          "You cannot give rubric more than once for this submission!",
        );
      } else if ((error as CustomError).data?.code === "NOT_FOUND") {
        toast.error("Cannot find submission/judge!");
      } else if ((error as CustomError).data?.code === "CONFLICT") {
        toast.error("You've already judged this submission!");
      } else if ((error as CustomError).message) {
        toast.error(`Error: ${(error as CustomError).message}`);
      } else {
        toast.error("Oops! Something went wrong. Please try again later.");
      }
    },
    onSettled() {
      setIsLoading(false);
    },
  });

  const form = useForm({
    schema: InsertJudgedSubmissionSchema.omit({
      hackathonId: true,
      id: true,
    }).extend({
      publicFeedback: z.string().min(1, "Public feedback is required"),
      privateFeedback: z.string().min(1, "Private feedback is required"),
    }),
    defaultValues: {
      submissionId,
      judgeId,
      originality_rating: 5,
      design_rating: 5,
      technical_understanding_rating: 5,
      implementation_rating: 5,
      wow_factor_rating: 5,
      publicFeedback: "",
      privateFeedback: "",
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={size}>
          Rubric
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[80vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-center">{projectName}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => {
              setIsLoading(true);
              createRubric.mutate({
                submissionId: values.submissionId,
                judgeId: values.judgeId,
                originality_rating: values.originality_rating,
                design_rating: values.design_rating,
                technical_understanding_rating:
                  values.technical_understanding_rating,
                implementation_rating: values.implementation_rating,
                wow_factor_rating: values.wow_factor_rating,
                publicFeedback: values.publicFeedback,
                privateFeedback: values.privateFeedback,
              });
            })}
            noValidate
          >
            <div className="mt-5 flex flex-col gap-5">
              {/* Originality Rating */}
              <FormField
                control={form.control}
                name="originality_rating"
                render={({ field }) => (
                  <FormItem className="text-center">
                    <FormLabel>
                      How original and creative is this project?
                    </FormLabel>
                    <FormControl>
                      <div className="flex flex-row justify-center gap-2">
                        <p className="font-bold">1</p>
                        <Slider
                          min={RUBRIC_SLIDER_MINIMUM}
                          max={RUBRIC_SLIDER_MAXIMUM}
                          step={RUBRIC_SLIDER_STEP}
                          onValueChange={(value) => {
                            field.onChange(value[0]);
                            setOriginalityValue(value[0] ?? 5);
                          }}
                          value={[originalityValue]}
                          className="w-1/2"
                        />
                        <p className="font-bold">10</p>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Design Rating */}
              <FormField
                control={form.control}
                name="design_rating"
                render={({ field }) => (
                  <FormItem className="text-center">
                    <FormLabel>
                      How well-designed is the user interface and user
                      experience?
                    </FormLabel>
                    <FormControl>
                      <div className="flex flex-row justify-center gap-2">
                        <p className="font-bold">1</p>
                        <Slider
                          min={RUBRIC_SLIDER_MINIMUM}
                          max={RUBRIC_SLIDER_MAXIMUM}
                          step={RUBRIC_SLIDER_STEP}
                          onValueChange={(value) => {
                            field.onChange(value[0]);
                            setDesignValue(value[0] ?? 5);
                          }}
                          value={[designValue]}
                          className="w-1/2"
                        />
                        <p className="font-bold">10</p>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Technical Understanding Rating */}
              <FormField
                control={form.control}
                name="technical_understanding_rating"
                render={({ field }) => (
                  <FormItem className="text-center">
                    <FormLabel>
                      How well does the team demonstrate technical
                      understanding?
                    </FormLabel>
                    <FormControl>
                      <div className="flex flex-row justify-center gap-2">
                        <p className="font-bold">1</p>
                        <Slider
                          min={RUBRIC_SLIDER_MINIMUM}
                          max={RUBRIC_SLIDER_MAXIMUM}
                          step={RUBRIC_SLIDER_STEP}
                          onValueChange={(value) => {
                            field.onChange(value[0]);
                            setTechnicalValue(value[0] ?? 5);
                          }}
                          value={[technicalValue]}
                          className="w-1/2"
                        />
                        <p className="font-bold">10</p>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Implementation Rating */}
              <FormField
                control={form.control}
                name="implementation_rating"
                render={({ field }) => (
                  <FormItem className="text-center">
                    <FormLabel>
                      How well-executed is the implementation and functionality?
                    </FormLabel>
                    <FormControl>
                      <div className="flex flex-row justify-center gap-2">
                        <p className="font-bold">1</p>
                        <Slider
                          min={RUBRIC_SLIDER_MINIMUM}
                          max={RUBRIC_SLIDER_MAXIMUM}
                          step={RUBRIC_SLIDER_STEP}
                          onValueChange={(value) => {
                            field.onChange(value[0]);
                            setImplementationValue(value[0] ?? 5);
                          }}
                          value={[implementationValue]}
                          className="w-1/2"
                        />
                        <p className="font-bold">10</p>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Wow Factor Rating */}
              <FormField
                control={form.control}
                name="wow_factor_rating"
                render={({ field }) => (
                  <FormItem className="text-center">
                    <FormLabel>How much did this project WOW you?</FormLabel>
                    <FormControl>
                      <div className="flex flex-row justify-center gap-2">
                        <p className="font-bold">1</p>
                        <Slider
                          min={RUBRIC_SLIDER_MINIMUM}
                          max={RUBRIC_SLIDER_MAXIMUM}
                          step={RUBRIC_SLIDER_STEP}
                          onValueChange={(value) => {
                            field.onChange(value[0]);
                            setWowFactorValue(value[0] ?? 5);
                          }}
                          value={[wowFactorValue]}
                          className="w-1/2"
                        />
                        <p className="font-bold">10</p>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Public Feedback */}
              <FormField
                control={form.control}
                name="publicFeedback"
                render={({ field }) => (
                  <FormItem className="pl-8 pr-8 text-center sm:p-0">
                    <FormLabel>
                      Feedback for the team
                      <span className="text-gray-400">
                        {" "}
                        &mdash;{" "}
                        <i>This feedback will be shared with the team</i>
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        id="public_feedback"
                        placeholder="Share constructive feedback with the team..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Private Feedback */}
              <FormField
                control={form.control}
                name="privateFeedback"
                render={({ field }) => (
                  <FormItem className="pl-8 pr-8 text-center sm:p-0">
                    <FormLabel>
                      Internal judge notes
                      <span className="text-gray-400">
                        {" "}
                        &mdash;{" "}
                        <i>This feedback is only visible to other judges</i>
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        id="private_feedback"
                        placeholder="Add internal notes for other judges..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="mt-5 flex flex-row justify-between">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  setIsOpen(false);
                }}
              >
                Cancel
              </Button>
              <div className="flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Button type="submit">Submit Evaluation</Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
