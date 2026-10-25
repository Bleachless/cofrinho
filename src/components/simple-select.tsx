"use client";

import type { ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Option = { value: string; label: string; icon?: ReactNode };

// Select do shadcn com a lista de opções em um só lugar.
export function SimpleSelect({
  value,
  onChange,
  options,
  className,
  label,
  size,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  className?: string;
  label: string;
  size?: "sm" | "default";
}) {
  return (
    <Select
      value={value}
      items={Object.fromEntries(options.map((o) => [o.value, o.label]))}
      onValueChange={(v) => v !== null && onChange(String(v))}
    >
      <SelectTrigger aria-label={label} className={className} size={size}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.icon}
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
