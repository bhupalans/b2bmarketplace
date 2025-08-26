"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

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
}: {
  children: ReactNode;
  rates: { [key: string]: number };
}) => {
  const [currency, setCurrency] = useState("EUR");

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
