/**
 * Returns a human-readable currency name from ISO currency code.
 * Examples:
 *   USD → US Dollar
 *   INR → Indian Rupee
 *   AED → United Arab Emirates Dirham
 */
export function getCurrencyName(currencyCode: string): string {
    try {
      const displayNames = new Intl.DisplayNames(["en"], {
        type: "currency",
      });
  
      return displayNames.of(currencyCode) || currencyCode;
    } catch {
      // Fallback for very old browsers or edge cases
      return currencyCode;
    }
  }
  