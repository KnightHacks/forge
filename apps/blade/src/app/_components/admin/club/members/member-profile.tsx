"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { FaGithub, FaGlobe, FaLinkedin } from "react-icons/fa";

import type { InsertMember } from "@forge/db/schemas/knight-hacks";
import { FORMS, GUILD } from "@forge/consts";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import { api } from "~/trpc/react";

export default function MemberProfileButton({
  member,
}: {
  member: InsertMember;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const utils = api.useUtils();
  useEffect(() => {
    async function invalidateMembers() {
      await utils.member.invalidate();
    }

    invalidateMembers().catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Error invalidating members in member profile: ", error);
    });
  }, [utils.member, member]);

  const memberSince = new Date(member.dateCreated ?? new Date());
  memberSince.setDate(memberSince.getDate() + 1);
  const memberGradDate = new Date(member.gradDate);
  const dateOfBirth = new Date(member.dob);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <User className="h-5 w-5" />
        </Button>
      </DialogTrigger>

      <DialogContent
        aria-describedby={undefined}
        className="max-h-screen overflow-y-scroll break-all"
      >
        <DialogHeader className="flex flex-col">
          <DialogTitle className="text-center text-3xl">
            {member.firstName} {member.lastName}
          </DialogTitle>
          <p className="m-0 p-0 text-center text-sm">
            Member since {memberSince.getMonth() + 1}/{memberSince.getDate()}/
            {memberSince.getFullYear()}
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">General Information</h1>
            <div>
              <p>
                <b className="text-gray-400">Points:</b> {member.points}
              </p>
              <p>
                <b className="text-gray-400">Shirt Size:</b> {member.shirtSize}
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
                <b className="text-gray-400">Email:</b> {member.email}
              </p>
              <p>
                <b className="text-gray-400">Phone Number:</b>{" "}
                {member.phoneNumber
                  ? member.phoneNumber
                  : "Phone number not provided."}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">School Information</h1>
            <div>
              <p>
                <b className="text-gray-400">School:</b> {member.school}
              </p>
              <p>
                <b className="text-gray-400">Level Of Study:</b>{" "}
                {member.levelOfStudy === FORMS.LEVELS_OF_STUDY[2] // Undergraduate University (2 year - community college or similar)
                  ? FORMS.SHORT_LEVELS_OF_STUDY[0] // Undergraduate University (2 year)
                  : member.levelOfStudy === FORMS.LEVELS_OF_STUDY[4] // Graduate University (Masters, Professional, Doctoral, etc)
                    ? FORMS.SHORT_LEVELS_OF_STUDY[1] // Graduate University (Masters/PhD)
                    : member.levelOfStudy === FORMS.LEVELS_OF_STUDY[6] // Other Vocational / Trade Program or Apprenticeship
                      ? FORMS.SHORT_LEVELS_OF_STUDY[2] // Vocational/Trade School
                      : member.levelOfStudy}
              </p>
              <p>
                <b className="text-gray-400">Graduation Date:</b>{" "}
                {memberGradDate.getMonth() + 1}/{memberGradDate.getDate() + 1}/
                {memberGradDate.getFullYear()}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">Demographic Information</h1>
            <div>
              <p>
                <b className="text-gray-400">Gender:</b> {member.gender}
              </p>
              <p>
                <b className="text-gray-400">Race Or Ethnicity:</b>{" "}
                {member.raceOrEthnicity === FORMS.RACES_OR_ETHNICITIES[4] // Native Hawaiian or Other Pacific Islander
                  ? FORMS.SHORT_RACES_AND_ETHNICITIES[0] // Native Hawaiian/Pacific Islander
                  : member.raceOrEthnicity === FORMS.RACES_OR_ETHNICITIES[2] // Hispanic / Latino / Spanish Origin
                    ? FORMS.SHORT_RACES_AND_ETHNICITIES[1] // Hispanic/Latino
                    : member.raceOrEthnicity === FORMS.RACES_OR_ETHNICITIES[5] // Native American or Alaskan Native
                      ? FORMS.SHORT_RACES_AND_ETHNICITIES[2] // Native American/Alaskan Native
                      : member.raceOrEthnicity}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-xl font-bold">Social Information</h1>
            <div className="flex flex-row justify-center gap-4 pt-2">
              <div>
                {member.githubProfileUrl ? (
                  <Link href={member.githubProfileUrl} target="_blank">
                    <FaGithub size={GUILD.MEMBER_PROFILE_ICON_SIZE} />
                  </Link>
                ) : (
                  <FaGithub
                    size={GUILD.MEMBER_PROFILE_ICON_SIZE}
                    color="gray"
                  />
                )}
              </div>
              <div>
                {member.linkedinProfileUrl ? (
                  <Link href={member.linkedinProfileUrl} target="_blank">
                    <FaLinkedin size={GUILD.MEMBER_PROFILE_ICON_SIZE} />
                  </Link>
                ) : (
                  <FaLinkedin
                    size={GUILD.MEMBER_PROFILE_ICON_SIZE}
                    color="gray"
                  />
                )}
              </div>
              <div>
                {member.websiteUrl ? (
                  <Link href={member.websiteUrl} target="_blank">
                    <FaGlobe size={GUILD.MEMBER_PROFILE_ICON_SIZE} />
                  </Link>
                ) : (
                  <FaGlobe size={GUILD.MEMBER_PROFILE_ICON_SIZE} color="gray" />
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
