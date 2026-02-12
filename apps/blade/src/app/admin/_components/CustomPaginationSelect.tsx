import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";

interface CustomPaginationSelectProps {
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  options?: number[];
  className?: string;
}

export default function CustomPaginationSelect({
  pageSize,
  onPageSizeChange,
  options = [10, 25, 50, 100],
  className,
}: CustomPaginationSelectProps) {
  return (
    <Select
      value={pageSize.toString()}
      onValueChange={(value: string) => onPageSizeChange(Number(value))}
    >
      <SelectTrigger className={className ?? "w-auto"}>
        <SelectValue>{pageSize} Members</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option: number) => (
            <SelectItem key={option} value={option.toString()}>
              {option}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
