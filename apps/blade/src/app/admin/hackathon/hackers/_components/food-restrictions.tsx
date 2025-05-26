
import { useState, useEffect } from "react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import type { InsertHacker } from "@forge/db/schemas/knight-hacks";

export default function FoodRestrictionsButton({ 
    hacker 
}: { 
    hacker: InsertHacker 
}) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [foodString, setFoodString] = useState("");

    useEffect(() => {
        setFoodString(hacker.foodAllergies?.replace(/,/g, ", ") || "");
    }, [hacker.foodAllergies]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className="p-0 h-0">
                    <Badge className="order-1 my-auto bg-red-800 hover:bg-red-950 text-center text-white">
                    FOOD RESTRICTIONS
                    </Badge>
                </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl">{hacker.firstName}'s Food Restrictions:</DialogTitle>
                </DialogHeader>

                <DialogDescription className="text-md text-center">
                    {foodString}
                </DialogDescription>
            </DialogContent>
        </Dialog>
    );
}