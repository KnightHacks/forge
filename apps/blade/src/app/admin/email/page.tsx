import { auth } from "@forge/auth";
import { redirect } from "next/navigation";
import { SIGN_IN_PATH } from "~/consts";
import { api, HydrateClient } from "~/trpc/server";

import { Calendar } from "@forge/ui/calendar";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@forge/ui/select";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
    InputGroupTextarea,
} from "@forge/ui/input-group";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { Button } from "@forge/ui/button";

export default async function AdminEmail() {
    const session = await auth();
    if (!session) {
        redirect(SIGN_IN_PATH);
    }

    const hasCheckIn = await api.auth.hasCheckIn();
    const hasFullAdmin = await api.auth.hasFullAdmin();

    if (!hasCheckIn && !hasFullAdmin) {
        redirect("/");
    }

    const user = await api.member.getMember();
    if (!user) {
        redirect("/");
    }

    return (
        <HydrateClient>
            <div className="absolute inset-0 flex items-center justify-center">
                <Card className="w-2/3">
                    <CardHeader>
                        <CardTitle className="text-left">Send Email</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4 mb-4">
                            <InputGroup className="flex-1">
                                <InputGroupAddon>
                                    <InputGroupText>To:</InputGroupText>
                                </InputGroupAddon>
                                <InputGroupInput
                                    type="email"
                                    placeholder="tk@knighthacks.org"
                                />
                            </InputGroup>
                            <Select>
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="From:" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="apple">Apple</SelectItem>
                                        <SelectItem value="banana">Banana</SelectItem>
                                        <SelectItem value="blueberry">Blueberry</SelectItem>
                                        <SelectItem value="grapes">Grapes</SelectItem>
                                        <SelectItem value="pineapple">Pineapple</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <InputGroup className="my-4">
                            <InputGroupAddon>
                                <InputGroupText>Subject:</InputGroupText>
                            </InputGroupAddon>
                            <InputGroupInput
                                type="text"
                                placeholder="To my dearest friend..."
                            />
                        </InputGroup>
                        <InputGroup className="flex w-full mb-4">
                            <InputGroupTextarea
                                placeholder="Dear Lenny..."
                                className="h-48"
                            />
                        </InputGroup>
                        <Button>Schedule</Button>
                    </CardContent>
                </Card>
            </div>
        </HydrateClient>
    )
};