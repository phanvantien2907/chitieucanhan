"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DatePickerProps = {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  "aria-invalid"?: boolean;
};

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = "Chọn ngày",
  id,
  className,
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          className={cn(
            "w-full cursor-pointer justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0 opacity-70" />
          {value ? (
            format(value, "dd/MM/yyyy", { locale: vi })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          locale={vi}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
