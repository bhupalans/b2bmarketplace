"use client";

import { useCurrency } from "@/contexts/currency-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CurrencySwitcher() {
  const { currency, setCurrency, rates } = useCurrency();
  const availableCurrencies = Array.from(new Set(["USD", ...Object.keys(rates)]));

  return (
    <Select value={currency} onValueChange={setCurrency}>
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent>
        {availableCurrencies.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
