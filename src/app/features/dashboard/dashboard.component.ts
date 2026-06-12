import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from './dashboard.service';
import { ThemeService } from '../../core/services/theme.service';
import { NgApexchartsModule } from 'ng-apexcharts';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';

import {
  ApexAxisChartSeries,
  ApexNonAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexStroke,
  ApexYAxis,
  ApexTooltip,
  ApexFill,
  ApexTheme,
  ApexPlotOptions,
  ApexLegend,
  ApexGrid
} from "ng-apexcharts";

export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  yaxis: ApexYAxis;
  title: ApexTitleSubtitle;
  labels: string[];
  tooltip: ApexTooltip;
  fill: ApexFill;
  theme: ApexTheme;
  colors: string[];
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  grid: ApexGrid;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgApexchartsModule,
    NzCardModule,
    NzIconModule,
    NzStatisticModule,
    NzGridModule,
    NzTableModule,
    NzSelectModule,
    NzButtonModule
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  public chartOptions!: Partial<ChartOptions>;
  public profitChartOptions!: Partial<ChartOptions>;
  public occupancyChartOptions!: Partial<ChartOptions>;
  public currentTheme: string = 'theme-obsidian';

  constructor(
    public dashboardService: DashboardService,
    private themeService: ThemeService
  ) {
    effect(() => {
      const thirtyRev = this.dashboardService.thirtyDayRevenue();
      const thirtyLabels = this.dashboardService.thirtyDayLabels();
      const qProfit = this.dashboardService.quarterlyProfit();
      const qExpense = this.dashboardService.quarterlyExpense();
      const kpis = this.dashboardService.kpis();
      
      if (thirtyRev.length > 0) {
        this.initCharts(thirtyRev, thirtyLabels, qProfit, qExpense, kpis.occupancyPercentage);
      }
    });
  }

  ngOnInit() {
    this.dashboardService.loadDashboardData();
    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
      const thirtyRev = this.dashboardService.thirtyDayRevenue();
      const thirtyLabels = this.dashboardService.thirtyDayLabels();
      const qProfit = this.dashboardService.quarterlyProfit();
      const qExpense = this.dashboardService.quarterlyExpense();
      const kpis = this.dashboardService.kpis();
      if (thirtyRev.length > 0) {
        this.initCharts(thirtyRev, thirtyLabels, qProfit, qExpense, kpis.occupancyPercentage);
      }
    });
  }

  formatKpi(value: number): string {
    return value.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    });
  }

  initCharts(thirtyRev: number[], thirtyLabels: string[], qProfit: number[], qExpense: number[], occupancy: number) {
    const isLight = this.currentTheme === 'theme-cream-white';
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
        show: false, // Matches the stark black background mockup
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
      legend: { show: false }, // Legend is custom built in HTML
      tooltip: { theme: isLight ? 'light' : 'dark' }
    };
  }
}
