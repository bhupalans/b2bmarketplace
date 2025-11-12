
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

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
  initialCurrency = 'USD', // Default to USD if nothing is passed
}: {
  children: ReactNode;
  rates: { [key: string]: number };
  initialCurrency: string;
}) => {
  const [currency, setCurrency] = useState(initialCurrency);

  // When the server-provided initial currency changes, update the state
  useEffect(() => {
    setCurrency(initialCurrency);
  }, [initialCurrency]);

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
