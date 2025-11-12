
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./auth-context";
import { CURRENCY_MAP } from "@/lib/geography-data";

type CurrencyContextType = {
  currency: string;
  setCurrency: (currency: string) => void;
  rates: { [key: string]: number };
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export const CurrencyProvider = ({
  children,
  rates,
  initialCurrency = 'USD',
}: {
  children: ReactNode;
  rates: { [key: string]: number };
  initialCurrency: string;
}) => {
  const [currency, setCurrency] = useState(initialCurrency);
  const { user } = useAuth();

  useEffect(() => {
    // This effect runs when the user logs in or out.
    if (user?.address?.country) {
      const userCurrency = CURRENCY_MAP[user.address.country];
      if (userCurrency && rates[userCurrency]) {
        setCurrency(userCurrency);
      } else {
        // If user's country currency is not available, use the server-provided initial currency
        setCurrency(initialCurrency);
      }
    } else {
      // When user logs out, revert to the initial server-detected currency
      setCurrency(initialCurrency);
    }
  }, [user, initialCurrency, rates]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
