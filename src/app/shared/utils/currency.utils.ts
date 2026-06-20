export class CurrencyUtils {
  /**
   * Formats a number to an Indian Rupee string representation.
   */
  static formatINR(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '₹0';
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  }

  /**
   * Safely parses a string or number to a float.
   */
  static parseAmount(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    const parsed = parseFloat(value.toString().replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
}
