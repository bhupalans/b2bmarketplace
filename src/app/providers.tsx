"use client";

import { Toaster } from "@/components/ui/toaster";
import { CurrencyProvider } from "@/contexts/currency-context";
import { useEffect, useState } from "react";

async function getFxRates() {
  try {
    const response = await fetch("https://api.frankfurter.app/latest?from=USD");
    if (!response.ok) {
      console.error("Failed to fetch FX rates");
      return { USD: 1 };
    }
    const data = await response.json();
    return data.rates;
  } catch (error) {
    console.error("Error fetching FX rates:", error);
    return { USD: 1 };
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [rates, setRates] = useState<{ [key: string]: number }>({ USD: 1 });

  useEffect(() => {
    getFxRates().then(setRates);
  }, []);

  return (
    <CurrencyProvider rates={rates}>
      {children}
      <Toaster />
    </CurrencyProvider>
  );
}
