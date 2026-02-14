import { useEffect, useState } from "react";

import type { InsertHacker } from "@forge/db/schemas/knight-hacks";
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

export default function FoodRestrictionsButton({
  hacker,
}: {
  hacker: InsertHacker;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [foodString, setFoodString] = useState("");

  useEffect(() => {
    setFoodString(hacker.foodAllergies?.replace(/,/g, ", ") || "");
  }, [hacker.foodAllergies]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-0 p-0">
          <Badge className="order-1 my-auto bg-red-800 text-center text-white hover:bg-red-950">
            FOOD RESTRICTIONS
          </Badge>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {hacker.firstName}'s Food Restrictions:
          </DialogTitle>
        </DialogHeader>

        <DialogDescription className="text-md text-center">
          {foodString}
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
