"use client";

import { getCurrencyName } from "@/lib/currency-utils";
import * as React from "react";
//import Image from "next/image";
import { useCurrency } from "@/contexts/currency-context";
import { CURRENCY_MAP } from "@/lib/geography-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

// ------------------------------
// 1. Build reverse map: currency -> country
// ------------------------------
const currencyToCountryMap: Record<string, string> = Object.entries(CURRENCY_MAP)
  .reduce((acc, [countryCode, currencyCode]) => {
    if (!acc[currencyCode]) {
      acc[currencyCode] = countryCode.toLowerCase();
    }
    return acc;
  }, {} as Record<string, string>);

// ------------------------------
// 2. Explicit overrides for shared/global currencies
// ------------------------------
const OVERRIDE_CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "us",
  EUR: "eu",
  GBP: "gb",
};

function getCountryCodeFromCurrency(currency: string): string {
  return (
    OVERRIDE_CURRENCY_TO_COUNTRY[currency] ??
    currencyToCountryMap[currency] ??
    "un" // fallback
  );
}

// ------------------------------
// 4. Selected value renderer (header)
// ------------------------------
function SelectedCurrencyDisplay({ currency }: { currency: string }) {
  const countryCode = getCountryCodeFromCurrency(currency);

  return (
    <div className="flex items-center gap-2">
      <img
  	src={`https://flagcdn.com/w20/${countryCode}.png`}
  	alt={currency}
  	width={20}
  	height={15}
  	className="rounded-sm object-cover"
  	loading="lazy"
       />

      <span className="text-sm font-medium">{currency}</span>
    </div>
  );
}

// ------------------------------
// 5. Main CurrencySwitcher component
// ------------------------------
export function CurrencySwitcher() {
  const { currency, setCurrency, rates } = useCurrency();

  const currencies = React.useMemo(() => {
    return Object.keys(rates).sort();
  }, [rates]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SelectedCurrencyDisplay currency={currency} />
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 max-h-[60vh] overflow-y-auto">
        {currencies.map((code) => {
          const countryCode = getCountryCodeFromCurrency(code);
          //const name = currencyNames[code] ?? code;

          return (
            <DropdownMenuItem
              key={code}
              onClick={() => setCurrency(code)}
              className="flex items-center gap-3"
            >
              <img
                src={`https://flagcdn.com/w20/${countryCode}.png`}
                alt={code}
                width={20}
                height={15}
                className="rounded-sm object-cover shrink-0"
              />

              <span className="w-12 font-medium">{code}</span>

              <span className="text-sm text-muted-foreground truncate">
                {getCurrencyName(code)}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}