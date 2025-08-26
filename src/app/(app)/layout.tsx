import { AppLayout } from "@/components/app-layout";
import { CurrencyProvider } from "@/contexts/currency-context";

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

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rates = await getFxRates();
  return (
    <CurrencyProvider rates={rates}>
      <AppLayout>{children}</AppLayout>
    </CurrencyProvider>
  );
}
