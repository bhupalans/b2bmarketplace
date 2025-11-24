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
import { cn } from "@/lib/utils";

export function CurrencySwitcher() {
  const { currency, setCurrency, rates } = useCurrency();
  // Ensure we only show currencies for which we have rates.
  const availableCurrencies = Array.from(new Set(["USD", ...Object.keys(rates)]));

  // Component to display the selected currency in the trigger button.
  const SelectedCurrencyDisplay = () => {
    const details = currencyDetails[currency];
    if (!details) {
      return <span>{currency}</span>;
    }
    return (
      <div className="flex items-center gap-2">
        <span role="img" aria-label={details.name}>{details.flag}</span>
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
          // By placing the currency code directly inside SelectItem and then styling the rest,
          // we allow the browser's native typeahead to function correctly.
          return (
            <SelectItem key={c} value={c}>
              <div className="flex items-center gap-3">
                 <span className={cn("w-6 text-center", !details && "invisible")}>{details?.flag}</span>
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
