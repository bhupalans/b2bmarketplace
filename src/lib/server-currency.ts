let cachedRates: any = null;
let lastFetchTime = 0;

export async function getFxRates() {
  const now = Date.now();

  // Cache for 1 hour
  if (cachedRates && now - lastFetchTime < 60 * 60 * 1000) {
    return cachedRates;
  }

  const response = await fetch("https://open.er-api.com/v6/latest/USD");

  if (!response.ok) {
    throw new Error("Failed to fetch exchange rates");
  }

  const data = await response.json();

  cachedRates = data.rates;
  lastFetchTime = now;

  return cachedRates;
}

export async function convertToUSD(amount: number, currency: string) {
  if (currency === "USD") return amount;

  const rates = await getFxRates();
  const rate = rates[currency];

  if (!rate) {
    throw new Error(`Missing exchange rate for ${currency}`);
  }

  return amount / rate;
}

export async function convertFromUSD(
  amount: number,
  targetCurrency: string
) {
  const rates = await getFxRates();
  const rate = rates[targetCurrency];

  if (!rate) throw new Error(`Missing FX rate for ${targetCurrency}`);

  return amount * rate;
}
