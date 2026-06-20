import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { SupabaseService } from '../../core/services/supabase.service';
import { ColumnConfig, DEFAULT_DAILY_ENTRY_BASE_COLUMNS, DEFAULT_DAILY_ENTRY_END_COLUMNS } from '../../core/models/column-config.model';

import { NgApexchartsModule } from 'ng-apexcharts';
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
  yaxis: ApexYAxis | ApexYAxis[];
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
  selector: 'app-daily-entries',
  standalone: true,
  imports: [
    CommonModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzPopconfirmModule,
    NzModalModule,
    ReactiveFormsModule,
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzDatePickerModule,
    NzPopoverModule,
    NgApexchartsModule
  ],
  styles: [`
    ::ng-deep .ant-popover-inner {
      background-color: var(--theme-card) !important;
      border: 1px solid var(--theme-border) !important;
      border-radius: 12px !important;
      box-shadow: 0 10px 25px -5px var(--theme-shadow-heavy) !important;
    }
    ::ng-deep .ant-popover-inner-content {
      padding: 0 !important;
      color: var(--theme-text-main) !important;
    }
    ::ng-deep .ant-popover-arrow-content {
      background-color: var(--theme-card) !important;
      border-color: var(--theme-border) !important;
    }
  `],
  templateUrl: './daily-entries.component.html'
})
export class DailyEntriesComponent implements OnInit {
  entries: any[] = [];
  loading = true;

  columns: ColumnConfig[] = [];
  popupFields: ColumnConfig[] = [];

  sortColumn = 'entry_date';
  sortDirection = 'desc';
  isMandatoryCheckEnabled = false;

  // Computed statistics
  get averageOccupancy(): number {
    const sold = this.filteredEntries.reduce((sum, e) => sum + Number(e.rooms_sold || 0), 0);
    const avail = this.filteredEntries.reduce((sum, e) => sum + Number(e.total_rooms_available || 0), 0);
    return avail > 0 ? Math.round((sold / avail) * 100) : 0;
  }

  get avgRoomsSold(): number {
    if (this.filteredEntries.length === 0) return 0;
    const total = this.filteredEntries.reduce((sum, e) => sum + Number(e.rooms_sold || 0), 0);
    return Math.round(total / this.filteredEntries.length);
  }

  get avgDailyRevenue(): number {
    if (this.filteredEntries.length === 0) return 0;
    const total = this.filteredEntries.reduce((sum, e) => sum + Number(e.total_revenue || 0), 0);
    return Math.round(total / this.filteredEntries.length);
  }

  get avgRevPar(): number {
    if (this.filteredEntries.length === 0) return 0;
    const totalRev = this.filteredEntries.reduce((sum, e) => sum + Number(e.total_revenue || 0), 0);
    const totalAvail = this.filteredEntries.reduce((sum, e) => sum + Number(e.total_rooms_available || 0), 0);
    return totalAvail > 0 ? Math.round(totalRev / totalAvail) : 0;
  }

  // Filter variables
  dailyFilterDate: Date | null = null;
  dailyMinRoomsSold: number | null = null;
  dailyMinRevenue: number | null = null;
  globalDateRange: Date[] = [];
  activePresetRange: string | null = null;

  // Chart Options
  revenueOccupancyChartOptions!: Partial<ChartOptions>;
  roomDistributionChartOptions!: Partial<ChartOptions>;
  sparklineOccupancy!: Partial<ChartOptions>;
  sparklineRevenue!: Partial<ChartOptions>;
  sparklineRoomsSold!: Partial<ChartOptions>;

  get filteredEntries(): any[] {
    const list = this.entries.filter(e => {
      // Global date range filter
      if (this.globalDateRange && this.globalDateRange.length === 2) {
        const d = new Date(e.entry_date);
        d.setHours(0,0,0,0);
        const start = new Date(this.globalDateRange[0]);
        start.setHours(0,0,0,0);
        const end = new Date(this.globalDateRange[1]);
        end.setHours(23,59,59,999);
        if (d < start || d > end) return false;
      }

      let matchesDate = true;
      if (this.dailyFilterDate) {
        const selDate = new Date(this.dailyFilterDate);
        selDate.setHours(0, 0, 0, 0);
        const entryDate = new Date(e.entry_date);
        entryDate.setHours(0, 0, 0, 0);
        matchesDate = selDate.getTime() === entryDate.getTime();
      }

      let matchesRooms = true;
      if (this.dailyMinRoomsSold !== null && this.dailyMinRoomsSold !== undefined) {
        matchesRooms = e.rooms_sold >= this.dailyMinRoomsSold;
      }

      let matchesRevenue = true;
      if (this.dailyMinRevenue !== null && this.dailyMinRevenue !== undefined) {
        matchesRevenue = e.total_revenue >= this.dailyMinRevenue;
      }

      return matchesDate && matchesRooms && matchesRevenue;
    });

    const sortCol = this.sortColumn || 'entry_date';
    const sortDir = this.sortDirection || 'desc';

    return list.sort((a, b) => {
      let valA = a[sortCol];
      let valB = b[sortCol];

      if (sortCol === 'entry_date') {
        const timeA = valA ? new Date(valA).getTime() : 0;
        const timeB = valB ? new Date(valB).getTime() : 0;
        return sortDir === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (sortCol === 'rooms_sold' || sortCol === 'total_rooms_available' || sortCol === 'total_revenue' || sortCol === 'total_guests') {
        const numA = Number(valA || 0);
        const numB = Number(valB || 0);
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }

      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      if (strA < strB) return sortDir === 'asc' ? -1 : 1;
      if (strA > strB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  resetDailyFilters(): void {
    this.dailyFilterDate = null;
    this.dailyMinRoomsSold = null;
    this.dailyMinRevenue = null;
    this.globalDateRange = [];
    this.activePresetRange = null;
  }

  applyPresetRange(preset: string): void {
    this.activePresetRange = preset;
    const end = new Date();
    const start = new Date();
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);

    if (preset === 'Today') {
      // default
    } else if (preset === 'Yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (preset === 'Past 7 Days') {
      start.setDate(start.getDate() - 6);
    } else if (preset === 'Past 30 Days') {
      start.setDate(start.getDate() - 29);
    } else if (preset === 'Current Month') {
      start.setDate(1);
    } else if (preset === 'Previous Month') {
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      end.setDate(0); 
    } else if (preset === 'Last 6 Months') {
      start.setMonth(start.getMonth() - 6);
    }
    this.globalDateRange = [start, end];
  }

  onGlobalFilterChange(): void {
    if (!this.globalDateRange || this.globalDateRange.length === 0) {
      this.activePresetRange = null;
    } else if (this.activePresetRange !== 'custom') {
      this.activePresetRange = 'custom';
    }
  }

  openAddModal(): void {
    window.dispatchEvent(new Event('openDailyEntryModal'));
  }

  // Edit Modal State
  isEditModalVisible = false;
  isOkLoading = false;
  editForm: FormGroup;
  editingId: string | null = null;

  roomConfig: any = {};
  roomTypes: string[] = [];
  totalRoomsLimit = 0;

  constructor(
    private supabase: SupabaseService,
    private fb: FormBuilder,
    private message: NzMessageService
  ) {
    this.editForm = this.fb.group({
      rooms_sold: [null, [Validators.required, Validators.min(0)]],
      total_rooms_available: [{ value: 0, disabled: true }, [Validators.required, Validators.min(1)]],
      total_guests: [null, [Validators.min(0)]],
      total_revenue: [null, [Validators.required, Validators.min(0)]],
      notes: ['']
    });

    this.supabase.profile.subscribe(profile => {
      if (profile) {
        if (profile.room_config) {
          this.roomConfig = profile.room_config;
          
          // Support custom order in JSON under '_order' key
          if (this.roomConfig._order && Array.isArray(this.roomConfig._order)) {
            this.roomTypes = this.roomConfig._order.filter((key: string) => key in this.roomConfig);
            Object.keys(this.roomConfig).forEach(key => {
              if (key !== '_order' && !this.roomTypes.includes(key)) {
                this.roomTypes.push(key);
              }
            });
          } else {
            this.roomTypes = Object.keys(this.roomConfig);
          }

          // Clean up any dynamic room controls
          Object.keys(this.editForm.controls).forEach(key => {
            if (!['rooms_sold', 'total_rooms_available', 'total_guests', 'total_revenue', 'notes'].includes(key)) {
              this.editForm.removeControl(key);
            }
          });

          let totalLimit = 0;
          this.roomTypes.forEach(type => {
            const limit = this.getRoomLimit(type);
            totalLimit += limit;

            // Dynamically add form control
            this.editForm.addControl(
              type,
              this.fb.control(null, [Validators.min(0), Validators.max(limit)])
            );

            // Calculate total rooms sold on change
            this.editForm.get(type)?.valueChanges.subscribe((value) => {
              const limitVal = this.getRoomLimit(type);
              if (value > limitVal) {
                this.editForm.get(type)?.setValue(limitVal);
              } else {
                this.calculateTotalRoomsSold();
              }
            });
          });

          this.totalRoomsLimit = totalLimit;
          this.editForm.patchValue({
            total_rooms_available: this.totalRoomsLimit
          });
        }

        // Initialize default columns
        const defaultCols: ColumnConfig[] = [
          ...DEFAULT_DAILY_ENTRY_BASE_COLUMNS
        ];

        this.roomTypes.forEach(type => {
          defaultCols.push({
            key: type,
            label: type,
            visible: true,
            width: '120px',
            align: 'center'
          });
        });

        defaultCols.push(
          ...DEFAULT_DAILY_ENTRY_END_COLUMNS
        );

        this.columns = defaultCols;
        this.popupFields = [...defaultCols];

        if (profile.column_config && profile.column_config.daily_entries) {
          const config = profile.column_config.daily_entries;
          if (Array.isArray(config)) {
            this.applySavedColumns(config);
            this.applySavedPopupFields(config);
          } else {
            if (config.table) this.applySavedColumns(config.table);
            if (config.popup) this.applySavedPopupFields(config.popup);
            this.sortColumn = config.sort_column || 'entry_date';
            this.sortDirection = config.sort_direction || 'desc';
            this.isMandatoryCheckEnabled = config.mandatory_edit_check || false;
            this.applyMandatoryChecks(this.isMandatoryCheckEnabled);
          }
        } else {
          const local = localStorage.getItem('daily_entries_column_config');
          if (local) {
            try {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed)) {
                this.applySavedColumns(parsed);
                this.applySavedPopupFields(parsed);
              } else {
                if (parsed.table) this.applySavedColumns(parsed.table);
                if (parsed.popup) this.applySavedPopupFields(parsed.popup);
                this.sortColumn = parsed.sort_column || 'entry_date';
                this.sortDirection = parsed.sort_direction || 'desc';
                this.isMandatoryCheckEnabled = parsed.mandatory_edit_check || false;
                this.applyMandatoryChecks(this.isMandatoryCheckEnabled);
              }
            } catch (e) {}
          }
        }
      }
    });
  }

  getRoomLimit(type: string): number {
    if (!this.roomConfig || !this.roomConfig[type]) return 0;
    if (Array.isArray(this.roomConfig[type])) return this.roomConfig[type].length;
    return Number(this.roomConfig[type]) || 0;
  }

  isColumnMandatory(key: string): boolean {
    const col = this.popupFields?.find(c => c.key === key);
    return col ? col.mandatory === true : false;
  }

  applyMandatoryChecks(mandatory: boolean): void {
    if (!this.popupFields || this.popupFields.length === 0) return;

    this.popupFields.forEach(col => {
      const isMandatory = col.mandatory === true;
      const control = this.editForm?.get(col.key);
      if (control) {
        if (isMandatory) {
          if (col.key === 'rooms_sold' || col.key === 'total_rooms_available' || col.key === 'total_guests') {
            control.setValidators([Validators.required, Validators.min(0)]);
          } else if (col.key === 'total_revenue') {
            control.setValidators([Validators.required, Validators.min(0)]);
          } else {
            control.setValidators([Validators.required]);
          }
        } else {
          control.clearValidators();
          if (['rooms_sold', 'total_rooms_available', 'total_guests', 'total_revenue'].includes(col.key)) {
            control.setValidators([Validators.min(0)]);
          }
        }
        control.updateValueAndValidity();
      }
    });
  }

  applySavedColumns(savedList: any[]): void {
    if (!Array.isArray(savedList)) return;
    const newCols: ColumnConfig[] = [];
    const colMap = new Map<string, ColumnConfig>();
    this.columns.forEach(c => colMap.set(c.key, c));
    
    savedList.forEach((s: any) => {
      const existing = colMap.get(s.key);
      if (existing) {
        newCols.push({
          ...existing,
          visible: s.visible,
          mandatory: s.mandatory
        });
        colMap.delete(s.key);
      }
    });
    
    colMap.forEach(c => newCols.push(c));
    this.columns = newCols;
  }

  moveColumn(index: number, direction: 'left' | 'right'): void {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= this.columns.length) return;
    
    const temp = this.columns[index];
    this.columns[index] = this.columns[targetIndex];
    this.columns[targetIndex] = temp;
    
    this.columns = [...this.columns];
    this.saveColumnConfig();
  }

  toggleColumnVisibility(columnKey: string, visible: boolean): void {
    const col = this.columns.find(c => c.key === columnKey);
    if (col) {
      col.visible = visible;
      this.columns = [...this.columns];
      this.saveColumnConfig();
    }
  }

  applySavedPopupFields(savedList: any[]): void {
    if (!Array.isArray(savedList)) return;
    const newFields: ColumnConfig[] = [];
    const fieldMap = new Map<string, ColumnConfig>();
    this.popupFields.forEach(f => fieldMap.set(f.key, f));
    
    savedList.forEach((s: any) => {
      const existing = fieldMap.get(s.key);
      if (existing) {
        newFields.push({
          ...existing,
          visible: s.visible,
          mandatory: s.mandatory
        });
        fieldMap.delete(s.key);
      }
    });
    
    fieldMap.forEach(f => newFields.push(f));
    this.popupFields = newFields;
    this.applyMandatoryChecks(false);
  }

  async saveColumnConfig(): Promise<void> {
    const tableConfig = this.columns.map(c => ({ key: c.key, visible: c.visible, mandatory: c.mandatory }));
    const popupConfig = this.popupFields.map(f => ({ key: f.key, visible: f.visible, mandatory: f.mandatory }));
    const combined = { table: tableConfig, popup: popupConfig };

    const profile = this.supabase.currentProfile;
    if (!profile || !profile.hotel_id) {
      localStorage.setItem('daily_entries_column_config', JSON.stringify(combined));
      return;
    }
    
    const currentConfig = profile.column_config || {};
    const newConfig = {
      ...currentConfig,
      daily_entries: combined
    };
    
    localStorage.setItem('daily_entries_column_config', JSON.stringify(combined));
    
    try {
      await this.supabase.updateHotelColumnConfig(profile.hotel_id, newConfig);
    } catch (e) {
      console.error('Failed to save column config to Supabase', e);
    }
  }

  getVisibleColumnsCount(): number {
    return this.columns.filter(c => c.visible).length;
  }

  getHiddenColumns(): ColumnConfig[] {
    return this.columns.filter(c => !c.visible);
  }

  async ngOnInit() {
    await this.loadEntries();
  }

  updateCharts(): void {
    const entries = [...this.filteredEntries].reverse(); // oldest to newest for charts
    
    if (entries.length === 0) {
      this.sparklineOccupancy = undefined as any;
      this.sparklineRoomsSold = undefined as any;
      this.sparklineRevenue = undefined as any;
      this.revenueOccupancyChartOptions = undefined as any;
      this.roomDistributionChartOptions = undefined as any;
      return;
    }

    const categories = entries.map(e => {
      const d = new Date(e.entry_date);
      return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
    });

    const occupancyData = entries.map(e => {
      const sold = Number(e.rooms_sold || 0);
      const avail = Number(e.total_rooms_available || 0);
      return avail > 0 ? Math.round((sold / avail) * 100) : 0;
    });

    const revenueData = entries.map(e => Number(e.total_revenue || 0));
    const roomsSoldData = entries.map(e => Number(e.rooms_sold || 0));

    // Common sparkline options
    const baseSparkline: Partial<ChartOptions> = {
      chart: { type: 'area', width: '100%', height: 48, sparkline: { enabled: true }, animations: { enabled: false } },
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.0, stops: [0, 100] } },
      tooltip: { fixed: { enabled: false }, x: { show: false }, y: { title: { formatter: function (seriesName) { return '' } } }, marker: { show: false } }
    };

    this.sparklineOccupancy = {
      ...baseSparkline,
      series: [{ name: 'Occupancy %', data: occupancyData }],
      colors: ['#3b82f6'] // Blue
    };

    this.sparklineRoomsSold = {
      ...baseSparkline,
      series: [{ name: 'Rooms Sold', data: roomsSoldData }],
      colors: ['#d4af37'] // Gold
    };

    this.sparklineRevenue = {
      ...baseSparkline,
      series: [{ name: 'Revenue', data: revenueData }],
      colors: ['#d4af37'] // Gold
    };

    // Revenue vs Occupancy Chart (Dual Axis Line/Area)
    const labelColor = '#94a3b8'; // default dark theme
    
    this.revenueOccupancyChartOptions = {
      series: [
        { name: 'Revenue (₹)', type: 'area', data: revenueData }
      ],
      chart: { height: 220, type: 'area', background: 'transparent', toolbar: { show: false }, animations: { enabled: false } },
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.0, stops: [0, 100] }
      },
      colors: ['#3b82f6'],
      dataLabels: { enabled: false },
      xaxis: { 
        categories: categories,
        labels: { style: { colors: labelColor, fontFamily: 'Plus Jakarta Sans, sans-serif' } },
        axisBorder: { show: false }, axisTicks: { show: false }
      },
      yaxis: [
        {
          labels: { formatter: (val: number) => '₹' + val.toLocaleString(), style: { colors: labelColor, fontFamily: 'Inter, sans-serif' } }
        }
      ],
      legend: { position: 'top', horizontalAlign: 'right', labels: { colors: labelColor } },
      tooltip: { theme: 'dark' },
      grid: { borderColor: 'rgba(255, 255, 255, 0.05)', strokeDashArray: 4 }
    };

    // Room Distribution Chart (Stacked Bar)
    const seriesData: any[] = [];
    this.roomTypes.forEach(type => {
      seriesData.push({
        name: type,
        data: entries.map(e => Number(e[type] || 0))
      });
    });

    this.roomDistributionChartOptions = {
      series: seriesData,
      chart: { type: 'bar', height: 220, stacked: true, background: 'transparent', toolbar: { show: false }, animations: { enabled: false } },
      plotOptions: { bar: { horizontal: false, borderRadius: 2, columnWidth: '40%' } },
      xaxis: {
        categories: categories,
        labels: { style: { colors: labelColor, fontFamily: 'Plus Jakarta Sans, sans-serif' } },
        axisBorder: { show: false }, axisTicks: { show: false }
      },
      yaxis: { labels: { style: { colors: labelColor, fontFamily: 'Inter, sans-serif' } } },
      colors: ['#d4af37', '#3b82f6', '#10b981', '#f43f5e', '#8b5cf6'], // Palette
      dataLabels: { enabled: false },
      legend: { position: 'top', horizontalAlign: 'right', labels: { colors: labelColor } },
      fill: { opacity: 1 },
      tooltip: { theme: 'dark' },
      grid: { borderColor: 'rgba(255, 255, 255, 0.05)', strokeDashArray: 4 }
    };
  }

  calculateTotalRoomsSold() {
    const totalSold = this.roomTypes.reduce((sum, type) => sum + (this.editForm.get(type)?.value || 0), 0);
    this.editForm.patchValue({ rooms_sold: totalSold }, { emitEvent: false });
  }

  getDbColumn(roomType: string, index: number): string {
    const name = roomType.toLowerCase();
    if (name.includes('non ac') || name.includes('non-ac') || name.includes('nonac')) {
      return 'standard_non_ac_rooms_sold';
    }
    if (name.includes('suite')) {
      return 'suite_rooms_sold';
    }
    if (name.includes('delux')) {
      return 'deluxe_rooms_sold';
    }
    if (name.includes('standard') || name.includes('ac')) {
      return 'standard_ac_rooms_sold';
    }
    const columns = [
      'standard_ac_rooms_sold',
      'standard_non_ac_rooms_sold',
      'deluxe_rooms_sold',
      'suite_rooms_sold'
    ];
    return columns[index % columns.length];
  }

  async loadEntries() {
    this.loading = true;
    try {
      const profile = this.supabase.currentProfile;
      const hotelId = profile?.hotel_id;
      let queryResult;
      if (hotelId) {
        queryResult = await this.supabase.getDailyEntries(hotelId);
      } else {
        queryResult = await this.supabase.getDailyEntries();
      }
      const { data, error } = queryResult;

      if (error) {
        if (error.message.includes('relation') || error.message.includes('does not exist') || error.message.includes('schema cache')) {
          this.loadLocalEntries();
        } else {
          throw error;
        }
      } else {
        this.entries = (data || []).map((row: any) => {
          this.roomTypes.forEach((type, idx) => {
            const dbCol = this.getDbColumn(type, idx);
            row[type] = row[dbCol] || 0;
          });
          return row;
        });
        setTimeout(() => this.updateCharts(), 50);
      }
    } catch (e: any) {
      console.warn('Failed to load daily entries from Supabase, falling back to local storage', e);
      this.loadLocalEntries();
    } finally {
      this.loading = false;
    }
  }

  loadLocalEntries() {
    const profile = this.supabase.currentProfile;
    const hotelId = profile?.hotel_id || 'default';
    const key = `daily_entries_${hotelId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      this.entries = parsed.map((row: any) => {
        this.roomTypes.forEach((type, idx) => {
          const dbCol = this.getDbColumn(type, idx);
          row[type] = row[dbCol] || 0;
        });
        return row;
      });
    } else {
      this.entries = [];
    }
    setTimeout(() => this.updateCharts(), 50);
  }

  openEditModal(data: any): void {
    this.editingId = data.id;
    this.editForm.patchValue({
      rooms_sold: data.rooms_sold,
      total_rooms_available: data.total_rooms_available,
      total_guests: data.total_guests,
      total_revenue: data.total_revenue,
      notes: data.notes
    });

    // Populate dynamic controls
    this.roomTypes.forEach((type, idx) => {
      const colName = this.getDbColumn(type, idx);
      const val = data[colName] || 0;
      this.editForm.get(type)?.setValue(val, { emitEvent: false });
    });

    this.isEditModalVisible = true;
  }

  handleCancel(): void {
    this.isEditModalVisible = false;
    this.editingId = null;
    this.editForm.reset({
      rooms_sold: 0,
      total_rooms_available: this.totalRoomsLimit,
      total_guests: null,
      total_revenue: 0,
      notes: ''
    });
    this.roomTypes.forEach(type => {
      this.editForm.get(type)?.setValue(0, { emitEvent: false });
    });
  }

  async handleEditOk(): Promise<void> {
    if (this.editForm.valid && this.editingId) {
      this.isOkLoading = true;
      try {
        const formData = this.editForm.getRawValue();
        const vacantRooms = (formData.total_rooms_available || 0) - (formData.rooms_sold || 0);

        // Map dynamic room values to DB columns
        const dbRoomData: any = {
          standard_ac_rooms_sold: 0,
          standard_non_ac_rooms_sold: 0,
          deluxe_rooms_sold: 0,
          suite_rooms_sold: 0
        };
        this.roomTypes.forEach((type, idx) => {
          const val = formData[type] || 0;
          const colName = this.getDbColumn(type, idx);
          dbRoomData[colName] = val;
        });

        const profile = this.supabase.currentProfile;
        const hotelId = profile?.hotel_id || 'default';

        // Try database first
        let dbSuccess = false;
        try {
          const { error } = await this.supabase.updateDailyEntry(this.editingId, {
            rooms_sold: formData.rooms_sold,
            total_rooms_available: formData.total_rooms_available,
            vacant_rooms: vacantRooms >= 0 ? vacantRooms : 0,
            total_guests: formData.total_guests || 0,
            total_revenue: formData.total_revenue,
            notes: formData.notes,
            ...dbRoomData
          });

          if (!error) {
            dbSuccess = true;
          } else {
            console.warn('DB update failed, will try local storage update:', error);
          }
        } catch (dbErr) {
          console.warn('DB exception during update, trying local:', dbErr);
        }

        // Always sync/update local storage as fallback or cache
        const key = `daily_entries_${hotelId}`;
        const raw = localStorage.getItem(key);
        let localEntries = raw ? JSON.parse(raw) : [];

        const targetEntry = this.entries.find(e => e.id === this.editingId);
        const targetDate = targetEntry ? targetEntry.entry_date : new Date().toISOString().split('T')[0];

        const updatedLocalEntry = {
          id: this.editingId,
          entry_date: targetDate,
          rooms_sold: formData.rooms_sold,
          total_rooms_available: formData.total_rooms_available,
          vacant_rooms: vacantRooms >= 0 ? vacantRooms : 0,
          total_guests: formData.total_guests || 0,
          total_revenue: formData.total_revenue,
          notes: formData.notes,
          ...dbRoomData
        };

        const existingIdx = localEntries.findIndex((e: any) => e.id === this.editingId || e.entry_date === targetDate);
        if (existingIdx > -1) {
          localEntries[existingIdx] = {
            ...localEntries[existingIdx],
            ...updatedLocalEntry
          };
        } else {
          localEntries.push(updatedLocalEntry);
        }
        localStorage.setItem(key, JSON.stringify(localEntries));

        this.message.success('Daily audit log updated successfully!');
        this.isEditModalVisible = false;
        await this.loadEntries(); // Reload table
      } catch (error: any) {
        console.error('Failed to update entry', error);
        this.message.error(error.message || 'Failed to update entry');
      } finally {
        this.isOkLoading = false;
        this.editingId = null;
      }
    } else {
      Object.values(this.editForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  async deleteEntry(id: string) {
    const profile = this.supabase.currentProfile;
    const hotelId = profile?.hotel_id || 'default';
    let dbSuccess = false;

    try {
      const { error } = await this.supabase.deleteDailyEntry(id);
      if (!error) {
        dbSuccess = true;
      }
    } catch (dbErr) {
      console.warn('DB delete failed, trying local storage:', dbErr);
    }

    // Update local storage
    const key = `daily_entries_${hotelId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      let localEntries = JSON.parse(raw);
      localEntries = localEntries.filter((e: any) => e.id !== id);
      localStorage.setItem(key, JSON.stringify(localEntries));
    }

    this.message.success('Daily log deleted successfully!');
    this.entries = this.entries.filter(e => e.id !== id);
  }
}
