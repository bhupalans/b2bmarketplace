
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
    // This effect ensures the currency updates when the user logs in or out.
    let determinedCurrency = initialCurrency;

    // A logged-in user's profile country takes highest precedence.
    if (user) {
      const userCountry = user.address?.country || user.shippingAddress?.country;
      if (userCountry && CURRENCY_MAP[userCountry] && rates[CURRENCY_MAP[userCountry]]) {
        determinedCurrency = CURRENCY_MAP[userCountry];
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
