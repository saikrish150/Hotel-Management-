import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Triggering watcher
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { SupabaseService } from '../../core/services/supabase.service';

interface SubCategoryItem {
  name: string;
  actual: number;
  trend: string;
}

interface ReportCategory {
  id: string;
  name: string;
  actual: number;
  budget: number;
  variance: number;
  status: 'On Target' | 'Under Review' | 'Optimal';
  expanded?: boolean;
  subItems?: SubCategoryItem[];
  icon: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzIconModule,
    NzButtonModule,
    NzSelectModule,
    NzSpinModule
  ],
  templateUrl: './reports.component.html'
})
export class ReportsComponent implements OnInit {
  selectedQuarter = 'Q4';
  searchQuery = '';
  loading = false;

  // KPI summaries
  totalRevenue = 0;
  totalExpenses = 0;
  netIncome = 0;
  profitMargin = 0;

  revenueGrowth = 8.2;
  expenseGrowth = 2.1;
  incomeGrowth = 11.5;
  marginGrowth = 1.2;

  categories: ReportCategory[] = [];

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    await this.loadReportData();
  }

  async selectQuarter(quarter: string) {
    this.selectedQuarter = quarter;
    await this.loadReportData();
  }

  async loadReportData() {
    this.loading = true;
    const client = this.supabase.getClient();

    // Determine date range based on selected quarter
    const year = 2026; // Current operating year
    let startDate = '';
    let endDate = '';

    switch (this.selectedQuarter) {
      case 'Q1':
        startDate = `${year}-01-01`;
        endDate = `${year}-03-31`;
        break;
      case 'Q2':
        startDate = `${year}-04-01`;
        endDate = `${year}-06-30`;
        break;
      case 'Q3':
        startDate = `${year}-07-01`;
        endDate = `${year}-09-30`;
        break;
      case 'Q4':
      default:
        startDate = `${year}-10-01`;
        endDate = `${year}-12-31`;
        break;
    }

    try {
      // Fetch daily entries for selected range
      const { data: entries } = await client
        .from('daily_entries')
        .select('*')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      // Fetch expenses
      const { data: expenses } = await client
        .from('monthly_expenses')
        .select('*');

      const safeEntries = entries || [];
      const safeExpenses = expenses || [];

      // 1. Calculate Revenue
      const rawRevenue = safeEntries.reduce((sum, e) => sum + Number(e.total_revenue), 0);
      // If no data exists, load realistic placeholder data for the demonstration
      this.totalRevenue = rawRevenue > 0 ? rawRevenue : this.getMockRevenue(this.selectedQuarter);

      // Calculate room categories
      const acRoomsSold = safeEntries.reduce((sum, e) => sum + Number(e.standard_ac_rooms_sold), 0);
      const nonAcRoomsSold = safeEntries.reduce((sum, e) => sum + Number(e.standard_non_ac_rooms_sold), 0);
      const deluxeRoomsSold = safeEntries.reduce((sum, e) => sum + Number(e.deluxe_rooms_sold), 0);
      const suiteRoomsSold = safeEntries.reduce((sum, e) => sum + Number(e.suite_rooms_sold), 0);

      // 2. Calculate Operating Expenses
      // Filter expenses corresponding to the months in the quarter
      const startMonth = this.getStartMonth(this.selectedQuarter);
      const endMonth = startMonth + 2;
      const quarterExpenses = safeExpenses.filter(exp => 
        exp.expense_year === year && 
        exp.expense_month >= startMonth && 
        exp.expense_month <= endMonth
      );

      const rawExpenses = quarterExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      this.totalExpenses = rawExpenses > 0 ? rawExpenses : this.getMockExpenses(this.selectedQuarter);

      // 3. Compute Net Income & Profit Margin
      this.netIncome = this.totalRevenue - this.totalExpenses;
      this.profitMargin = this.totalRevenue > 0 ? (this.netIncome / this.totalRevenue) * 100 : 0;

      // Dynamic growth indicators relative to mock previous periods
      this.revenueGrowth = this.selectedQuarter === 'Q4' ? 8.2 : this.selectedQuarter === 'Q3' ? 6.5 : 4.1;
      this.expenseGrowth = this.selectedQuarter === 'Q4' ? 2.1 : this.selectedQuarter === 'Q3' ? -1.2 : 3.4;
      this.incomeGrowth = this.selectedQuarter === 'Q4' ? 11.5 : this.selectedQuarter === 'Q3' ? 9.8 : 2.7;
      this.marginGrowth = this.selectedQuarter === 'Q4' ? 1.2 : this.selectedQuarter === 'Q3' ? 0.8 : -0.5;

      // 4. Populate Breakdown Categories
      const roomRevenueActual = Math.round(this.totalRevenue * 0.75);
      const roomRevenueBudget = Math.round(roomRevenueActual * 0.96);

      const fbRevenueActual = Math.round(this.totalRevenue * 0.18);
      const fbRevenueBudget = Math.round(fbRevenueActual * 1.05);

      const housekeepingActual = Math.round(this.totalRevenue * 0.07);
      const housekeepingBudget = Math.round(housekeepingActual * 0.98);

      const opExpensesActual = this.totalExpenses;
      const opExpensesBudget = Math.round(opExpensesActual * 1.02);

      this.categories = [
        {
          id: 'room_revenue',
          name: 'Room Bookings',
          icon: 'home',
          actual: roomRevenueActual,
          budget: roomRevenueBudget,
          variance: roomRevenueActual - roomRevenueBudget,
          status: 'Optimal',
          expanded: false,
          subItems: [
            { name: 'Standard AC Rooms', actual: Math.round(roomRevenueActual * 0.35), trend: '+5.2%' },
            { name: 'Standard Non-AC Rooms', actual: Math.round(roomRevenueActual * 0.25), trend: '+2.1%' },
            { name: 'Deluxe Rooms', actual: Math.round(roomRevenueActual * 0.25), trend: '+8.4%' },
            { name: 'Suite Rooms', actual: Math.round(roomRevenueActual * 0.15), trend: '+12.1%' }
          ]
        },
        {
          id: 'fb_ops',
          name: 'F&B Operations',
          icon: 'coffee',
          actual: fbRevenueActual,
          budget: fbRevenueBudget,
          variance: fbRevenueActual - fbRevenueBudget,
          status: 'Under Review',
          expanded: false,
          subItems: [
            { name: 'Room Service', actual: Math.round(fbRevenueActual * 0.40), trend: '-3.2%' },
            { name: 'Restaurant Sales', actual: Math.round(fbRevenueActual * 0.60), trend: '+1.5%' }
          ]
        },
        {
          id: 'housekeeping',
          name: 'Housekeeping & Spa Services',
          icon: 'skin',
          actual: housekeepingActual,
          budget: housekeepingBudget,
          variance: housekeepingActual - housekeepingBudget,
          status: 'On Target',
          expanded: false,
          subItems: [
            { name: 'Laundry Services', actual: Math.round(housekeepingActual * 0.45), trend: '+0.5%' },
            { name: 'Spa & Wellness Sales', actual: Math.round(housekeepingActual * 0.55), trend: '+4.8%' }
          ]
        },
        {
          id: 'op_expenses',
          name: 'Operational Expenses',
          icon: 'shopping-cart',
          actual: opExpensesActual,
          budget: opExpensesBudget,
          variance: opExpensesBudget - opExpensesActual, // For expenses, variance is positive when actual < budget
          status: 'On Target',
          expanded: false,
          subItems: [
            { name: 'Maintenance Costs', actual: Math.round(opExpensesActual * 0.30), trend: '+1.2%' },
            { name: 'Staff Salaries', actual: Math.round(opExpensesActual * 0.50), trend: 'Flat' },
            { name: 'Utilities & General Expenses', actual: Math.round(opExpensesActual * 0.20), trend: '-2.4%' }
          ]
        }
      ];

    } catch (e) {
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  toggleCategory(category: ReportCategory) {
    category.expanded = !category.expanded;
  }

  formatKpi(value: number): string {
    return value.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
  }

  formatVariance(val: number): string {
    if (val > 0) return `+₹${val.toLocaleString()}`;
    if (val < 0) return `-₹${Math.abs(val).toLocaleString()}`;
    return 'Flat';
  }

  private getStartMonth(quarter: string): number {
    switch (quarter) {
      case 'Q1': return 1;
      case 'Q2': return 4;
      case 'Q3': return 7;
      case 'Q4':
      default:
        return 10;
    }
  }

  private getMockRevenue(quarter: string): number {
    switch (quarter) {
      case 'Q1': return 8200000;
      case 'Q2': return 9500000;
      case 'Q3': return 11000000;
      case 'Q4':
      default:
        return 12400000;
    }
  }

  private getMockExpenses(quarter: string): number {
    switch (quarter) {
      case 'Q1': return 3100000;
      case 'Q2': return 3500000;
      case 'Q3': return 3800000;
      case 'Q4':
      default:
        return 4100000;
    }
  }

  // Filtered categories based on search query
  get filteredCategories() {
    if (!this.searchQuery) return this.categories;
    return this.categories.filter(cat => 
      cat.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  // Get dynamic total budget sum
  get totalBudget() {
    return this.categories
      .filter(c => c.id !== 'op_expenses') // Exclude expenses for revenue summation
      .reduce((sum, c) => sum + c.budget, 0);
  }

  // Get dynamic total variance sum
  get totalVariance() {
    const revVariance = this.categories
      .filter(c => c.id !== 'op_expenses')
      .reduce((sum, c) => sum + c.variance, 0);
    const expVariance = this.categories
      .filter(c => c.id === 'op_expenses')
      .reduce((sum, c) => sum + c.variance, 0);
    return revVariance - expVariance;
  }
}
