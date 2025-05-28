"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { FaGithub, FaGlobe, FaLinkedin } from "react-icons/fa";

import type { InsertHacker } from "@forge/db/schemas/knight-hacks";
import {
  LEVELS_OF_STUDY,
  MEMBER_PROFILE_ICON_SIZE,
  RACES_OR_ETHNICITIES,
  SHORT_LEVELS_OF_STUDY,
  SHORT_RACES_AND_ETHNICITIES,
} from "@forge/consts/knight-hacks";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import { api } from "~/trpc/react";

export default function HackerProfileButton({
  hacker,
}: {
  hacker: InsertHacker;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const utils = api.useUtils();
  useEffect(() => {
    async function invalidateHackers() {
      await utils.hacker.invalidate();
    }

    invalidateHackers().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Error invalidating hackers in hacker profile: ", error);
    });
  }, [utils.hacker, hacker]);

  const hackingSince = new Date(hacker.dateCreated ?? new Date());
  hackingSince.setDate(hackingSince.getDate() + 1);
  const hackerGradDate = new Date(hacker.gradDate);
  const dateOfBirth = new Date(hacker.dob);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <User className="h-5 w-5" />
        </Button>
      </DialogTrigger>

      <DialogContent
        aria-describedby={undefined}
        className="max-h-screen overflow-y-scroll break-words"
      >
        <DialogHeader className="flex flex-col">
          <DialogTitle className="text-center text-3xl">
            {hacker.firstName} {hacker.lastName}
          </DialogTitle>
          <p className="m-0 p-0 text-center text-sm">
            Hacking since {hackingSince.getMonth() + 1}/{hackingSince.getDate()}
            /{hackingSince.getFullYear()}
          </p>
          {hacker.isFirstTime ||
          hacker.agreesToReceiveEmailsFromMLH ||
          hacker.foodAllergies ? (
            <div className="inline-flex flex-row justify-center gap-2">
              {hacker.foodAllergies && (
                <Badge className="order-1 my-auto bg-red-800 text-center text-white">
                  FOOD RESTRICTIONS
                </Badge>
              )}
              {hacker.agreesToReceiveEmailsFromMLH && (
                <Badge className="order-2 my-auto bg-blue-800 text-center text-white">
                  MLH EMAILS
                </Badge>
              )}
              {hacker.isFirstTime && (
                <Badge className="order-3 my-auto bg-purple-800 text-center text-white">
                  FIRST TIME HACKER
                </Badge>
              )}
            </div>
          ) : null}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">General Information</h1>
            <div>
              <p>
                <b className="text-gray-400">Shirt Size:</b> {hacker.shirtSize}
              </p>
              <p>
                <b className="text-gray-400">Date Of Birth:</b>{" "}
                {dateOfBirth.getMonth() + 1}/{dateOfBirth.getDate() + 1}/
                {dateOfBirth.getFullYear()}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">Contact Information</h1>
            <div>
              <p>
                <b className="text-gray-400">Email:</b> {hacker.email}
              </p>
              <p>
                <b className="text-gray-400">Phone Number:</b>{" "}
                {hacker.phoneNumber
                  ? hacker.phoneNumber
                  : "Phone number not provided."}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">School Information</h1>
            <div>
              <p>
                <b className="text-gray-400">School:</b> {hacker.school}
              </p>
              <p>
                <b className="text-gray-400">Level Of Study:</b>{" "}
                {hacker.levelOfStudy === LEVELS_OF_STUDY[2] // Undergraduate University (2 year - community college or similar)
                  ? SHORT_LEVELS_OF_STUDY[0] // Undergraduate University (2 year)
                  : hacker.levelOfStudy === LEVELS_OF_STUDY[4] // Graduate University (Masters, Professional, Doctoral, etc)
                    ? SHORT_LEVELS_OF_STUDY[1] // Graduate University (Masters/PhD)
                    : hacker.levelOfStudy === LEVELS_OF_STUDY[6] // Other Vocational / Trade Program or Apprenticeship
                      ? SHORT_LEVELS_OF_STUDY[2] // Vocational/Trade School
                      : hacker.levelOfStudy}
              </p>
              <p>
                <b className="text-gray-400">Graduation Date:</b>{" "}
                {hackerGradDate.getMonth() + 1}/{hackerGradDate.getDate() + 1}/
                {hackerGradDate.getFullYear()}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">Demographic Information</h1>
            <div>
              <p>
                <b className="text-gray-400">Gender:</b> {hacker.gender}
              </p>
              <p>
                <b className="text-gray-400">Race Or Ethnicity:</b>{" "}
                {hacker.raceOrEthnicity === RACES_OR_ETHNICITIES[4] // Native Hawaiian or Other Pacific Islander
                  ? SHORT_RACES_AND_ETHNICITIES[0] // Native Hawaiian/Pacific Islander
                  : hacker.raceOrEthnicity === RACES_OR_ETHNICITIES[2] // Hispanic / Latino / Spanish Origin
                    ? SHORT_RACES_AND_ETHNICITIES[1] // Hispanic/Latino
                    : hacker.raceOrEthnicity === RACES_OR_ETHNICITIES[5] // Native American or Alaskan Native
                      ? SHORT_RACES_AND_ETHNICITIES[2] // Native American/Alaskan Native
                      : hacker.raceOrEthnicity}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-xl font-bold">Social Information</h1>
            <div className="flex flex-row justify-center gap-4 pt-2">
              <div>
                {hacker.githubProfileUrl ? (
                  <Link href={hacker.githubProfileUrl} target="_blank">
                    <FaGithub size={MEMBER_PROFILE_ICON_SIZE} />
                  </Link>
                ) : (
                  <FaGithub size={MEMBER_PROFILE_ICON_SIZE} color="gray" />
                )}
              </div>
              <div>
                {hacker.linkedinProfileUrl ? (
                  <Link href={hacker.linkedinProfileUrl} target="_blank">
                    <FaLinkedin size={MEMBER_PROFILE_ICON_SIZE} />
                  </Link>
                ) : (
                  <FaLinkedin size={MEMBER_PROFILE_ICON_SIZE} color="gray" />
                )}
              </div>
              <div>
                {hacker.websiteUrl ? (
                  <Link href={hacker.websiteUrl} target="_blank">
                    <FaGlobe size={MEMBER_PROFILE_ICON_SIZE} />
                  </Link>
                ) : (
                  <FaGlobe size={MEMBER_PROFILE_ICON_SIZE} color="gray" />
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
