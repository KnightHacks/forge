import { useEffect, useState } from "react";
import { Check, Pencil } from "lucide-react";

import { cn } from "@forge/ui";
import { FormControl } from "@forge/ui/form";
import { Input } from "@forge/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

export default function ToggleEditInput({
  placeholder = "",
  type = "text",
  items = [""],
  onValueChange,
  defaultValue,
  submit,
  ...field
}: {
  placeholder?: string;
  type?: string;
  items?: readonly string[];
  onValueChange?: (value: string) => void;
  submit: boolean;
  defaultValue?: string;
}) {
  const [toggle, setToggle] = useState<boolean>(true);

  useEffect(() => {
    if (submit) {
      setToggle(false);
    }
  }, [submit]);

  return (
    <div
      className={cn(
        "relative flex flex-row",
        "w-full items-center justify-end",
      )}
    >
      {type == "text" && (
        <>
          <Input
            type={type}
            placeholder={placeholder}
            {...field}
            disabled={toggle}
            onSubmit={() => setToggle(false)}
            maxLength={256}
          />
          <button
            type="submit"
            className="absolute right-4"
            onClick={(e) => {
              e.preventDefault();
              setToggle(!toggle);
            }}
          >
            {toggle && <Pencil size={16} />}
            {!toggle && <Check size={18} />}
          </button>
        </>
      )}
      {type == "date" && (
        <>
          <Input
            type={type}
            placeholder={placeholder}
            {...field}
            disabled={toggle}
          />
          <button
            type="submit"
            className={cn("absolute", toggle ? "right-4" : "right-10")}
            onClick={(e) => {
              e.preventDefault();
              setToggle(!toggle);
            }}
          >
            {toggle && <Pencil size={16} />}
            {!toggle && <Check size={18} />}
          </button>
        </>
      )}
      {type == "select" && (
        <>
          <Select
            onValueChange={onValueChange}
            defaultValue={defaultValue}
            disabled={toggle}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="submit"
            className={cn("absolute", toggle ? "right-4" : "right-8")}
            onClick={(e) => {
              e.preventDefault();
              setToggle(!toggle);
            }}
          >
            {toggle && <Pencil size={16} />}
            {!toggle && <Check size={18} />}
          </button>
        </>
      )}
    </div>
  );
}
