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
import { DashboardService } from '../dashboard/dashboard.service';

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
  dateRange: Date[] = [];
  isLoading = true;
  chartTheme: 'dark' | 'light' = 'dark';

  // Dashboard Chart Configurations
  public chartOptions!: Partial<ApexOptions>;
  public profitChartOptions!: Partial<ApexOptions>;
  public occupancyChartOptions!: Partial<ApexOptions>;

  // KPI Metrics
  occupancyRate = 0;
  occupancyChange = 2.4;
  revPar = 0;
  revParChange = 5.1;
  adr = 0;
  adrChange = 0.0;
  guestSatisfaction = 9.4;
  guestSatisfactionChange = 0.2;

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
  occupancyHeatmapChart: Partial<ApexOptions> | null = null;

  // Room Type Percentages for custom legends
  suitePercent = 42;
  deluxePercent = 35;
  standardPercent = 23;
  totalRevenueFormatted = '₹12,00,000';

  constructor(
    private analyticsService: AnalyticsService,
    private themeService: ThemeService,
    public dashboardService: DashboardService
  ) {
    effect(() => {
      const thirtyRev = this.dashboardService.thirtyDayRevenue();
      const thirtyLabels = this.dashboardService.thirtyDayLabels();
      const qProfit = this.dashboardService.quarterlyProfit();
      const qExpense = this.dashboardService.quarterlyExpense();
      const kpis = this.dashboardService.kpis();
      
      if (thirtyRev.length > 0) {
        this.initDashboardCharts(thirtyRev, thirtyLabels, qProfit, qExpense, kpis.occupancyPercentage);
      }
    });

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

      const thirtyRev = this.dashboardService.thirtyDayRevenue();
      const thirtyLabels = this.dashboardService.thirtyDayLabels();
      const qProfit = this.dashboardService.quarterlyProfit();
      const qExpense = this.dashboardService.quarterlyExpense();
      const kpis = this.dashboardService.kpis();
      if (thirtyRev.length > 0) {
        this.initDashboardCharts(thirtyRev, thirtyLabels, qProfit, qExpense, kpis.occupancyPercentage);
      }
    });
  }

  ngOnInit() {
    // Default to last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    this.dateRange = [start, end];
    this.loadData();
    this.dashboardService.loadDashboardData();
  }

  onDateRangeChange(result: Date[]): void {
    if (result && result.length === 2) {
      this.dateRange = result;
      this.loadData();
    }
  }

  async loadData() {
    this.isLoading = true;
    try {
      const data = await this.analyticsService.getAnalyticsData(this.dateRange[0], this.dateRange[1]);
      this.calculateMetrics(data);
      this.setupCharts(data);
    } catch (error) {
      console.error('Failed to load analytics data', error);
      // Fallback to demo numbers if no data
      this.setupMockData();
    } finally {
      this.isLoading = false;
    }
  }

  private calculateMetrics(data: any) {
    // Calculate Occupancy
    const roomsSold = data.occupancyTrends.series[0].data || [];
    const vacantRooms = data.occupancyTrends.series[1].data || [];
    
    const totalRoomsSold = roomsSold.reduce((sum: number, val: number) => sum + val, 0);
    const totalVacantRooms = vacantRooms.reduce((sum: number, val: number) => sum + val, 0);
    const totalCapacity = totalRoomsSold + totalVacantRooms;

    this.occupancyRate = totalCapacity > 0 ? (totalRoomsSold / totalCapacity) * 100 : 84.2;

    // Calculate Total Revenue
    const revSources = data.revenueSources.series || [];
    const totalRevenue = revSources.reduce((sum: number, val: number) => sum + val, 0);

    // RevPAR = Total Revenue / Total Available Capacity
    this.revPar = totalCapacity > 0 ? totalRevenue / totalCapacity : 3120;

    // ADR = Total Revenue / Rooms Sold
    this.adr = totalRoomsSold > 0 ? totalRevenue / totalRoomsSold : 3700;

    // Format Total Revenue for Donut center
    this.totalRevenueFormatted = this.formatKpi(totalRevenue > 0 ? totalRevenue : 1200000);

    // Calculate Room Type Percentages
    const roomSales = data.roomTypeSales.series[0].data || [0, 0, 0, 0];
    const totalSales = roomSales.reduce((a: number, b: number) => a + b, 0);
    if (totalSales > 0) {
      this.standardPercent = Math.round(((roomSales[0] + roomSales[1]) / totalSales) * 100);
      this.deluxePercent = Math.round((roomSales[2] / totalSales) * 100);
      this.suitePercent = 100 - (this.standardPercent + this.deluxePercent);
    } else {
      this.suitePercent = 42;
      this.deluxePercent = 35;
      this.standardPercent = 23;
    }
  }

  private setupMockData() {
    this.occupancyRate = 84.2;
    this.revPar = 3120;
    this.adr = 3700;
    this.guestSatisfaction = 9.4;
    this.totalRevenueFormatted = '₹12,00,000';
    this.setupCharts(null);
  }

  private setupCharts(data: any) {
    const textColor = this.chartTheme === 'dark' ? '#9ca3af' : '#4b5563';

    // 1. RevPAR Trends (Current vs Previous Month)
    let categories = ['Oct 01', 'Oct 05', 'Oct 10', 'Oct 15', 'Oct 20', 'Oct 25', 'Oct 30'];
    let currentSeries = [2100, 2400, 2200, 2800, 3100, 3050, 3450];
    let previousSeries = [1900, 2050, 2300, 2450, 2600, 2750, 2900];

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
        fontFamily: "'Hanken Grotesk', sans-serif"
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
        fontFamily: "'Hanken Grotesk', sans-serif"
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

    // 3. Occupancy Heatmap (Mon-Sun vs Morn/Aftn/Eve)
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const timeOfDay = ['Eve', 'Aftn', 'Morn']; // Rendered bottom-to-top

    // Generate themed heatmap data
    const generateHeatmapData = (name: string, base: number) => {
      return days.map(day => {
        // Weekend has higher occupancy
        const isWeekend = day === 'Fri' || day === 'Sat' || day === 'Sun';
        const factor = isWeekend ? 1.3 : 1.0;
        const val = Math.min(100, Math.round((base + Math.random() * 15) * factor));
        return { x: day, y: val };
      });
    };

    this.occupancyHeatmapChart = {
      series: [
        { name: 'Eve', data: generateHeatmapData('Eve', 75) },
        { name: 'Aftn', data: generateHeatmapData('Aftn', 60) },
        { name: 'Morn', data: generateHeatmapData('Morn', 50) }
      ],
      chart: {
        height: 220,
        type: 'heatmap',
        background: 'transparent',
        toolbar: { show: false },
        fontFamily: "'Hanken Grotesk', sans-serif"
      },
      plotOptions: {
        heatmap: {
          radius: 4,
          enableShades: false,
          colorScale: {
            ranges: [
              { from: 0, to: 55, name: 'low', color: this.veryLowColor },
              { from: 56, to: 70, name: 'mid', color: this.lowColor },
              { from: 71, to: 85, name: 'high', color: this.midColor },
              { from: 86, to: 100, name: 'max', color: this.primaryColor }
            ]
          }
        }
      },
      dataLabels: { enabled: false },
      colors: [this.primaryColor],
      xaxis: {
        labels: { style: { colors: textColor } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { style: { colors: textColor } }
      },
      grid: { show: false },
      tooltip: {
        theme: this.chartTheme,
        y: {
          formatter: (value) => `${value}% Occupancy`
        }
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

  initDashboardCharts(thirtyRev: number[], thirtyLabels: string[], qProfit: number[], qExpense: number[], occupancy: number) {
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
                return val + "%";
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
          style: { colors: labelColor, fontFamily: 'Space Grotesk, sans-serif', fontSize: '11px' } 
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { 
          formatter: (value) => { return value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value.toString(); },
          style: { colors: labelColor, fontFamily: 'Space Grotesk, sans-serif', fontSize: '11px' } 
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

    // 3. P&L Comparison (Grouped Bar Chart)
    this.profitChartOptions = {
      series: [
        { name: "Profit", data: qProfit },
        { name: "Expense", data: qExpense }
      ],
      chart: {
        height: 350,
        type: "bar",
        background: 'transparent',
        toolbar: { show: false },
        stacked: false
      },
      colors: ['#ffd700', expenseBarColor],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 2
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ["Q1", "Q2", "Q3", "Q4 (Est)"],
        labels: { 
          style: { colors: labelColor, fontFamily: 'Space Grotesk, sans-serif', fontSize: '11px' } 
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: { show: false },
      grid: { show: false },
      legend: { show: false },
      tooltip: { theme: isLight ? 'light' : 'dark' }
    };
  }
}
