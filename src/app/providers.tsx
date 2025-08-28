
"use client";

import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth-context";
import { CurrencyProvider } from "@/contexts/currency-context";
import { seedDatabase } from "@/lib/database";
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

// A simple component to trigger the one-time database seed.
function DatabaseSeeder() {
  useEffect(() => {
    // This is a server action, but we can call it from the client.
    // It has internal logic to only run once.
    seedDatabase();
  }, []);

  return null; // This component renders nothing.
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [rates, setRates] = useState<{ [key: string]: number }>({ USD: 1 });

  useEffect(() => {
    getFxRates().then(setRates);
  }, []);

  return (
    <AuthProvider>
      <CurrencyProvider rates={rates}>
        <DatabaseSeeder />
        {children}
        <Toaster />
      </CurrencyProvider>
    </AuthProvider>
  );
}
