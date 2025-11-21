
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
  
  if (baseCurrency === targetCurrency) {
    return baseAmount;
  }

  // Handle the case where a rate might be missing, but allow USD as a valid currency
  const baseRate = baseCurrency === 'USD' ? 1 : rates[baseCurrency];
  const targetRate = targetCurrency === 'USD' ? 1 : rates[targetCurrency];

  if (!baseRate || !targetRate) {
    console.warn(`Missing exchange rate for conversion from ${baseCurrency} to ${targetCurrency}.`);
    return baseAmount; // Fallback to the original amount if rates are unavailable
  }

  // 1. Convert the base amount to USD
  const amountInUSD = baseAmount / baseRate;

  // 2. Convert the USD amount to the target currency
  const finalAmount = amountInUSD * targetRate;
  
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
    
    const baseRate = price.baseCurrency === 'USD' ? 1 : rates[price.baseCurrency];
    
    if (!baseRate) {
        console.warn(`Missing exchange rate for base currency ${price.baseCurrency} in convertPriceToUSD.`);
        return price.baseAmount; // Fallback
    }

    return price.baseAmount / baseRate;
}

