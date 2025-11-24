"use client";

import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth-context";
import { CurrencyProvider } from "@/contexts/currency-context";
import { useEffect, useState } from "react";

async function getFxRates() {
  try {
    // Switched to a more comprehensive, free currency API provider
    const response = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!response.ok) {
      console.error("Failed to fetch FX rates");
      return { USD: 1 };
    }
    const data = await response.json();
    if (data.result === 'success') {
        return data.rates;
    }
    console.error("FX rates API returned an error:", data['error-type']);
    return { USD: 1 };
  } catch (error) {
    console.error("Error fetching FX rates:", error);
    return { USD: 1 };
  }
}

export function Providers({ children, defaultCurrency = 'USD' }: { children: React.ReactNode; defaultCurrency?: string }) {
  const [rates, setRates] = useState<{ [key: string]: number }>({ USD: 1 });

  useEffect(() => {
    getFxRates().then(setRates);
  }, []);

  return (
    <AuthProvider>
      <CurrencyProvider rates={rates} initialCurrency={defaultCurrency}>
        {children}
        <Toaster />
      </CurrencyProvider>
    </AuthProvider>
  );
}
