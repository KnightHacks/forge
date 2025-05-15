"use client";

import { useState } from "react";

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

import SecondClearDuesDialogButton from "./second-dues-dialog";

export default function ClearDuesButton() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Clear ALL Dues</Button>
      </DialogTrigger>

      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Are you sure?</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-md">
          <div className="space-y-4 py-2">
            <p>
              You are about to <b className="text-red-600">CLEAR ALL DUES.</b>{" "}
              This action is <b className="text-red-600">EXTREMELY</b>{" "}
              destructive and can result in several added hours of work.
              Mistakenly doing this can result in{" "}
              <b className="text-red-600">
                termination of your position at Knight Hacks.
              </b>
            </p>
            <div className="text-center">
              <b className="text-red-600">PLEASE proceed with caution.</b>
            </div>
          </div>
        </DialogDescription>
        <DialogFooter className="flex flex-row justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
            }}
          >
            Cancel
          </Button>
          <SecondClearDuesDialogButton
            firstOpen={isOpen}
            setFirstOpen={setIsOpen}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
