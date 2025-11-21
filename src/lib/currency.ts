
/**
 * @file This file contains centralized currency conversion utilities for the application.
 */

/**
 * Converts a price from a base currency to a target currency using USD as an intermediary.
 * This ensures consistent conversions across the application.
 *
 * @param price - The price object, containing the amount and its currency.
 * @param targetCurrency - The currency to convert the price to.
 * @param rates - The exchange rates object where USD is the base (rates['USD'] is 1).
 * @returns The converted price amount in the target currency.
 */
export function convertPrice(
  price: { baseAmount: number; baseCurrency: string },
  targetCurrency: string,
  rates: { [key: string]: number }
): number {
  if (!price || typeof price.baseAmount !== 'number' || !price.baseCurrency) {
    return 0;
  }

  const { baseAmount, baseCurrency } = price;
  
  if (!rates[baseCurrency] || !rates[targetCurrency]) {
      // Fallback if a rate is missing, though this shouldn't happen with valid data.
      return baseAmount;
  }

  // 1. Convert the base amount to USD
  const amountInUSD = baseAmount / rates[baseCurrency];

  // 2. Convert the USD amount to the target currency
  const finalAmount = amountInUSD * rates[targetCurrency];
  
  return finalAmount;
}


/**
 * Converts a price to USD.
 * This is a convenience function for displaying a secondary USD price.
 *
 * @param price - The price object.
 * @param rates - The exchange rates object.
 * @returns The price amount in USD.
 */
export function convertPriceToUSD(
  price: { baseAmount: number; baseCurrency: string },
  rates: { [key: string]: number }
): number {
    if (!price || typeof price.baseAmount !== 'number' || !price.baseCurrency) {
        return 0;
    }
    if (price.baseCurrency === 'USD') {
        return price.baseAmount;
    }
    if (!rates[price.baseCurrency]) {
        return price.baseAmount; // Fallback
    }
    return price.baseAmount / rates[price.baseCurrency];
}
