export class DateUtils {
  /**
   * Calculates the number of days between two dates.
   * Returns a minimum of 1 day.
   */
  static getDaysBetween(startDate: Date | string, endDate: Date | string, minDays: number = 1): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return minDays;

    const diffTime = end.getTime() - start.getTime();
    return Math.max(minDays, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  /**
   * Adds a specific number of days to a date.
   */
  static addDays(date: Date | string, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Returns a local YYYY-MM-DD string representation of a date.
   */
  static toLocalDateString(date: Date | string): string {
    const d = new Date(date);
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
  }

  /**
   * Checks if two dates fall on the same calendar day.
   */
  static isSameDay(date1: Date | string, date2: Date | string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;

    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  /**
   * Returns a new Date object set to the beginning of the day (00:00:00).
   */
  static getStartOfDay(date: Date | string = new Date()): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Returns a new Date object set to the end of the day (23:59:59).
   */
  static getEndOfDay(date: Date | string = new Date()): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}
