"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, PlusCircleIcon } from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@forge/ui/popover";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export function AddPoints({ type }: { type: "Member" | "Hacker" }) {
  const { data: activeHackathon } =
    api.hackathon.getCurrentHackathon.useQuery();

  const { data: users } =
    type == "Hacker"
      ? api.hacker.getAllHackers.useQuery(
          { hackathonName: activeHackathon?.name },
          { enabled: !!activeHackathon },
        )
      : api.member.getMembers.useQuery();

  const [selectedUser, setselectedUser] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState(false);
  const [points, setPoints] = useState(0);

  const giveHackerPoints = api.hacker.giveHackerPoints.useMutation({
    onSuccess() {
      toast.success(
        `Gave ${points} points to ${selectedUser?.firstName} ${selectedUser?.lastName}`,
      );
      setselectedUser(null);
    },
    onError(opts) {
      toast.error(opts.message);
    },
  });
  const giveMemberPoints = api.member.giveMemberPoints.useMutation({
    onSuccess() {
      toast.success(
        `Gave ${points} points to ${selectedUser?.firstName} ${selectedUser?.lastName}`,
      );
      setselectedUser(null);
    },
    onError(opts) {
      toast.error(opts.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)} size="lg" className="gap-2">
          <span className="flex flex-row gap-2">
            <PlusCircleIcon />
            <span className="my-auto">Add {type} Points</span>
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="mb-4">
          <DialogTitle className="absolute">Add {type} Points</DialogTitle>
        </DialogHeader>
        <Popover open={openSub} onOpenChange={setOpenSub}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openSub}
              className="w-full justify-between"
            >
              {selectedUser
                ? `${selectedUser.firstName} ${selectedUser.lastName} (${selectedUser.email})`
                : `Select ${type.toLowerCase()}...`}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput
                placeholder={`Search ${type.toLowerCase() + "s"} by name or email...`}
              />
              <CommandList>
                <CommandEmpty>
                  No {type.toLowerCase() + "s"} found.
                </CommandEmpty>
                <CommandGroup>
                  {users?.map((hacker) => (
                    <CommandItem
                      key={hacker.id}
                      value={`${hacker.firstName} ${hacker.lastName} ${hacker.email}`}
                      onSelect={() => {
                        setselectedUser({
                          id: hacker.id,
                          firstName: hacker.firstName,
                          lastName: hacker.lastName,
                          email: hacker.email,
                        });
                        setOpenSub(false);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          selectedUser?.id === hacker.id
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
        <Label htmlFor="points" className="-mb-2">
          Points
        </Label>
        <div className="flex flex-row gap-2">
          <Input
            id="points"
            type="number"
            placeholder="Amount of points to give"
            onChange={(e) => {
              setPoints(Number.parseInt(e.target.value));
            }}
          />
          <Button
            disabled={!selectedUser || !points}
            onClick={() =>
              type == "Hacker"
                ? giveHackerPoints.mutate({
                    amount: points,
                    id: selectedUser?.id ?? "",
                    hackathonName: activeHackathon?.name ?? "",
                  })
                : giveMemberPoints.mutate({
                    amount: points,
                    id: selectedUser?.id ?? "",
                  })
            }
          >
            Give Points
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
