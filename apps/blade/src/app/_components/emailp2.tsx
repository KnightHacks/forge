"use client";

import { useState } from "react";
import { Button } from "@forge/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@forge/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@forge/ui/select";
import { DatePicker } from "@forge/ui/date-picker";
import { X, Check } from 'lucide-react';

interface EmailSectionTwoProps {
    onClose: () => void;
    isClosing: boolean;
}

export const EmailSectionTwo = ({ onClose, isClosing }: EmailSectionTwoProps) => {
    const [isSent, setIsSent] = useState(false);

    const handleSend = () => {
        setIsSent(true);
        setTimeout(() => {
            setIsSent(false);
        }, 2000);
    };

    return (
        <div className={`flex items-center justify-center pb-40 transition-all duration-700 ${isClosing ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`}>
            <Card className={`w-2/3 transition-all duration-800 ${isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}>
                <CardHeader>
                    <CardTitle className="text-left">Schedule Email</CardTitle>
                    <CardAction>
                        <Button onClick={onClose} className="hover:scale-110 transition-transform duration-300 transform">
                            <X />
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <Select>
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Priority" />
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
                    <div className="my-4 items-center flex gap-4">
                        <span className="text-sm">Select Date:</span>
                        <DatePicker />
                    </div>
                    <div className="my-4 items-center flex gap-4">
                        <span className="text-sm">Select Blacklisted Dates:</span>
                        <DatePicker />
                    </div>

                    <Button onClick={handleSend} className={`transition-all duration-300 flex transform hover:scale-105 ${isSent ? 'w-24' : 'w-20'}`}>
                        <div className="relative overflow-hidden w-full h-full flex items-center justify-center">
                            <div className={`transition-transform duration-300 ${isSent ? '-translate-y-full' : 'translate-y-0'}`}>
                                <span>Send</span>
                            </div>
                            <div className={`absolute inset-0 flex items-center justify-center transition-transform duration-300 ${isSent ? 'translate-y-0' : 'translate-y-full'}`}>
                                <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4" />
                                    Sent!
                                </div>
                            </div>
                        </div>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
};