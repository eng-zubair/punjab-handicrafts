/**
 * Safely formats a price value as PKR currency
 * Handles both number and string inputs, guards against NaN
 * 
 * @param price - Price as number or string
 * @param fallback - Value to return if price is invalid (default: 0)
 * @returns Formatted price string with PKR prefix and commas
 */
export function formatPrice(price: number | string | null | undefined, fallback: number = 0): string {
  if (price === null || price === undefined || price === '') {
    return `PKR ${fallback.toLocaleString()}`;
  }
  
  const numPrice = typeof price === 'number' ? price : parseFloat(price);
  
  if (isNaN(numPrice)) {
    return `PKR ${fallback.toLocaleString()}`;
  }
  
  return `PKR ${numPrice.toLocaleString()}`;
}

/**
 * Safely converts price to number
 * Guards against NaN and returns fallback
 * 
 * @param price - Price as number or string
 * @param fallback - Value to return if price is invalid (default: 0)
 * @returns Price as number
 */
export function toSafeNumber(price: number | string | null | undefined, fallback: number = 0): number {
  if (price === null || price === undefined || price === '') {
    return fallback;
  }
  
  const numPrice = typeof price === 'number' ? price : parseFloat(price);
  
  return isNaN(numPrice) ? fallback : numPrice;
}
