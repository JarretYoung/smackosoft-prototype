"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { money } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";
import { ChipGroup } from "./chip-group";

const CURRENCIES = ["MYR", "SGD", "USD", "GBP", "EUR"];
/** Common court fees. Not taken from history. */
const AMOUNTS = ["50", "55", "60", "65", "70"];

/**
 * The court fee as one big amount with its currency in front, and common amounts under it.
 * The amount stays text so a half typed number is never rewritten. The parent validates it.
 */
export function CourtFeeField({
  id,
  amount,
  currency,
  onAmount,
  onCurrency,
  onBlur,
  invalid,
}: {
  id: string;
  amount: string;
  currency: string;
  onAmount: (amount: string) => void;
  onCurrency: (currency: string) => void;
  onBlur: () => void;
  invalid: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "flex items-center rounded-xl bg-input transition-[background-color,box-shadow] focus-within:bg-card focus-within:ring-[3px] focus-within:ring-ring",
          invalid && "ring-[3px] ring-destructive/40",
        )}
      >
        <Select value={currency} onValueChange={onCurrency}>
          <SelectTrigger
            aria-label="Currency"
            className="h-14 rounded-r-none bg-transparent pr-1 pl-4 text-subhead font-semibold focus-visible:bg-transparent focus-visible:ring-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0"
          value={amount}
          onChange={(e) => onAmount(e.target.value)}
          onBlur={onBlur}
          aria-invalid={invalid}
          className="score h-14 min-w-0 flex-1 bg-transparent px-2 pr-4 text-right text-xl outline-none placeholder:text-muted-foreground/40"
        />
      </div>
      <ChipGroup
        label="Common fees"
        value={amount}
        options={AMOUNTS.map((a) => ({ value: a, label: money(Number(a), currency) ?? a }))}
        onChange={onAmount}
      />
    </div>
  );
}
