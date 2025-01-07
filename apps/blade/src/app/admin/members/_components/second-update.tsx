import { useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import type { InsertMember } from "@forge/db/schemas/knight-hacks";
import {
  GENDERS,
  LEVELS_OF_STUDY,
  RACES_OR_ETHNICITIES,
  SCHOOLS,
  SHIRT_SIZES,
} from "@forge/consts/knight-hacks";
import { InsertMemberSchema } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
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
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export default function SecondUpdateFormButton({
  member,
  isLoad,
  setFirstOpen,
}: {
  member: InsertMember;
  isLoad: boolean;
  setFirstOpen: (value: boolean) => void;
}) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const utils = api.useUtils();

  const UpdateMemberSchema = InsertMemberSchema.omit({
    userId: true,
    age: true,
    resumeUrl: true,
    discordUser: true,
  }).extend({
    firstName: z.string().min(1, "Required"),
    lastName: z.string().min(1, "Required"),
    email: z.string().email("Invalid email").min(1, "Required"),
    points: z.string().transform((points) => Number(points)),
    phoneNumber: z
      .string()
      .regex(/^\d{10}|\d{3}-\d{3}-\d{4}$|^$/, "Invalid phone number"),
  });

  const secondForm = useForm({
    schema: UpdateMemberSchema,
    defaultValues: {
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      email: member.email || "",
      points: (member.points ?? 0).toString(),
      phoneNumber: member.phoneNumber || "",
      dob: member.dob || "",
      gender: member.gender,
      school: member.school,
      gradDate: member.gradDate,
      levelOfStudy: member.levelOfStudy,
      raceOrEthnicity: member.raceOrEthnicity,
      shirtSize: member.shirtSize,
      githubProfileUrl: member.githubProfileUrl ?? "",
      linkedinProfileUrl: member.linkedinProfileUrl ?? "",
      websiteUrl: member.websiteUrl ?? "",
    },
  });

  const updateMember = api.member.updateMember.useMutation({
    onSuccess() {
      toast.success("Member updated successfully!");
      setIsOpen(false);
      setFirstOpen(false);
    },
    onError(opts) {
      toast.error(opts.message);
    },
    async onSettled() {
      await utils.member.invalidate();
      setIsLoading(false);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="submit">
          {isLoad ? <Loader2 className="animate-spin" /> : "Next"}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <Form {...secondForm}>
          <form
            onSubmit={secondForm.handleSubmit((values) => {
              setIsLoading(true);

              updateMember.mutate({
                id: member.id,
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.email,
                points: member.points,
                dob: member.dob,
                phoneNumber: member.phoneNumber,
                school: values.school,
                levelOfStudy: values.levelOfStudy,
                gender: values.gender,
                gradDate: values.gradDate,
                raceOrEthnicity: values.raceOrEthnicity,
                shirtSize: values.shirtSize,
                githubProfileUrl: member.githubProfileUrl,
                linkedinProfileUrl: member.linkedinProfileUrl,
                websiteUrl: member.websiteUrl,
              });
            })}
          >
            <DialogHeader className="pb-4">
              <DialogTitle>Update Member</DialogTitle>
              <DialogDescription>
                Update member details. Confirm your changes when you're done.
              </DialogDescription>
            </DialogHeader>

            <div className="m-4 flex flex-col gap-6">
              <FormField
                control={secondForm.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-row gap-4">
                      <FormLabel className="my-auto whitespace-nowrap">
                        Gender
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GENDERS.map((gender) => (
                              <SelectItem key={gender} value={gender}>
                                {gender}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage className="my-auto whitespace-nowrap" />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={secondForm.control}
                name="school"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-row gap-4">
                      <FormLabel className="my-auto whitespace-nowrap">
                        School
                      </FormLabel>
                      <FormControl>
                        <ResponsiveComboBox
                          items={SCHOOLS}
                          renderItem={(school) => <div>{school}</div>}
                          getItemValue={(school) => school}
                          getItemLabel={(school) => school}
                          onItemSelect={(school) => field.onChange(school)}
                          buttonPlaceholder={member.school}
                          inputPlaceholder="Search for school"
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={secondForm.control}
                name="gradDate"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-row gap-4">
                      <FormLabel className="my-auto whitespace-nowrap">
                        Grad Date
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage className="my-auto whitespace-nowrap" />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={secondForm.control}
                name="levelOfStudy"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-row gap-4">
                      <FormLabel className="my-auto whitespace-nowrap">
                        Level Of Study
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="max-w-[300px] overflow-hidden truncate">
                              <SelectValue placeholder="Select level of study" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LEVELS_OF_STUDY.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage className="my-auto whitespace-nowrap" />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={secondForm.control}
                name="raceOrEthnicity"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-row gap-4">
                      <FormLabel className="my-auto whitespace-nowrap">
                        Race/Ethnicity
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="max-w-[300px] overflow-hidden truncate">
                              <SelectValue placeholder="Select race/ethnicity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RACES_OR_ETHNICITIES.map((value) => (
                              <SelectItem
                                key={value}
                                value={value}
                                className="max-w-[300px] overflow-hidden truncate"
                              >
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage className="my-auto whitespace-nowrap" />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={secondForm.control}
                name="shirtSize"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-row gap-4">
                      <FormLabel className="my-auto whitespace-nowrap">
                        Shirt Size
                      </FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select shirt size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SHIRT_SIZES.map((shirt_size) => (
                              <SelectItem key={shirt_size} value={shirt_size}>
                                {shirt_size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage className="whitespace-nowrap" />
                    </div>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="flex flex-row justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setFirstOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Update Member"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
