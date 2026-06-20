import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor(private supabase: SupabaseService) {}

  async getAnalyticsData(startDate: Date, endDate: Date) {

    const profile = this.supabase.currentProfile;
    
    if (!profile || !profile.hotel_id) {
      throw new Error('No hotel context found');
    }

    const formatLocal = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startStr = formatLocal(startDate);
    const endStr = formatLocal(endDate);

    // Fetch Daily Entries within date range
    const { data: dailyEntriesRaw, error: dailyError } = await this.supabase.getDailyEntries(profile.hotel_id, startStr, endStr);
    const dailyEntries = dailyEntriesRaw ? dailyEntriesRaw.sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()) : null;

    if (dailyError) throw dailyError;

    // Fetch Monthly Expenses (since these are monthly, we fetch for the years involved)
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth() + 1;
    
    const { data: allExpenses, error: expensesError } = await this.supabase.getMonthlyExpenses(profile.hotel_id);
    const monthlyExpenses = allExpenses?.filter(e => {
      const isAfterStart = e.expense_year > startYear || (e.expense_year === startYear && e.expense_month >= startMonth);
      const isBeforeEnd = e.expense_year < endYear || (e.expense_year === endYear && e.expense_month <= endMonth);
      return isAfterStart && isBeforeEnd;
    }) || null;

    if (expensesError) throw expensesError;

    let roomBookings: any[] = [];
    try {
      const { data: allBookings, error: bError } = await this.supabase.getRoomBookings(profile.hotel_id);
      const bData = allBookings?.filter((b: any) => {
        const checkIn = new Date(b.check_in).toISOString().split('T')[0];
        return checkIn >= startStr && checkIn <= endStr;
      }) || null;
      if (!bError && bData) {
        roomBookings = bData;
      }
    } catch (e) {
      console.warn('Failed to query room_bookings, using empty array fallback', e);
    }

    const processed = this.processData(dailyEntries || [], monthlyExpenses || [], startDate, endDate);
    return {
      ...processed,
      rawEntries: dailyEntries || [],
      rawExpenses: monthlyExpenses || [],
      rawBookings: roomBookings
    };
  }

  private processData(dailyEntries: any[], monthlyExpenses: any[], startDate: Date, endDate: Date) {
    // 1. Revenue Sources (Rooms vs Restaurant vs Other)
    let totalRoomsRev = 0;
    let totalRestRev = 0;
    let totalOtherRev = 0;

    // 2. Payment Methods
    let totalCash = 0;
    let totalUpi = 0;
    let totalCard = 0;
    let totalPending = 0;

    // 3. Occupancy Trends over time
    const occupancyDates: string[] = [];
    const roomsSoldData: number[] = [];
    const vacantRoomsData: number[] = [];

    // 4. Room Type Sales
    let standardAc = 0;
    let standardNonAc = 0;
    let deluxe = 0;
    let suite = 0;

    // 5. Total Guests over time
    const guestsData: number[] = [];

    dailyEntries.forEach(entry => {
      totalRoomsRev += (entry.total_revenue - (entry.restaurant_revenue || 0) - (entry.other_service_revenue || 0));
      totalRestRev += (entry.restaurant_revenue || 0);
      totalOtherRev += (entry.other_service_revenue || 0);

      totalCash += (entry.cash_payments || 0);
      totalUpi += (entry.upi_payments || 0);
      totalCard += (entry.card_payments || 0);
      totalPending += (entry.pending_payments || 0);

      occupancyDates.push(entry.entry_date);
      roomsSoldData.push(entry.rooms_sold || 0);
      vacantRoomsData.push(entry.vacant_rooms || 0);
      guestsData.push(entry.total_guests || 0);

      standardAc += (entry.standard_ac_rooms_sold || 0);
      standardNonAc += (entry.standard_non_ac_rooms_sold || 0);
      deluxe += (entry.deluxe_rooms_sold || 0);
      suite += (entry.suite_rooms_sold || 0);
    });

    // 6. Expense Categories
    const expenseCategoriesMap: Record<string, number> = {};
    monthlyExpenses.forEach(exp => {
      // Basic filtering: only include expenses from the months that fall roughly in the date range
      // For simplicity, we just aggregate all fetched expenses if they match the start/end year.
      const cat = exp.category || 'Other';
      expenseCategoriesMap[cat] = (expenseCategoriesMap[cat] || 0) + Number(exp.amount || 0);
    });
    
    const expenseCategoriesLabels = Object.keys(expenseCategoriesMap);
    const expenseCategoriesData = Object.values(expenseCategoriesMap);

    return {
      revenueSources: {
        series: [totalRoomsRev, totalRestRev, totalOtherRev],
        labels: ['Room Revenue', 'Restaurant', 'Other Services']
      },
      paymentMethods: {
        series: [totalCash, totalUpi, totalCard, totalPending],
        labels: ['Cash', 'UPI', 'Card', 'Pending']
      },
      occupancyTrends: {
        series: [
          { name: 'Rooms Sold', data: roomsSoldData },
          { name: 'Vacant Rooms', data: vacantRoomsData }
        ],
        categories: occupancyDates
      },
      roomTypeSales: {
        series: [{ name: 'Rooms Sold', data: [standardAc, standardNonAc, deluxe, suite] }],
        categories: ['Standard AC', 'Standard Non-AC', 'Deluxe', 'Suite']
      },
      guestTrends: {
        series: [{ name: 'Total Guests', data: guestsData }],
        categories: occupancyDates
      },
      expenseDemographics: {
        series: expenseCategoriesData.length ? expenseCategoriesData : [0],
        labels: expenseCategoriesLabels.length ? expenseCategoriesLabels : ['No Expenses']
      }
    };
  }
}
