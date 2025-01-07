"use client";

import { useState, useEffect } from "react";
import type { InsertMember } from "@forge/db/schemas/knight-hacks";
import { Button } from "@forge/ui/button";
import { User } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@forge/ui/dialog";
  import { api } from "~/trpc/react";

export default function MemberProfileButton({ member }: { member: InsertMember }) {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const utils = api.useUtils();
    useEffect(() => {
        async function invalidateMembers() {
            await utils.member.invalidate();
        }

        invalidateMembers().catch((error) => {
            console.error("Error invalidating members in member profile: ", error);
        })
    }, [utils.member, member]);

    const memberSince = new Date(member.dateCreated ?? new Date());
    const memberGradDate = new Date(member.gradDate);
    const dateOfBirth = new Date(member.dob);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <User className="h-5 w-5" />
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader className="flex flex-col">
                    <DialogTitle 
                        className="text-center text-3xl"
                    >
                        {member.firstName} {member.lastName}
                    </DialogTitle>
                    <p className="text-sm text-center m-0 p-0">
                        Member since {" "}
                        {memberSince.getMonth()+1}/
                        {memberSince.getDate()+1}/
                        {memberSince.getFullYear()}
                    </p>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-xl font-bold">General Information</h1>
                        <div>
                            <p>
                                <b
                                    className="text-gray-400"
                                >
                                    Points: 
                                </b> {member.points}
                            </p>
                            <p>
                                <b
                                    className="text-gray-400"
                                >
                                    Shirt Size:
                                </b> {member.shirtSize}
                            </p>
                            <p>
                                <b
                                    className="text-gray-400"
                                >
                                    Date Of Birth:
                                </b> {dateOfBirth.getMonth()+1}/{dateOfBirth.getDate()+1}
                                /{dateOfBirth.getFullYear()}
                            </p>

                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-xl font-bold">Contact Information</h1>
                        <div>
                            <p>
                                <b className="text-gray-400"
                                >
                                    Email:
                                </b> {member.email}
                            </p>
                            <p>
                                <b 
                                    className="text-gray-400"
                                >
                                    Phone Number:
                                </b> {member.phoneNumber !== "" ?
                                        member.phoneNumber : "Phone number not provided"}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-xl font-bold">School Information</h1>
                        <div>
                            <p>
                                <b
                                    className="text-gray-400"
                                >
                                    School:
                                </b> {member.school}
                            </p>
                            <p>
                                <b
                                    className="text-gray-400"
                                >
                                    Level Of Study:
                                </b> {member.levelOfStudy}
                            </p>
                            <p>
                                <b
                                    className="text-gray-400"
                                >
                                    Graduation Date:
                                </b>{" "}
                                {memberGradDate.getMonth()+1}/{memberGradDate.getDate()+1}
                                /{memberGradDate.getFullYear()}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-xl font-bold">Demographic Information</h1>
                        <div>
                            <p>
                                <b
                                    className="text-gray-400"
                                >
                                    Gender:
                                </b> {member.gender}
                            </p>
                            <p>
                                <b
                                    className="text-gray-400"
                                >
                                    Race Or Ethnicity:
                                </b> {member.raceOrEthnicity}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-xl font-bold">Social Information</h1>
                        <div>
                            <p>
                                <b
                                    className="text-gray-400"
                                >
                                    GitHub URL:
                                </b> {member.githubProfileUrl ? 
                                    member.githubProfileUrl : "GitHub not provided."}
                            </p>
                            <p>
                                <b
                                    className="text-gray-400"
                                >
                                    LinkedIn URL:
                                </b> {member.linkedinProfileUrl ? 
                                    member.linkedinProfileUrl : "LinkedIn not provided."}
                            </p>
                            <p>
                                <b
                                    className="text-gray-400"
                                >
                                    Personal Website:
                                </b> {member.websiteUrl ? 
                                    member.websiteUrl : "Personal website not provided."}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}