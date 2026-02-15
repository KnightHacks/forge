"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CircleCheckBig, Loader2 } from "lucide-react";

import { CLUB } from "@forge/consts";
import { HACKATHON_TEMPLATE_IDS } from "@forge/email/client";
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
import { Input } from "@forge/ui/input";
import { toast } from "@forge/ui/toast";

import type { api as serverCall } from "~/trpc/server";
import { HACKER_STATUS_MAP } from "~/consts";
import { api } from "~/trpc/react";
import ConfirmWithTOS from "./confirm-button";
import { HackerQRCodePopup } from "./hacker-qr-button";

type StatusKey = keyof typeof HACKER_STATUS_MAP | null | undefined;

export function HackerData({
  data,
}: {
  data: Awaited<ReturnType<(typeof serverCall.hacker)["getHacker"]>>;
}) {
  const [hackerStatus, setHackerStatus] = useState<string | null>("");
  const [hackerStatusColor, setHackerStatusColor] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: currentHackathon } =
    api.hackathon.getCurrentHackathon.useQuery();

  const { data: hacker, isError } = api.hacker.getHacker.useQuery(
    {},
    {
      initialData: data,
    },
  );

  const { data: hackathonData } = api.hackathon.getHackathon.useQuery({
    hackathonName: undefined,
  });

  const { data: numConfirmed } = api.hackathon.getNumConfirmed.useQuery({
    hackathonId: currentHackathon?.id ?? "",
  });

  const sendEmail = api.email.sendEmail.useMutation({
    onSuccess: () => {
      toast.success("You're Confirmed!");
    },
    onError: (opts) => {
      toast.error(opts.message);
    },
  });

  const utils = api.useUtils();

  const handleConfirm = () => {
    setLoading(true);
    confirmHacker.mutate({
      id: hacker?.id ?? "",
    });

    if (!hacker || !currentHackathon?.displayName) return;

    sendEmail.mutate({
      from: "donotreply@knighthacks.org",
      to: hacker.email,
      subject: `See you at ${currentHackathon.displayName}!`,
      template_id: HACKATHON_TEMPLATE_IDS.Confirmation,
      data: {
        name: hacker.firstName,
        hackathon: currentHackathon.displayName,
      },
    });
  };

  const handleWithdraw = () => {
    setLoading(true);
    withdrawHacker.mutate({
      id: hacker?.id ?? "",
    });
  };

  function getStatusName(status: StatusKey) {
    if (!status) return "";
    return HACKER_STATUS_MAP[status].name;
  }

  function getStatusColor(status: StatusKey) {
    if (!status) return "";
    return HACKER_STATUS_MAP[status].color;
  }

  const confirmHacker = api.hacker.confirmHacker.useMutation({
    async onSuccess() {
      setHackerStatus("Confirmed");
      setHackerStatusColor(getStatusColor("confirmed"));
      setIsConfirmOpen(true);
      await utils.hacker.getHacker.invalidate();
    },
    onError() {
      toast.error("Oops! Something went wrong. Please try again later.");
    },
    onSettled() {
      setLoading(false);
    },
  });

  const withdrawHacker = api.hacker.withdrawHacker.useMutation({
    async onSuccess() {
      setHackerStatus("Withdrawn");
      setHackerStatusColor(getStatusColor("withdrawn"));
      toast.success("You have withdrawn from the hackathon!");
      await utils.hacker.getHacker.invalidate();
    },
    onError() {
      toast.error("Oops! Something went wrong. Please try again later.");
    },
    onSettled() {
      setLoading(false);
    },
  });

  useEffect(() => {
    setHackerStatus(getStatusName(hacker?.status));
    setHackerStatusColor(getStatusColor(hacker?.status));
  }, [hacker]);

  if (isError) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        Something went wrong. Please refresh and try again.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-wrap gap-x-8 gap-y-2 p-5 sm:gap-y-0 sm:p-7">
      <div className="animate-fade-in relative my-auto h-[7rem] w-32 overflow-hidden rounded-lg">
        <Image
          src="/tk-dashboard-img.svg"
          alt="Image of TK"
          fill
          style={{ objectFit: "contain" }}
          priority
          sizes="100%"
        />
      </div>
      <div className="flex flex-col justify-center gap-y-6">
        <div>
          {hacker?.firstName && hacker.lastName && (
            <div className="animate-fade-in pb-2 text-xl font-bold">
              Hello, {hacker.firstName} {hacker.lastName}
            </div>
          )}
          <div className="animate-fade-in text-lg font-bold">
            Status for {hackathonData?.displayName}
          </div>
          <div className="flex gap-x-2">
            <div
              className={`text-xl font-bold ${hackerStatusColor} animate-fade-in`}
            >
              {hackerStatus}
            </div>
            {hackerStatus === "Confirmed" && (
              <CircleCheckBig
                className="animate-fade-in mt-[2px]"
                color="#00C9A7"
              />
            )}
          </div>
        </div>
        {/* <div>
          <div className="animate-fade-in text-lg font-bold">Class</div>
          <div className="animate-fade-in text-xl font-bold text-black dark:text-white">
            TBD
          </div>
        </div> */}
      </div>
      <div className="mt-6 flex w-full items-center justify-center gap-x-1 sm:ml-7 md:mt-5 lg:mt-0">
        <HackerQRCodePopup />
        {/* Confirm Button */}

        {hackerStatus === "Accepted" &&
          hackathonData?.confirmationDeadline != null && (
            <ConfirmWithTOS
              isLoading={loading}
              hackathonData={hackathonData}
              handleConfirm={handleConfirm}
              numConfirmed={numConfirmed ?? 0}
            />
          )}

        <div>
          {hackathonData?.confirmationDeadline &&
            hackathonData.confirmationDeadline < new Date() && (
              <div className="w-full py-2 pl-4 text-center text-gray-500">
                The confirmation deadline has passed.
              </div>
            )}
        </div>

        {/* Confirm Dialog */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">
                Congratulations!
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-y-5 py-6">
              <Image
                src="/tk-dashboard-img.svg"
                alt="Image of TK"
                sizes="100px"
                style={{
                  width: "50%",
                  height: "auto",
                }}
                width={100}
                height={100}
              />
              <DialogDescription className="text-md text-center">
                You've successfully confirmed for the hackathon. We're excited
                to see you there!
              </DialogDescription>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button onClick={() => setIsConfirmOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Withdraw Button */}
        {hackerStatus === "Confirmed" && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="animate-fade-in sm:size-lg gap-2 !rounded-none !bg-destructive hover:!bg-destructive/80"
              >
                <span className="text-lg font-bold text-white">WITHDRAW</span>
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  You are about to withdraw from this hackathon. This action
                  cannot be undone. Please proceed with caution.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <p>
                  Please type <strong>"I am absolutely sure"</strong> to
                  confirm:
                </p>
                <Input
                  placeholder='Type "I am absolutely sure"'
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    toast.info("Please type in the text, do not paste.");
                  }}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    setConfirmationText("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={
                    (CLUB.USE_CAUTION as boolean)
                      ? confirmationText !== "I am absolutely sure" || loading
                      : loading
                  }
                  onClick={handleWithdraw}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Withdraw from this hackathon"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
