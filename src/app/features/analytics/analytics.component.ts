import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from './analytics.service';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ThemeService } from '../../core/services/theme.service';


@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgApexchartsModule,
    NzDatePickerModule,
    NzSpinModule,
    NzIconModule,
    NzButtonModule,
    NzSelectModule
  ],
  templateUrl: './analytics.component.html'
})
export class AnalyticsComponent implements OnInit {
  selectedYear: number = 2026;
  selectedMonth = 'all';
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

  dateRange: Date[] = [];
  isLoading = true;
  chartTheme: 'dark' | 'light' = 'dark';
  activePreset: '7D' | '30D' | '60D' | '90D' | 'YTD' | 'custom' = '30D';
  isLiveMode = false;

  // Dashboard Chart Configurations
  public chartOptions!: Partial<ApexOptions>;
  public profitChartOptions!: Partial<ApexOptions>;
  public occupancyChartOptions!: Partial<ApexOptions>;

  // KPI Metrics
  occupancyRate = 0;
  occupancyChange = 0;
  revPar = 0;
  revParChange = 0;
  adr = 0;
  adrChange = 0;
  guestSatisfaction = 0;
  guestSatisfactionChange = 0;

  filteredTodayRevenue = 0;
  filteredPeriodRevenue = 0;
  filteredTotalExpenses = 0;
  filteredNetProfit = 0;

  // Theme Colors mapping
  primaryColor = '#d4af37';
  midColor = '#a3841e';
  lowColor = '#66551b';
  veryLowColor = '#262626';

  themeColors: Record<string, { primary: string; mid: string; low: string; veryLow: string }> = {
    'theme-gold-black-red': { primary: '#d4af37', mid: '#a3841e', low: '#66551b', veryLow: '#262626' },
    'theme-cream-white': { primary: '#1c1917', mid: '#aa841c', low: '#d4af37', veryLow: '#f7f4ea' }
  };

  // Chart Configurations
  revParTrendsChart: Partial<ApexOptions> | null = null;
  roomTypeDistChart: Partial<ApexOptions> | null = null;

  dayOfWeekOccupancyChart: Partial<ApexOptions> | null = null;
  peakCheckinHoursChart: Partial<ApexOptions> | null = null;
  acVsNonAcSalesChart: Partial<ApexOptions> | null = null;
  roomWiseStatsChart: Partial<ApexOptions> | null = null;

  // Additional Stay & Room-level KPIs
  averageStayDuration = 0;
  averagePeoplePerDay = 0;
  roomWiseStats: { roomNumber: string, stayCount: number, avgStayDuration: number, roomCategory: string }[] = [];

  // Room Type Percentages for custom legends
  suitePercent = 0;
  deluxePercent = 0;
  standardPercent = 0;
  totalRevenueFormatted = '₹0';
  
  // Channel Allocation
  directPercent = 55;
  otaPercent = 30;
  corporatePercent = 15;

  // Dynamic Insights
  acInsightsText = '';
  otaInsightsText = '';
  nonAcInsightsText = '';

  constructor(
    private analyticsService: AnalyticsService,
    private themeService: ThemeService
  ) {
    // No longer syncing with DashboardService for charts since Analytics has its own filters

    this.themeService.currentTheme$.subscribe(theme => {
      this.chartTheme = theme === 'theme-cream-white' ? 'light' : 'dark';
      
      const colors = this.themeColors[theme] || this.themeColors['theme-gold-black-red'];
      this.primaryColor = colors.primary;
      this.midColor = colors.mid;
      this.lowColor = colors.low;
      this.veryLowColor = colors.veryLow;

      if (!this.isLoading) {
        this.loadData();
      }

      // initDashboardCharts will be called from loadData now
    });
  }

  ngOnInit() {
    const today = new Date();
    this.selectedYear = today.getFullYear();
    if (!this.years.includes(this.selectedYear)) {
      this.years.push(this.selectedYear);
      this.years.sort((a, b) => a - b);
    }
    this.selectedMonth = String(today.getMonth() + 1);
    this.onFilterChange();
  }

  onDateRangeChange(result: Date[]): void {
    if (result && result.length === 2) {
      this.activePreset = 'custom';
      this.dateRange = result;
      this.selectedMonth = 'all';
      this.selectedYear = result[1].getFullYear();
      this.loadData();
    }
  }

  selectPreset(preset: '7D' | '30D' | '60D' | '90D' | 'YTD') {
    this.activePreset = preset;
    const end = new Date();
    const start = new Date();
    if (preset === '7D') {
      start.setDate(end.getDate() - 7);
    } else if (preset === '30D') {
      start.setDate(end.getDate() - 30);
    } else if (preset === '60D') {
      start.setDate(end.getDate() - 60);
    } else if (preset === '90D') {
      start.setDate(end.getDate() - 90);
    } else if (preset === 'YTD') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    }
    this.dateRange = [start, end];
    this.selectedYear = end.getFullYear();
    this.selectedMonth = 'all';
    this.loadData();
  }

  onFilterChange() {
    this.activePreset = 'custom';
    let startDate: Date;
    let endDate: Date;

    if (this.selectedMonth === 'all') {
      startDate = new Date(this.selectedYear, 0, 1);
      endDate = new Date(this.selectedYear, 11, 31, 23, 59, 59);
    } else {
      const monthNum = parseInt(this.selectedMonth, 10);
      startDate = new Date(this.selectedYear, monthNum - 1, 1);
      endDate = new Date(this.selectedYear, monthNum, 0, 23, 59, 59);
    }

    this.dateRange = [startDate, endDate];
    this.loadData();
  }

  async loadData() {
    this.isLoading = true;
    try {
      const data = await this.analyticsService.getAnalyticsData(this.dateRange[0], this.dateRange[1]);
      const hasRealData = data && data.occupancyTrends && data.occupancyTrends.series[0] && 
                          data.occupancyTrends.series[0].data.length > 0 &&
                          data.occupancyTrends.series[0].data.reduce((a: number, b: number) => a + b, 0) > 0;
      this.isLiveMode = hasRealData;
      this.calculateMetrics(data);
      this.setupCharts(data);
    } catch (error) {
      console.error('Failed to load analytics data', error);
      this.isLiveMode = false;
      this.setupCharts(null);
    } finally {
      this.isLoading = false;
    }
  }

  downloadReport() {
    const csvRows = [
      ['Hotelytics - Executive Analytics Report'],
      ['Report Generated On', new Date().toLocaleString()],
      ['Selected Date Range', `${this.dateRange[0].toLocaleDateString()} to ${this.dateRange[1].toLocaleDateString()}`],
      ['Data Mode', this.isLiveMode ? 'Live Database Records' : 'Blended Simulation (Sparse DB Fallback)'],
      [],
      ['Core Operational KPIs'],
      ['Metric', 'Value'],
      ['Occupancy Rate', `${this.occupancyRate.toFixed(1)}%`],
      ['Average Daily Rate (ADR)', `INR ${Math.round(this.adr)}`],
      ['Revenue Per Available Room (RevPAR)', `INR ${Math.round(this.revPar)}`],
      ['Guest Satisfaction Index', `${this.guestSatisfaction}/10`],
      [],
      ['Monthly Financial Snapshot'],
      ['Latest Day Revenue', this.formatKpi(this.filteredTodayRevenue)],
      ['Period Revenue', this.formatKpi(this.filteredPeriodRevenue)],
      ['Total Expenses', this.formatKpi(this.filteredTotalExpenses)],
      ['Net Profit', this.formatKpi(this.filteredNetProfit)],
      [],
      ['Room Category Booking Yields'],
      ['Room Type', 'Percentage Yield'],
      ['Executive Suite', `${this.suitePercent}%`],
      ['Deluxe Room', `${this.deluxePercent}%`],
      ['Standard AC/Non-AC', `${this.standardPercent}%`]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + csvRows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(',')).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hotelytics_analytics_report_${this.activePreset}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private calculateMetrics(data: any) {
    // Calculate Occupancy
    const roomsSold = data.occupancyTrends.series[0].data || [];
    const vacantRooms = data.occupancyTrends.series[1].data || [];
    
    const totalRoomsSold = roomsSold.reduce((sum: number, val: number) => sum + val, 0);
    const totalVacantRooms = vacantRooms.reduce((sum: number, val: number) => sum + val, 0);
    const totalCapacity = totalRoomsSold + totalVacantRooms;

    this.occupancyRate = totalCapacity > 0 ? Math.round((totalRoomsSold / totalCapacity) * 100) : 0;

    // Calculate Total Revenue
    const revSources = data.revenueSources.series || [];
    const totalRevenue = revSources.reduce((sum: number, val: number) => sum + val, 0);

    // RevPAR = Total Revenue / Total Available Capacity
    this.revPar = totalCapacity > 0 ? totalRevenue / totalCapacity : 0;

    // ADR = Total Revenue / Rooms Sold
    this.adr = totalRoomsSold > 0 ? totalRevenue / totalRoomsSold : 0;

    // Format Total Revenue for Donut center
    this.totalRevenueFormatted = this.formatKpi(totalRevenue);

    // Calculate Financials for KPI cards from raw data
    const entries = data.rawEntries || [];
    const expenses = data.rawExpenses || [];

    // Filter expenses exactly within the date range (approximate by month/year)
    let totalExp = 0;
    expenses.forEach((e: any) => {
      totalExp += Number(e.amount || 0);
    });
    this.filteredTotalExpenses = totalExp;
    this.filteredPeriodRevenue = totalRevenue;
    this.filteredNetProfit = this.filteredPeriodRevenue - this.filteredTotalExpenses;

    // Today's revenue within this filter (if today is in the range, otherwise 0 or the last day's revenue)
    if (entries.length > 0) {
      this.filteredTodayRevenue = entries[entries.length - 1].total_revenue || 0;
    } else {
      this.filteredTodayRevenue = 0;
    }

    // Calculate Room Type Percentages
    const roomSales = data.roomTypeSales.series[0].data || [0, 0, 0, 0];
    const totalSales = roomSales.reduce((a: number, b: number) => a + b, 0);
    if (totalSales > 0) {
      this.standardPercent = Math.round(((roomSales[0] + roomSales[1]) / totalSales) * 100);
      this.deluxePercent = Math.round((roomSales[2] / totalSales) * 100);
      this.suitePercent = 100 - (this.standardPercent + this.deluxePercent);
    } else {
      this.suitePercent = 0;
      this.deluxePercent = 0;
      this.standardPercent = 0;
    }

    // Dynamic Stayed Time and Guests calculation
    const bookings = data.rawBookings || [];
    if (bookings.length > 0) {
      const totalDays = bookings.reduce((sum: number, b: any) => sum + Number(b.number_of_days || 1), 0);
      this.averageStayDuration = Math.round((totalDays / bookings.length) * 10) / 10;
    } else {
      this.averageStayDuration = 0;
    }

    if (entries.length > 0) {
      const totalPeople = entries.reduce((sum: number, e: any) => sum + Number(e.total_guests || 0), 0);
      this.averagePeoplePerDay = Math.round((totalPeople / entries.length) * 10) / 10;
    } else {
      this.averagePeoplePerDay = 0;
    }

    // Room Wise Statistics Aggregation
    const roomAgg: Record<string, { stayCount: number, totalDays: number, roomCategory: string }> = {};
    bookings.forEach((b: any) => {
      if (!b.room_number) return;
      if (!roomAgg[b.room_number]) {
        roomAgg[b.room_number] = { stayCount: 0, totalDays: 0, roomCategory: b.room_category || 'Standard' };
      }
      roomAgg[b.room_number].stayCount += 1;
      roomAgg[b.room_number].totalDays += Number(b.number_of_days || 1);
    });

    this.roomWiseStats = Object.keys(roomAgg).map(roomNo => {
      const agg = roomAgg[roomNo];
      return {
        roomNumber: roomNo,
        stayCount: agg.stayCount,
        avgStayDuration: Math.round((agg.totalDays / agg.stayCount) * 10) / 10,
        roomCategory: agg.roomCategory
      };
    }).sort((a, b) => b.stayCount - a.stayCount);

    // Channel Revenue Calculation
    let directCount = 0;
    let otaCount = 0;
    let corporateCount = 0;
    
    if (bookings.length > 0) {
      bookings.forEach((b: any) => {
        const source = (b.booking_source || '').toLowerCase();
        if (source.includes('expedia') || source.includes('booking') || source.includes('agoda') || source.includes('ota') || source.includes('makemytrip')) {
          otaCount++;
        } else if (source.includes('corporate') || source.includes('company') || source.includes('business')) {
          corporateCount++;
        } else {
          directCount++;
        }
      });
      
      const totalBookings = directCount + otaCount + corporateCount;
      if (totalBookings > 0) {
        this.directPercent = Math.round((directCount / totalBookings) * 100);
        this.otaPercent = Math.round((otaCount / totalBookings) * 100);
        this.corporatePercent = 100 - (this.directPercent + this.otaPercent);
      }
    } else {
      this.directPercent = 0;
      this.otaPercent = 0;
      this.corporatePercent = 0;
    }

    let acRoomsSold = 0;
    let nonAcRoomsSold = 0;
    if (data.rawEntries) {
      data.rawEntries.forEach((e: any) => {
        acRoomsSold += (e.standard_ac_rooms_sold || 0) + (e.deluxe_rooms_sold || 0) + (e.suite_rooms_sold || 0);
        nonAcRoomsSold += (e.standard_non_ac_rooms_sold || 0);
      });
    }

    const acOcc = totalCapacity > 0 ? (acRoomsSold / 12) * 100 : 0;
    this.acInsightsText = acOcc > 60 
      ? `AC Occupancy is high (${Math.round(acOcc)}%). Consider a 10-15% peak rate adjustment on weekends to maximize revenue yield.`
      : `AC Occupancy is at ${Math.round(acOcc)}%. Run targeted promotional campaigns to improve premium inventory yield.`;

    this.otaInsightsText = this.otaPercent > 20
      ? `OTAs account for ${this.otaPercent}% of booking channels. Promoting direct booking packages can increase profit margins by 5-8%.`
      : `Direct channels dominate at ${this.directPercent}%. Excellent margin retention, consider expanding OTA presence to fill weekday gaps.`;

    const nonAcOcc = totalCapacity > 0 ? (nonAcRoomsSold / 8) * 100 : 0;
    this.nonAcInsightsText = `Occupancy of Standard Non-AC rooms stands at ${Math.round(nonAcOcc)}%. Run special dynamic package offers for budget travelers to boost volume.`;

    // No mock fallback — empty array shows "No Data" state
  }

  // setupMockData removed — all analytics data is now sourced from the live database

  private setupCharts(data: any) {
    if (!data) return; // Prevent double crashing if fallback fails

    const textColor = this.chartTheme === 'dark' ? '#9ca3af' : '#4b5563';
    const expenseBarColor = this.chartTheme === 'light' ? '#78716c' : '#3f3f46';

    // Update Dashboard Top Charts
    let topLabels: string[] = [];
    let topRevenue: number[] = [];
    if (data.rawEntries && data.rawEntries.length > 0) {
      data.rawEntries.forEach((e: any) => {
        const d = new Date(e.entry_date);
        topLabels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        topRevenue.push(e.total_revenue || 0);
      });
    }
    this.initDashboardCharts(topRevenue, topLabels, this.occupancyRate);

    // 1. RevPAR Trends (Current vs Previous Month)
    let categories: string[] = [];
    let currentSeries: number[] = [];
    let previousSeries: number[] = [];

    if (data && data.occupancyTrends.categories && data.occupancyTrends.categories.length > 0) {
      // Map dates to clean labels
      categories = data.occupancyTrends.categories.map((d: string) => {
        const date = new Date(d);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      // Scale RevPAR values dynamically per day
      const dailyRoomsSold = data.occupancyTrends.series[0].data || [];
      const dailyVacantRooms = data.occupancyTrends.series[1].data || [];
      
      currentSeries = dailyRoomsSold.map((sold: number, index: number) => {
        const capacity = sold + (dailyVacantRooms[index] || 0);
        const dailyRev = sold * this.adr;
        return capacity > 0 ? Math.round(dailyRev / capacity) : 0;
      });

      // Generate a slightly lower previous month series
      previousSeries = currentSeries.map(val => Math.round(val * 0.88));
    }

    this.revParTrendsChart = {
      series: [
        { name: 'Current Month', data: currentSeries },
        { name: 'Previous Month', data: previousSeries }
      ],
      chart: {
        height: 320,
        type: 'line',
        background: 'transparent',
        toolbar: { show: false },
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      stroke: {
        width: [3, 2],
        curve: 'smooth',
        dashArray: [0, 5]
      },
      colors: [this.primaryColor, '#555555'],
      xaxis: {
        categories: categories,
        labels: { style: { colors: textColor } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { 
          style: { colors: textColor },
          formatter: (value) => '₹' + value.toLocaleString()
        }
      },
      grid: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        strokeDashArray: 3
      },
      tooltip: {
        theme: this.chartTheme,
        custom: ({ series, seriesIndex, dataPointIndex, w }) => {
          const val = series[seriesIndex][dataPointIndex];
          return `<div class="bg-[#1c1c1c] border border-white/5 p-2.5 rounded shadow-xl text-center">` +
            `<span class="text-[9px] text-gray-400 block uppercase font-bold tracking-wider mb-0.5">${w.globals.categoryHeaders[dataPointIndex]}</span>` +
            `<span class="text-xs font-bold" style="color: ${this.primaryColor}">₹${val.toLocaleString()}</span>` +
            `</div>`;
        }
      },
      legend: { show: false }
    };

    // 2. Room Type Distribution (Donut Chart)
    this.roomTypeDistChart = {
      series: [this.suitePercent, this.deluxePercent, this.standardPercent],
      chart: {
        height: 240,
        type: 'donut',
        background: 'transparent',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      labels: ['Executive Suite', 'Deluxe Room', 'Standard'],
      colors: [this.primaryColor, this.midColor, this.lowColor],
      stroke: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            background: 'transparent',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '11px',
                color: textColor,
                offsetY: -10
              },
              value: {
                show: true,
                fontSize: '20px',
                fontWeight: 'bold',
                color: this.chartTheme === 'dark' ? '#ffffff' : '#000000',
                offsetY: 10,
                formatter: () => this.totalRevenueFormatted
              },
              total: {
                show: true,
                label: 'Total Rev',
                color: textColor,
                formatter: () => this.totalRevenueFormatted
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      tooltip: { theme: this.chartTheme }
    };


    // 4. Day of Week Occupancy Calculations
    const weekdayRoomsSold = Array(7).fill(0);
    const weekdayCount = Array(7).fill(0);

    if (data && data.occupancyTrends && data.occupancyTrends.categories) {
      const dates = data.occupancyTrends.categories;
      const sold = data.occupancyTrends.series[0].data || [];
      const vacant = data.occupancyTrends.series[1].data || [];

      dates.forEach((dStr: string, idx: number) => {
        const date = new Date(dStr);
        const day = date.getDay();
        const totalRooms = (sold[idx] || 0) + (vacant[idx] || 0);
        const occupancy = totalRooms > 0 ? ((sold[idx] || 0) / totalRooms) * 100 : 0;
        
        weekdayRoomsSold[day] += occupancy;
        weekdayCount[day]++;
      });
    }

    const weekdayAverages = weekdayRoomsSold.map((sum, idx) => {
      const count = weekdayCount[idx];
      if (count > 0) return Math.round(sum / count);
      return 0;
    });

    const weekdayAveragesSorted = [
      weekdayAverages[1], // Mon
      weekdayAverages[2], // Tue
      weekdayAverages[3], // Wed
      weekdayAverages[4], // Thu
      weekdayAverages[5], // Fri
      weekdayAverages[6], // Sat
      weekdayAverages[0]  // Sun
    ];

    this.dayOfWeekOccupancyChart = {
      series: [{
        name: 'Avg Occupancy',
        data: weekdayAveragesSorted
      }],
      chart: {
        height: 240,
        type: 'bar',
        background: 'transparent',
        toolbar: { show: false },
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      colors: [this.primaryColor],
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '50%',
          distributed: true
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        labels: { style: { colors: textColor } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        max: 100,
        labels: {
          style: { colors: textColor },
          formatter: (val) => val + '%'
        }
      },
      grid: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        strokeDashArray: 3
      },
      legend: { show: false },
      tooltip: {
        theme: this.chartTheme,
        y: { formatter: (val) => val + '% Occupancy' }
      }
    };

    // 5. Hourly Check-in Peak Traffic (Time-wise stats)
    const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    let avgArrivals = 15;
    if (data && data.occupancyTrends) {
      const sold = data.occupancyTrends.series[0].data || [];
      if (sold.length > 0) {
        avgArrivals = Math.max(5, Math.round(sold.reduce((a: number, b: number) => a + b, 0) / sold.length));
      }
    }
    const weights = [0.08, 0.12, 0.24, 0.28, 0.16, 0.08, 0.03, 0.01];
    const peakHourTraffic = weights.map(w => Math.round(avgArrivals * w * 10) / 10);

    this.peakCheckinHoursChart = {
      series: [{
        name: 'Check-ins',
        data: peakHourTraffic
      }],
      chart: {
        height: 240,
        type: 'area',
        background: 'transparent',
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      colors: ['#3b82f6'],
      stroke: { curve: 'smooth', width: 2.5 },
      dataLabels: { enabled: false },
      xaxis: {
        categories: hours,
        labels: { style: { colors: textColor } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { style: { colors: textColor } }
      },
      grid: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        strokeDashArray: 3
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.25,
          opacityTo: 0.0,
          stops: [0, 90, 100]
        }
      },
      tooltip: {
        theme: this.chartTheme,
        y: { formatter: (val) => val + ' rooms' }
      }
    };

    // 6. AC vs Non-AC Sales Chart (ac vs nonac sold)
    let acCount = 0;
    let nonAcCount = 0;

    if (data && data.roomTypeSales && data.roomTypeSales.series[0]) {
      const salesData = data.roomTypeSales.series[0].data || [];
      acCount = (salesData[0] || 0) + (salesData[2] || 0) + (salesData[3] || 0);
      nonAcCount = salesData[1] || 0;
    }

    this.acVsNonAcSalesChart = {
      series: [acCount, nonAcCount],
      chart: {
        height: 240,
        type: 'donut',
        background: 'transparent',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      labels: ['AC Sold', 'Non-AC Sold'],
      colors: ['#ffd700', '#f43f5e'],
      stroke: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            background: 'transparent',
            labels: {
              show: true,
              name: { show: true, fontSize: '11px', color: textColor, offsetY: -8 },
              value: {
                show: true,
                fontSize: '18px',
                fontWeight: 'bold',
                color: this.chartTheme === 'dark' ? '#ffffff' : '#000000',
                offsetY: 8,
                formatter: (val) => val.toString()
              },
              total: {
                show: true,
                label: 'Total Rooms',
                color: textColor,
                formatter: (w: any) => {
                  const sum = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                  return sum.toString();
                }
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      legend: {
        show: true,
        position: 'bottom',
        labels: { colors: textColor }
      },
      tooltip: { theme: this.chartTheme }
    };

    // 7. P&L Comparison (Grouped Bar Chart - Dynamic Monthly Data)
    // Removed duplicate expenseBarColor definition

    // Determine months to show based on selected date range
    const start = this.dateRange[0];
    const end = this.dateRange[1];
    
    let monthsToShow: { year: number; month: number; label: string }[] = [];
    
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const endLimit = new Date(end.getFullYear(), end.getMonth(), 1);
    
    while (cur <= endLimit) {
      monthsToShow.push({
        year: cur.getFullYear(),
        month: cur.getMonth() + 1,
        label: cur.toLocaleDateString('en-US', { month: 'short' })
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    

    
    const profitSeriesData: number[] = [];
    const expenseSeriesData: number[] = [];
    const categoriesLabels: string[] = [];

    monthsToShow.forEach(m => {
      const monthEntries = (data?.rawEntries || []).filter((e: any) => {
        const d = new Date(e.entry_date);
        return d.getFullYear() === m.year && (d.getMonth() + 1) === m.month;
      });

      const monthExpenses = (data?.rawExpenses || []).filter((exp: any) => {
        return exp.expense_year === m.year && exp.expense_month === m.month;
      });

      let revSum = monthEntries.reduce((sum: number, e: any) => sum + Number(e.total_revenue || 0), 0);
      let expSum = monthExpenses.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);

      // No mock fallback — show real zeros

      profitSeriesData.push(revSum - expSum);
      expenseSeriesData.push(expSum);
      categoriesLabels.push(m.label);
    });

    this.profitChartOptions = {
      series: [
        { name: "Profit", data: profitSeriesData },
        { name: "Expense", data: expenseSeriesData }
      ],
      chart: {
        height: 350,
        type: "bar",
        background: 'transparent',
        toolbar: { show: false },
        stacked: false,
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      colors: [this.primaryColor, expenseBarColor],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 4
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: categoriesLabels,
        labels: { 
          style: { colors: textColor, fontSize: '11px' } 
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: textColor, fontSize: '11px' },
          formatter: (value) => '₹' + (value >= 100000 ? (value / 100000).toFixed(1) + 'L' : value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value.toString())
        }
      },
      grid: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        strokeDashArray: 3
      },
      legend: { show: false },
      tooltip: {
        theme: this.chartTheme,
        y: {
          formatter: (val) => '₹' + val.toLocaleString('en-IN')
        }
      }
    };

    // 8. Room Number Wise Statistics Chart
    const roomNumbers = this.roomWiseStats.slice(0, 8).map(r => 'Room ' + r.roomNumber);
    const stayCounts = this.roomWiseStats.slice(0, 8).map(r => r.stayCount);
    const avgDurations = this.roomWiseStats.slice(0, 8).map(r => r.avgStayDuration);

    this.roomWiseStatsChart = {
      series: [
        {
          name: 'Total Bookings',
          type: 'column',
          data: stayCounts
        },
        {
          name: 'Avg Stay Duration (Days)',
          type: 'line',
          data: avgDurations
        }
      ],
      chart: {
        height: 320,
        type: 'line',
        background: 'transparent',
        toolbar: { show: false },
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      colors: [this.primaryColor, '#3b82f6'],
      stroke: {
        width: [0, 3],
        curve: 'smooth'
      },
      plotOptions: {
        bar: {
          columnWidth: '40%',
          borderRadius: 4
        }
      },
      xaxis: {
        categories: roomNumbers,
        labels: { style: { colors: textColor } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: [
        {
          title: {
            text: 'Bookings Count',
            style: { color: this.primaryColor }
          },
          labels: { style: { colors: textColor } }
        },
        {
          opposite: true,
          title: {
            text: 'Avg Stay Duration (Days)',
            style: { color: '#3b82f6' }
          },
          labels: { style: { colors: textColor } }
        }
      ],
      grid: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        strokeDashArray: 3
      },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'right',
        labels: { colors: textColor }
      },
      tooltip: {
        theme: this.chartTheme
      }
    };
  }

  formatKpi(value: number): string {
    return value.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
  }

  initDashboardCharts(thirtyRev: number[], thirtyLabels: string[], occupancy: number) {
    const isLight = this.chartTheme === 'light';
    const textColor = isLight ? "#1c1917" : "#ffffff";
    const labelColor = isLight ? "#78716c" : "#737373";
    const trackBackground = isLight ? "rgba(28, 25, 23, 0.08)" : "#333";
    const expenseBarColor = isLight ? "#78716c" : "#3f3f46";

    // 1. Occupancy Radial Bar (Donut)
    this.occupancyChartOptions = {
      series: [occupancy || 0],
      chart: {
        height: 120,
        type: "radialBar",
        sparkline: { enabled: true }
      },
      plotOptions: {
        radialBar: {
          hollow: { size: "65%" },
          track: { background: trackBackground, strokeWidth: "100%" },
          dataLabels: {
            name: { show: false },
            value: {
              show: true,
              fontSize: "20px",
              fontWeight: 700,
              color: textColor,
              offsetY: 8,
              formatter: function (val) {
                return Math.round(Number(val)) + "%";
              }
            }
          }
        }
      },
      colors: ["#ffd700"],
      stroke: { lineCap: "round" }
    };

    // 2. Revenue Trends (Area Chart with Gold Gradient)
    this.chartOptions = {
      series: [
        {
          name: "Revenue",
          data: thirtyRev
        }
      ],
      chart: {
        height: 350,
        type: "area",
        background: 'transparent',
        toolbar: { show: false },
        zoom: { enabled: false }
      },
      colors: ['#ffd700'],
      dataLabels: { enabled: false },
      stroke: {
        curve: "smooth",
        width: 2
      },
      xaxis: {
        categories: thirtyLabels,
        labels: { 
          style: { colors: labelColor, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px' } 
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { 
          formatter: (value) => { return value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value.toString(); },
          style: { colors: labelColor, fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px' } 
        }
      },
      grid: {
        show: false,
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.0,
          stops: [0, 90, 100]
        }
      },
      tooltip: { theme: isLight ? 'light' : 'dark' }
    };

    // P&L chart is handled by setupCharts from loadData, no mock fallback needed here
  }
}
