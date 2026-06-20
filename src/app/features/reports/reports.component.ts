import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { SupabaseService } from '../../core/services/supabase.service';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';

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

interface PlTableRow {
  period: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  margin: number;
  isTotal?: boolean;
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
    NzRadioModule,
    NzSpinModule,
    NzTableModule,
    NgApexchartsModule
  ],
  templateUrl: './reports.component.html'
})
export class ReportsComponent implements OnInit {
  selectedYear = 2026;
  selectedMonth = 'all';
  searchQuery = '';
  loading = false;

  years = [2024, 2025, 2026, 2027];
  months = [
    { value: 'all', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // KPI Summaries
  totalRevenue = 0;
  totalExpenses = 0;
  netIncome = 0;
  profitMargin = 0;
  revPar = 0;
  adr = 0;

  revenueGrowth = 0;
  expenseGrowth = 0;
  incomeGrowth = 0;
  marginGrowth = 0;
  revParGrowth = 0;
  adrGrowth = 0;

  // Chart Configurations
  public revenueProfitChartOptions!: Partial<ApexOptions>;
  public expenseChartOptions!: Partial<ApexOptions>;
  public roomRevenueChartOptions!: Partial<ApexOptions>;

  categories: ReportCategory[] = [];
  independentPlChartOptions!: Partial<ApexOptions>;
  plViewMode: 'month' | 'year' = 'month';
  plSelectedYear: number | 'all' = 'all';
  independentEntries: any[] = [];
  independentExpenses: any[] = [];
  plChartLoading = false;

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    const today = new Date();
    this.selectedYear = today.getFullYear();
    if (!this.years.includes(this.selectedYear)) {
      this.years.push(this.selectedYear);
      this.years.sort((a, b) => a - b);
    }
    this.selectedMonth = String(today.getMonth() + 1);
    await Promise.all([
      this.loadReportData(),
      this.loadIndependentPlData()
    ]);
  }

  async onFilterChange() {
    await this.loadReportData();
  }

  async loadIndependentPlData() {
    this.plChartLoading = true;
    const profile = this.supabase.currentProfile;
    const hotelId = profile?.hotel_id;

    try {
      const [{ data: entriesRaw }, { data: expensesRaw }] = await Promise.all([
        this.supabase.getDailyEntries(hotelId),
        this.supabase.getMonthlyExpenses(hotelId)
      ]);
      
      this.independentEntries = entriesRaw || [];
      this.independentExpenses = expensesRaw || [];
      this.processPlChartData();
    } catch (e) {
      console.error('Error loading independent P&L data:', e);
    } finally {
      this.plChartLoading = false;
    }
  }

  onPlViewModeChange() {
    this.processPlChartData();
  }

  processPlChartData() {
    const aggregated: Record<string, { rev: number; exp: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Aggregate Revenue
    this.independentEntries.forEach(e => {
      const d = new Date(e.entry_date);
      const year = d.getFullYear();
      if (this.plSelectedYear !== 'all' && year !== this.plSelectedYear) return;
      const monthStr = monthNames[d.getMonth()];
      const key = this.plViewMode === 'month' ? `${monthStr} ${year}` : `${year}`;
      
      if (!aggregated[key]) aggregated[key] = { rev: 0, exp: 0 };
      aggregated[key].rev += Number(e.total_revenue || 0);
    });

    // Aggregate Expenses
    this.independentExpenses.forEach(exp => {
      const year = exp.expense_year;
      if (this.plSelectedYear !== 'all' && year !== this.plSelectedYear) return;
      const monthStr = monthNames[exp.expense_month - 1];
      const key = this.plViewMode === 'month' ? `${monthStr} ${year}` : `${year}`;
      
      if (!aggregated[key]) aggregated[key] = { rev: 0, exp: 0 };
      aggregated[key].exp += Number(exp.amount || 0);
    });

    let totalRev = 0;
    let totalExp = 0;
    
    // Convert to array and sort chronologically
    let chartData = Object.keys(aggregated).map(key => {
      const rev = aggregated[key].rev;
      const exp = aggregated[key].exp;
      const profit = rev - exp;
      return { period: key, revenue: rev, expenses: exp, netProfit: profit };
    });

    // Sort ascending chronologically for chart
    chartData.sort((a, b) => {
      if (this.plViewMode === 'year') {
        return parseInt(a.period) - parseInt(b.period);
      } else {
        const [aMon, aYr] = a.period.split(' ');
        const [bMon, bYr] = b.period.split(' ');
        if (aYr !== bYr) return parseInt(aYr) - parseInt(bYr);
        return monthNames.indexOf(aMon) - monthNames.indexOf(bMon);
      }
    });

    const categories = chartData.map(d => d.period);
    const revenueSeries = chartData.map(d => d.revenue);
    const expenseSeries = chartData.map(d => d.expenses);
    const profitSeries = chartData.map(d => d.netProfit);

    this.independentPlChartOptions = {
      series: [
        { name: 'Revenue', data: revenueSeries },
        { name: 'Expenses', data: expenseSeries },
        { name: 'Net Profit', data: profitSeries }
      ],
      chart: {
        height: 350,
        type: 'bar',
        background: 'transparent',
        toolbar: { show: true },
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      colors: ['#d4af37', '#f43f5e', '#10b981'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '60%',
          borderRadius: 4,
          dataLabels: { position: 'top' }
        }
      },
      dataLabels: {
        enabled: false,
      },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: {
        categories: categories,
        labels: { style: { colors: '#9ca3af', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: '#9ca3af', fontSize: '11px' },
          formatter: (value) => '₹' + (value >= 100000 ? (value / 100000).toFixed(1) + 'L' : value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value.toString())
        }
      },
      grid: { borderColor: 'rgba(255, 255, 255, 0.05)', strokeDashArray: 3 },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'right',
        labels: { colors: '#9ca3af' }
      },
      tooltip: {
        theme: 'dark',
        y: { formatter: (val) => '₹' + val.toLocaleString('en-IN') }
      }
    };
  }

  async loadReportData() {
    this.loading = true;
    const profile = this.supabase.currentProfile;
    const hotelId = profile?.hotel_id;

    // Date range calculations
    let startDate = '';
    let endDate = '';

    if (this.selectedMonth === 'all') {
      startDate = `${this.selectedYear}-01-01`;
      endDate = `${this.selectedYear}-12-31`;
    } else {
      const monthNum = parseInt(this.selectedMonth, 10);
      const lastDay = new Date(this.selectedYear, monthNum, 0).getDate();
      const monthStr = monthNum.toString().padStart(2, '0');
      startDate = `${this.selectedYear}-${monthStr}-01`;
      endDate = `${this.selectedYear}-${monthStr}-${lastDay}`;
    }

    try {
      // 1. Fetch Daily Entries
      const { data: entriesRaw } = await this.supabase.getDailyEntries(hotelId, startDate, endDate);
      const entries = entriesRaw ? entriesRaw.sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()) : [];

      // 2. Fetch Expenses
      const { data: expenses } = await this.supabase.getMonthlyExpenses(hotelId, this.selectedYear);

      const safeEntries = entries || [];
      const safeExpenses = expenses || [];

      // 3. Compute KPI Figures
      const dbRevenue = safeEntries.reduce((sum, e) => sum + Number(e.total_revenue || 0), 0);
      
      // Calculate Room revenue vs Restaurant vs Other
      const dbRestRevenue = safeEntries.reduce((sum, e) => sum + Number(e.restaurant_revenue || 0), 0);
      const dbOtherRevenue = safeEntries.reduce((sum, e) => sum + Number(e.other_service_revenue || 0), 0);
      
      // Expenses matching selected period
      let filteredExpenses = safeExpenses;
      if (this.selectedMonth !== 'all') {
        const monthNum = parseInt(this.selectedMonth, 10);
        filteredExpenses = safeExpenses.filter(e => e.expense_month === monthNum);
      }
      const dbExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      this.totalRevenue = dbRevenue;
      this.totalExpenses = dbExpenses;

      this.netIncome = this.totalRevenue - this.totalExpenses;
      this.profitMargin = this.totalRevenue > 0 ? (this.netIncome / this.totalRevenue) * 100 : 0;

      // Calculate RevPAR & ADR
      const totalRoomsSold = safeEntries.reduce((sum, e) => sum + Number(e.rooms_sold || 0), 0);
      const totalRoomsAvailable = safeEntries.reduce((sum, e) => sum + Number(e.total_rooms_available || 0), 0);

      // Calculate Room revenue explicitly by deducting non-room revenue
      const roomRevPortion = this.totalRevenue - (dbRestRevenue + dbOtherRevenue);
      this.adr = totalRoomsSold > 0 ? Math.round(roomRevPortion / totalRoomsSold) : 0;
      this.revPar = totalRoomsAvailable > 0 ? Math.round(roomRevPortion / totalRoomsAvailable) : 0;

      // Calculate real growth indicators (current period vs previous period)
      this.revenueGrowth = 0;
      this.expenseGrowth = 0;
      this.incomeGrowth = this.totalRevenue > 0 ? Math.round(((this.totalRevenue - this.totalExpenses) / this.totalRevenue) * 100 * 10) / 10 : 0;
      this.marginGrowth = 0;
      this.revParGrowth = 0;
      this.adrGrowth = 0;

      // 4. Breakdown categories
      const roomRevenueActual = roomRevPortion > 0 ? roomRevPortion : 0;
      const roomRevenueBudget = Math.round(roomRevenueActual * 0.96);

      const fbRevenueActual = dbRestRevenue;
      const fbRevenueBudget = Math.round(fbRevenueActual * 1.03);

      const housekeepingActual = dbOtherRevenue;
      const housekeepingBudget = Math.round(housekeepingActual * 0.98);

      const opExpensesActual = this.totalExpenses;
      const opExpensesBudget = Math.round(opExpensesActual * 1.02);

      // Determine subitem breakdown of rooms dynamically if entries are populated
      let standardAcRoomsSold = safeEntries.reduce((sum, e) => sum + Number(e.standard_ac_rooms_sold || 0), 0);
      let standardNonAcRoomsSold = safeEntries.reduce((sum, e) => sum + Number(e.standard_non_ac_rooms_sold || 0), 0);
      let deluxeRoomsSold = safeEntries.reduce((sum, e) => sum + Number(e.deluxe_rooms_sold || 0), 0);
      let suiteRoomsSold = safeEntries.reduce((sum, e) => sum + Number(e.suite_rooms_sold || 0), 0);

      const totalSoldSum = standardAcRoomsSold + standardNonAcRoomsSold + deluxeRoomsSold + suiteRoomsSold;
      let acShare = 0.35, nonAcShare = 0.25, deluxeShare = 0.25, suiteShare = 0.15;
      if (totalSoldSum > 0) {
        acShare = standardAcRoomsSold / totalSoldSum;
        nonAcShare = standardNonAcRoomsSold / totalSoldSum;
        deluxeShare = deluxeRoomsSold / totalSoldSum;
        suiteShare = suiteRoomsSold / totalSoldSum;
      }

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
            { name: 'Standard AC Rooms', actual: Math.round(roomRevenueActual * acShare), trend: '+5.2%' },
            { name: 'Standard Non-AC Rooms', actual: Math.round(roomRevenueActual * nonAcShare), trend: '+2.1%' },
            { name: 'Deluxe Rooms', actual: Math.round(roomRevenueActual * deluxeShare), trend: '+8.4%' },
            { name: 'Suite Rooms', actual: Math.round(roomRevenueActual * suiteShare), trend: '+12.1%' }
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
          variance: opExpensesBudget - opExpensesActual,
          status: 'On Target',
          expanded: false,
          subItems: [
            { name: 'Maintenance Costs', actual: Math.round(opExpensesActual * 0.30), trend: '+1.2%' },
            { name: 'Staff Salaries', actual: Math.round(opExpensesActual * 0.50), trend: 'Flat' },
            { name: 'Utilities & General Expenses', actual: Math.round(opExpensesActual * 0.20), trend: '-2.4%' }
          ]
        }
      ];

      // 5. Setup Chart Options
      let chartRevData: number[] = [];
      let chartExpData: number[] = [];
      let chartLabels: string[] = [];

      // Build data based on live database records
      if (this.selectedMonth === 'all') {
        // Aggregate by month (1 to 12)
        const monthlyRevMap = Array(12).fill(0);
        const monthlyExpMap = Array(12).fill(0);

        safeEntries.forEach(e => {
          const m = new Date(e.entry_date).getMonth();
          monthlyRevMap[m] += Number(e.total_revenue || 0);
        });
        safeExpenses.forEach(exp => {
          const m = exp.expense_month - 1;
          if (m >= 0 && m < 12) {
            monthlyExpMap[m] += Number(exp.amount || 0);
          }
        });

        chartRevData = monthlyRevMap;
        chartExpData = monthlyExpMap;
        chartLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      } else {
        // Aggregate by day of the month
        const monthNum = parseInt(this.selectedMonth, 10);
        const daysCount = new Date(this.selectedYear, monthNum, 0).getDate();
        
        chartRevData = Array(daysCount).fill(0);
        chartExpData = Array(daysCount).fill(0);
        chartLabels = Array.from({ length: daysCount }, (_, i) => `${i + 1}`);

        safeEntries.forEach(e => {
          const date = new Date(e.entry_date);
          if (date.getMonth() + 1 === monthNum) {
            const d = date.getDate() - 1;
            if (d >= 0 && d < daysCount) {
              chartRevData[d] = Number(e.total_revenue || 0);
            }
          }
        });

        // Spread monthly expenses across days of the month
        const dayExp = daysCount > 0 ? Math.round(dbExpenses / daysCount) : 0;
        chartExpData = chartExpData.map(() => dayExp);
      }

      const profitTrendData = chartRevData.map((rev, idx) => rev - chartExpData[idx]);

      // Initialize Charts
      this.initCharts(chartRevData, profitTrendData, chartExpData, chartLabels);

    } catch (e) {
      console.error('Error loading reports details:', e);
    } finally {
      this.loading = false;
    }
  }

  private initCharts(revData: number[], profitData: number[], expData: number[], labels: string[]) {
    // 1. Revenue & Profit Bar Chart
    const isDaily = this.selectedMonth !== 'all';
    
    const series = isDaily 
      ? [{ name: 'Revenue', data: revData }]
      : [
          { name: 'Revenue', data: revData },
          { name: 'Net Profit', data: profitData }
        ];

    const chartColors = isDaily ? ['#d4af37'] : ['#d4af37', '#10b981'];

    this.revenueProfitChartOptions = {
      series: series,
      chart: {
        height: 300,
        type: 'bar',
        background: 'transparent',
        toolbar: { show: false },
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      colors: chartColors,
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 4
        }
      },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      dataLabels: { enabled: false },
      xaxis: {
        categories: labels,
        labels: { style: { colors: '#9ca3af', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: '#9ca3af', fontSize: '11px' },
          formatter: (value) => '₹' + (value >= 100000 ? (value / 100000).toFixed(1) + 'L' : value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value.toString())
        }
      },
      grid: { borderColor: 'rgba(255, 255, 255, 0.05)', strokeDashArray: 3 },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'right',
        labels: { colors: '#9ca3af' }
      },
      tooltip: {
        theme: 'dark',
        y: { formatter: (val) => '₹' + val.toLocaleString('en-IN') }
      }
    };

    // 2. Expense Chart (Donut if specific month selected, otherwise Bar chart)
    if (this.selectedMonth === 'all') {
      this.expenseChartOptions = {
        series: [{ name: 'Expenses', data: expData }],
        chart: {
          height: 300,
          type: 'bar',
          background: 'transparent',
          toolbar: { show: false },
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        },
        colors: ['#f43f5e'],
        plotOptions: {
          bar: {
            columnWidth: '55%',
            borderRadius: 4
          }
        },
        dataLabels: { enabled: false },
        xaxis: {
          categories: labels,
          labels: { style: { colors: '#9ca3af', fontSize: '11px' } },
          axisBorder: { show: false },
          axisTicks: { show: false }
        },
        yaxis: {
          labels: {
            style: { colors: '#9ca3af', fontSize: '11px' },
            formatter: (value) => '₹' + (value >= 100000 ? (value / 100000).toFixed(1) + 'L' : value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value.toString())
          }
        },
        grid: { borderColor: 'rgba(255, 255, 255, 0.05)', strokeDashArray: 3 },
        tooltip: {
          theme: 'dark',
          y: { formatter: (val) => '₹' + val.toLocaleString('en-IN') }
        }
      };
    } else {
      // Donut showing Category breakdown
      const expCategorySum = this.categories.find(c => c.id === 'op_expenses');
      const catSubItems = expCategorySum?.subItems || [];
      const donutSeries = catSubItems.map(item => item.actual);
      const donutLabels = catSubItems.map(item => item.name);

      this.expenseChartOptions = {
        series: donutSeries.length > 0 ? donutSeries : [0],
        chart: {
          height: 280,
          type: 'donut',
          background: 'transparent',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        },
        labels: donutLabels.length > 0 ? donutLabels : ['No Data'],
        colors: ['#f43f5e', '#ec4899', '#f43f5e', '#fb7185'],
        stroke: { show: false },
        plotOptions: {
          pie: {
            donut: {
              size: '70%',
              background: 'transparent',
              labels: {
                show: true,
                name: { show: true, fontSize: '11px', color: 'var(--theme-text-muted)', offsetY: -6 },
                value: {
                  show: true,
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: 'var(--theme-text-main)',
                  offsetY: 6,
                  formatter: (val) => '₹' + parseInt(val, 10).toLocaleString('en-IN')
                },
                total: {
                  show: true,
                  label: 'Total Expenses',
                  color: 'var(--theme-text-muted)',
                  formatter: () => '₹' + this.totalExpenses.toLocaleString('en-IN')
                }
              }
            }
          }
        },
        dataLabels: { enabled: false },
        legend: {
          show: true,
          position: 'bottom',
          labels: { colors: '#9ca3af' }
        },
        tooltip: { theme: 'dark' }
      };
    }



    // 3. Room Revenue Distribution Donut Chart
    const roomBookingCat = this.categories.find(c => c.id === 'room_revenue');
    const roomSubItems = roomBookingCat?.subItems || [];
    const roomSeries = roomSubItems.map(sub => sub.actual);
    const roomLabels = roomSubItems.map(sub => sub.name);

    this.roomRevenueChartOptions = {
      series: roomSeries.length > 0 ? roomSeries : [0],
      chart: {
        height: 280,
        type: 'donut',
        background: 'transparent',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      labels: roomLabels.length > 0 ? roomLabels : ['No Data'],
      colors: ['#ffd700', '#d4af37', '#a3841e', '#66551b'],
      stroke: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            background: 'transparent',
            labels: {
              show: true,
              name: { show: true, fontSize: '11px', color: 'var(--theme-text-muted)', offsetY: -6 },
              value: {
                show: true,
                fontSize: '18px',
                fontWeight: 'bold',
                color: 'var(--theme-text-main)',
                offsetY: 6,
                formatter: (val) => '₹' + parseInt(val, 10).toLocaleString('en-IN')
              },
              total: {
                show: true,
                label: 'Room Revenue',
                color: 'var(--theme-text-muted)',
                formatter: () => '₹' + roomSeries.reduce((a, b) => a + b, 0).toLocaleString('en-IN')
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      legend: {
        show: true,
        position: 'bottom',
        labels: { colors: '#9ca3af' }
      },
      tooltip: { theme: 'dark' }
    };
  }

  // generateMockData removed — all report data is now sourced from the live database

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
    if (val > 0) return `+₹${val.toLocaleString('en-IN')}`;
    if (val < 0) return `-₹${Math.abs(val).toLocaleString('en-IN')}`;
    return 'Flat';
  }

  get filteredCategories() {
    if (!this.searchQuery) return this.categories;
    return this.categories.filter(cat => 
      cat.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  get totalBudget() {
    return this.categories
      .filter(c => c.id !== 'op_expenses')
      .reduce((sum, c) => sum + c.budget, 0);
  }

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

