"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ExpenseTimeFilter } from "@/lib/date";

const OPTIONS: { value: ExpenseTimeFilter; label: string }[] = [
  { value: "this_month", label: "Tháng này" },
  { value: "prev_month", label: "Tháng trước" },
  { value: "last_3_months", label: "3 tháng gần nhất" },
  { value: "last_6_months", label: "6 tháng gần nhất" },
  { value: "last_12_months", label: "1 năm gần nhất" },
];

type ExpenseFilterProps = {
  value: ExpenseTimeFilter;
  onValueChange: (value: ExpenseTimeFilter) => void;
  disabled?: boolean;
};

export function ExpenseTimeRangeFilter({
  value,
  onValueChange,
  disabled,
}: ExpenseFilterProps) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(v) => onValueChange(v as ExpenseTimeFilter)}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <SelectTrigger
            className="h-10 min-h-10 w-full cursor-pointer rounded-lg md:w-[220px]"
            aria-label="Khoảng thời gian"
          >
            <SelectValue placeholder="Khoảng thời gian" />
          </SelectTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Lọc theo khoảng thời gian</TooltipContent>
      </Tooltip>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} className="cursor-pointer">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
