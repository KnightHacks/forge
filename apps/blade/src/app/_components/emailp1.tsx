"use client";

import { Button } from "@forge/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@forge/ui/card";
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupInput, InputGroupTextarea } from "@forge/ui/input-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@forge/ui/select";

interface EmailSectionOneProps {
    onSchedule: () => void;
}

export const EmailSectionOne = ({ onSchedule }: EmailSectionOneProps) => {
    return (
        <div className="flex items-center justify-center mb-4 pt-20">
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
                    <Button onClick={onSchedule} className="hover:scale-105 transition-transform duration-300 transform">Schedule</Button>
                </CardContent>
            </Card>
        </div>
    )
};