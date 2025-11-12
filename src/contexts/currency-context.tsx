
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
    // This effect runs when the user logs in or out, or when the initial currency changes.
    let determinedCurrency = initialCurrency;

    if (user?.address?.country) {
      const userCurrency = CURRENCY_MAP[user.address.country];
      if (userCurrency && rates[userCurrency]) {
        determinedCurrency = userCurrency;
      }
    }
    
    setCurrency(determinedCurrency);

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
