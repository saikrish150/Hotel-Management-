import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor(private supabase: SupabaseService) {}

  async getAnalyticsData(startDate: Date, endDate: Date) {
    const client = this.supabase.getClient();
    const profile = this.supabase.currentProfile;
    
    if (!profile || !profile.hotel_id) {
      throw new Error('No hotel context found');
    }

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Fetch Daily Entries within date range
    const { data: dailyEntries, error: dailyError } = await client
      .from('daily_entries')
      .select('*')
      .eq('hotel_id', profile.hotel_id)
      .gte('entry_date', startStr)
      .lte('entry_date', endStr)
      .order('entry_date', { ascending: true });

    if (dailyError) throw dailyError;

    // Fetch Monthly Expenses (since these are monthly, we fetch for the years involved)
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    const { data: monthlyExpenses, error: expensesError } = await client
      .from('monthly_expenses')
      .select('*')
      .eq('hotel_id', profile.hotel_id)
      .gte('expense_year', startYear)
      .lte('expense_year', endYear);

    if (expensesError) throw expensesError;

    return this.processData(dailyEntries || [], monthlyExpenses || [], startDate, endDate);
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
