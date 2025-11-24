
"use client";

import { useCurrency } from "@/contexts/currency-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currencyDetails } from "@/lib/currency-data";

export function CurrencySwitcher() {
  const { currency, setCurrency, rates } = useCurrency();
  const availableCurrencies = Array.from(new Set(["USD", ...Object.keys(rates)]));

  const SelectedCurrencyDisplay = () => {
    const details = currencyDetails[currency];
    if (!details) {
      return <span>{currency}</span>;
    }
    return (
      <div className="flex items-center gap-2">
        <span>{details.flag}</span>
        <span>{currency}</span>
      </div>
    );
  };

  return (
    <Select value={currency} onValueChange={setCurrency}>
      <SelectTrigger className="w-[150px]">
        <SelectValue asChild>
           <SelectedCurrencyDisplay />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableCurrencies.sort().map((c) => {
          const details = currencyDetails[c];
          return (
            <SelectItem key={c} value={c}>
              <div className="flex items-center gap-3">
                <span className="w-5 text-center">{details?.flag || "💸"}</span>
                <span className="font-semibold">{c}</span>
                {details?.name && (
                  <span className="text-muted-foreground text-xs">- {details.name}</span>
                )}
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  );
}
