"use client";

// import { useState } from "react";
// import { QrReader } from "react-qr-reader";
// import { z } from "zod";

// import { HACKER_CLASSES } from "@forge/db/schemas/knight-hacks";
// import { Button } from "@forge/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@forge/ui/dialog";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
//   useForm,
// } from "@forge/ui/form";
// import { toast } from "@forge/ui/toast";

// import { api } from "~/trpc/react";
// import ToggleButton from "./toggle-button";

// interface CodeScanningProps {
//   processingScan?: boolean;
// }

const HackerScanner = () => {
  // const { data: hackathons } = api.hackathon.getHackathons.useQuery();
  // const [open, setOpen] = useState(false);
  // const [openPersistentDialog, setOpenPersistentDialog] = useState(false);
  // const [firstName, setFirstName] = useState("");
  // const [lastName, setLastName] = useState("");
  // const [assignedClass, setAssignedClass] = useState("");
  // const [checkInMessage, setCheckInMessage] = useState("");
  // const [checkInMessageColor, setCheckInMessageColor] = useState("");
  // const checkIn = api.hackathon.hackathonCheckIn.useMutation({
  //   onSuccess(opts) {
  //     if (!opts) {
  //       toast.success("Hacker Checked in Successfully!");
  //       return;
  //     }
  //     toast.success(opts.message);
  //     setFirstName(opts.firstName);
  //     setLastName(opts.lastName);
  //     setAssignedClass(opts.class ?? "No class assigned");
  //     setCheckInMessage(opts.messageforHackers);
  //     setCheckInMessageColor(opts.color);
  //     setOpenPersistentDialog(true);
  //   },
  //   onError(opts) {
  //     toast.error(opts.message, {
  //       icon: "⚠️",
  //     });
  //   },
  // });
  // const AssignedClassCheckinSchema = z.union([
  //   z.literal("All"),
  //   z.literal("Checking into the Hackathon"),
  //   z.enum(HACKER_CLASSES),
  // ]);
  // const form = useForm({
  //   schema: z.object({
  //     userId: z.string(),
  //     hackathonId: z.string(),
  //     assignedClassCheckin: AssignedClassCheckinSchema,
  //   }),
  //   defaultValues: {
  //     hackathonId: "",
  //     userId: "",
  //     assignedClassCheckin: "Checking into the Hackathon",
  //   },
  // });

  // const closeModal = () => {
  //   setOpen(false);
  //   window.location.reload();
  // };

  return (
    <div className="">
      nothing here
      {/* <Dialog open={open}>
        <DialogTrigger asChild>
          <Button onClick={() => setOpen(true)} size="lg" className="gap-2">
            <span>Check In Hacker</span>
          </Button>
        </DialogTrigger>
        <DialogContent
          className={`h-auto w-full [&>button:last-child]:hidden ${openPersistentDialog ? "overflow-hidden" : "overflow-y-auto"}`}
        >
          <DialogHeader>
            <DialogTitle className="absolute text-lg">
              Check In Hacker
            </DialogTitle>
          </DialogHeader>
          <div className="">
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
                    setTimeout(() => (scanProps.processingScan = false), 6000);
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
                      >
                        <option value="" disabled>
                          Select a class
                        </option>
                        <option key="All" value="All">
                          All
                        </option>
                        <option
                          key="Checking into the Hackathon"
                          value="Checking into the Hackathon"
                        >
                          Checking into the Hackathon
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
              <ToggleButton />
            </form>
          </Form>
          <div className="mt-2 flex space-x-2">
            <Button onClick={() => closeModal()} className="w-full">
              Close
            </Button>
          </div>
          {openPersistentDialog && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black text-center text-white">
              <div className="mb-8 flex flex-col items-center gap-10 lg:gap-14">
                <div className="text-xl font-bold">Class: {assignedClass}</div>
                <div className="text-4xl font-bold">{firstName}</div>
                <div className="text-4xl font-bold">{lastName}</div>
                <div
                  className={`px-5 text-xl font-bold ${checkInMessageColor}`}
                >
                  {checkInMessage}
                </div>
              </div>
              <Button
                className="absolute bottom-4 mb-2 px-8 py-2 font-bold"
                onClick={() => setOpenPersistentDialog(false)}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog> */}
    </div>
  );
};

export default HackerScanner;
