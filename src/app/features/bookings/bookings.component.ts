import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { SupabaseService } from '../../core/services/supabase.service';
import { DateUtils } from '../../shared/utils/date.utils';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ColumnConfig, DEFAULT_BOOKING_COLUMNS } from '../../core/models/column-config.model';
import { NzUploadModule, NzUploadFile } from 'ng-zorro-antd/upload';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';

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
  selector: 'app-bookings',
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
    NzSelectModule,
    NzRadioModule,
    NzPopoverModule,
    NzToolTipModule,
    NzUploadModule,
    NgApexchartsModule,
    NzAutocompleteModule
  ],
  templateUrl: './bookings.component.html',
  styleUrls: ['./bookings.component.css']
})
export class BookingsComponent implements OnInit, OnDestroy {
  bookings: any[] = [];
  roomTypes: string[] = [];
  roomConfig: any = {};

  columns: ColumnConfig[] = [...DEFAULT_BOOKING_COLUMNS];
  popupFields: ColumnConfig[] = [...DEFAULT_BOOKING_COLUMNS];
  private bookingsSub?: Subscription;
  guestSearchQuery: string = '';
  selectedGuests: any[] = [];

  sortColumn = 'check_in';
  sortDirection = 'desc';
  isMandatoryCheckEnabled = false;

  get hotelName(): string {
    const profile = this.supabase.currentProfile;
    return profile?.hotel_name || 'Room Bookings';
  }

  get dateFilteredBookings(): any[] {
    return this.bookings.filter(b => {
      // 1. Global Date Range Filter
      let matchesGlobalDate = true;
      if (this.globalDateRange && this.globalDateRange.length === 2) {
        const start = new Date(this.globalDateRange[0]);
        start.setHours(0, 0, 0, 0);
        const end = new Date(this.globalDateRange[1]);
        end.setHours(23, 59, 59, 999);

        const checkIn = b.check_in ? new Date(b.check_in) : null;
        let checkOut = b.check_out ? new Date(b.check_out) : null;
        if ((b.status === 'Checked Out' || b.status === 'checked out') && b.actual_checkout) {
          checkOut = new Date(b.actual_checkout);
        }

        if (checkIn && checkOut) {
          matchesGlobalDate = checkIn <= end && checkOut >= start;
        } else {
          matchesGlobalDate = false;
        }
      }
      return matchesGlobalDate;
    });
  }

  get allConfiguredRooms(): string[] {
    const rooms: string[] = [];
    if (this.roomConfig) {
      Object.keys(this.roomConfig).forEach(key => {
        if (key !== '_order') {
          const val = this.roomConfig[key];
          if (Array.isArray(val)) {
            rooms.push(...val.map(r => String(r)));
          }
        }
      });
    }
    return rooms;
  }

  get occupiedRooms(): string[] {
    return this.bookings
      .filter(b => b.status === 'Checked In' || b.status === 'Active')
      .map(b => String(b.room_number))
      .filter(Boolean);
  }

  get confirmedTodayRooms(): string[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.bookings
      .filter(b => {
        if (b.status !== 'Confirmed' && b.status !== 'confirmed') return false;
        if (!b.check_in) return false;
        const checkIn = new Date(b.check_in);
        return checkIn >= today && checkIn < tomorrow;
      })
      .map(b => String(b.room_number))
      .filter(Boolean);
  }

  isRoomConfirmedToday(room: string): boolean {
    return this.confirmedTodayRooms.includes(String(room));
  }

  get availableRoomsList(): string[] {
    const all = this.allConfiguredRooms;
    const occupied = this.occupiedRooms;
    return all.filter(r => !occupied.includes(r));
  }

  getRoomsByCategory(category: string): string[] {
    if (!this.roomConfig || !category) return [];
    const val = this.roomConfig[category];
    if (Array.isArray(val)) {
      return val.map(r => String(r));
    }
    return [];
  }

  isRoomOccupied(room: string): boolean {
    return this.occupiedRooms.includes(String(room));
  }

  getCategories(): string[] {
    return this.allConfiguredRooms.length > 0 ? this.roomTypes : [];
  }

  onRoomCardClick(room: string, category: string): void {
    if (this.isRoomOccupied(room)) {
      // Find the active booking for this room and open it for viewing/editing
      const activeBooking = this.bookings.find(b =>
        (b.status === 'Checked In' || b.status === 'Active') && String(b.room_number) === String(room)
      );
      if (activeBooking) {
        this.openBookingEditModal(activeBooking);
      } else {
        this.message.info(`Room ${room} is currently marked occupied.`);
      }
      return;
    }

    if (this.isRoomConfirmedToday(room)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const confirmedBooking = this.bookings.find(b => 
        (b.status === 'Confirmed' || b.status === 'confirmed') && 
        String(b.room_number) === String(room) &&
        b.check_in && new Date(b.check_in) >= today && new Date(b.check_in) < tomorrow
      );
      if (confirmedBooking) {
        this.openBookingEditModal(confirmedBooking);
        return;
      }
    }

    // Room is available, open add modal prefilled with room & category
    this.openBookingAddModalWithRoom(room, category);
  }

  openBookingAddModalWithRoom(room: string, category: string): void {
    this.openBookingAddModal(); // Resets the form and opens it
    // Now patch the category
    this.bookingForm.patchValue({ room_category: category }, { emitEvent: true });
    // Wait for the room_category value change listener to clear the room, then patch room
    setTimeout(() => {
      this.bookingForm.patchValue({ room_number: String(room) }, { emitEvent: false });
    }, 10);
  }

  get totalRooms(): number {
    const allRooms = this.allConfiguredRooms;
    if (allRooms.length > 0) {
      return allRooms.length;
    }
    let total = 0;
    if (this.roomConfig) {
      Object.keys(this.roomConfig).forEach(key => {
        if (key !== '_order') {
          total += Array.isArray(this.roomConfig[key]) ? this.roomConfig[key].length : Number(this.roomConfig[key] || 0);
        }
      });
    }
    return total > 0 ? total : 0;
  }

  get availableRooms(): number {
    const allRooms = this.allConfiguredRooms;
    if (allRooms.length > 0) {
      return Math.max(0, allRooms.length - this.occupiedRooms.length);
    }
    return Math.max(0, this.totalRooms - this.activeCheckedInCount);
  }

  // Computed statistics getters (based ONLY on date filter)
  get totalGuestsRegistered(): number {
    return this.dateFilteredBookings.reduce((sum, b) => sum + Number(b.number_of_people || 0), 0);
  }

  get activeCheckedInCount(): number {
    return this.dateFilteredBookings.filter(b => b.status === 'Checked In' || b.status === 'Active').length;
  }

  get activeCheckedOutCount(): number {
    return this.dateFilteredBookings.filter(b => b.status === 'Checked Out' || b.status === 'checked out').length;
  }

  get expectedBookings(): number {
    // 1. Calculate historical average bookings per day
    const allBookings = this.bookings;
    if (allBookings.length === 0) return 0;

    // Find min and max date in historical data to calculate total days span
    const checkInDates = allBookings.map(b => new Date(b.check_in).getTime());
    const minDate = new Date(Math.min(...checkInDates));
    const maxDate = new Date(Math.max(...checkInDates));
    const totalDaysSpan = DateUtils.getDaysBetween(minDate, maxDate);
    const avgBookingsPerDay = allBookings.length / totalDaysSpan;

    // 2. Count existing bookings in the selected date range
    const existingBookings = this.dateFilteredBookings.length;

    // 3. Estimate how many days are left in the selected date range
    let daysRemaining = 0;
    if (this.globalDateRange && this.globalDateRange.length === 2) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(this.globalDateRange[1]);
      end.setHours(23, 59, 59, 999);

      if (end > today) {
        // Calculate days between today and end date
        daysRemaining = DateUtils.getDaysBetween(today, end, 0);
      }
    }

    // Expected Bookings = existing bookings + (days remaining * average bookings per day)
    const expectedAdditional = Math.round(daysRemaining * avgBookingsPerDay);
    return existingBookings + expectedAdditional;
  }


  isDatabaseLinked = true;
  isSqlModalVisible = false;
  sqlCode = `CREATE TABLE IF NOT EXISTS public.room_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    id_number TEXT NOT NULL,
    room_number TEXT NOT NULL,
    room_category TEXT NOT NULL,
    booking_source TEXT,
    address TEXT,
    check_in TIMESTAMPTZ NOT NULL,
    check_out TIMESTAMPTZ NOT NULL,
    actual_checkout TIMESTAMPTZ,
    number_of_days INTEGER DEFAULT 1,
    number_of_people INTEGER DEFAULT 1,
    amount_paid NUMERIC DEFAULT 0 CHECK (amount_paid >= 0),
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT check_stay_dates CHECK (check_out > check_in)
);

-- Enable RLS
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION get_user_hotel_id() RETURNS UUID AS $$
  SELECT hotel_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role() RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Create Policies
CREATE POLICY "View bookings" ON public.room_bookings FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id());
CREATE POLICY "Create bookings" ON public.room_bookings FOR INSERT TO authenticated WITH CHECK (hotel_id = get_user_hotel_id());
CREATE POLICY "Update bookings" ON public.room_bookings FOR UPDATE TO authenticated USING (hotel_id = get_user_hotel_id()) WITH CHECK (hotel_id = get_user_hotel_id());
CREATE POLICY "Delete bookings" ON public.room_bookings FOR DELETE TO authenticated USING (hotel_id = get_user_hotel_id() AND get_user_role() IN ('Admin', 'Manager'));

-- Guest Profiles Table
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    id_number TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View guests" ON public.guests FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id());
CREATE POLICY "Create guests" ON public.guests FOR INSERT TO authenticated WITH CHECK (hotel_id = get_user_hotel_id());
CREATE POLICY "Update guests" ON public.guests FOR UPDATE TO authenticated USING (hotel_id = get_user_hotel_id()) WITH CHECK (hotel_id = get_user_hotel_id());
CREATE POLICY "Delete guests" ON public.guests FOR DELETE TO authenticated USING (hotel_id = get_user_hotel_id() AND get_user_role() IN ('Admin', 'Manager'));`;

  // Booking Modal State
  isBookingModalVisible = false;
  isOkLoading = false;
  bookingForm: FormGroup;
  editingBookingId: string | null = null;
  fileList: NzUploadFile[] = [];
  isUploadingFiles = false;

  // Guest Modal State
  isGuestModalVisible = false;
  isGuestOkLoading = false;
  guestForm: FormGroup;
  guestSearchResults: any[] = [];
  guestSearchTimer: any;

  // Attachment Viewer State
  isAttachmentModalVisible = false;
  isLoadingAttachments = false;
  attachmentUrls: string[] = [];

  onImageError(event: any) {
    // If the image fails to load, replace it with a broken image icon placeholder
    event.target.src = 'assets/broken-image.png'; // Or just clear it and let CSS handle it
    event.target.style.display = 'none';
    event.target.parentElement.innerHTML += '<div class="flex flex-col items-center justify-center text-rose-500/70 p-4"><span class="anticon anticon-disconnect text-4xl mb-2"></span><span class="text-xs font-bold text-center">Access Denied<br/>or Broken Link</span></div>';
  }

  beforeUpload = (file: NzUploadFile): boolean => {
    this.fileList = this.fileList.concat(file);
    return false;
  };

  constructor(
    private supabase: SupabaseService,
    private fb: FormBuilder,
    private message: NzMessageService
  ) {
    this.guestForm = this.fb.group({
      name: ['', [Validators.required]],
      phone_number: ['+91 ', [Validators.required, Validators.pattern(/^\+91\s?[0-9]{10}$/)]],
      id_number: [''],
      id_type: ['Aadhar Card'],
      address: ['']
    });

    this.bookingForm = this.fb.group({
      guest_name: ['', [Validators.required]],
      phone_number: [''],
      id_number: [''],
      room_number: ['', [Validators.required]],
      room_category: [''],
      booking_source: [''],
      pincode: [''],
      address: [''],
      check_in: [null, [Validators.required]],
      check_out: [null, [Validators.required]],
      number_of_days: [1, [Validators.required, Validators.min(1)]],
      number_of_people: [1, [Validators.required, Validators.min(1)]],
      total_amount: [null, [Validators.min(0)]],
      amount_paid: [null, [Validators.min(0)]],
      status: ['Checked In', [Validators.required]],
      gst_number: [''],
      company_name: [''],
      notes: ['']
    });

    this.setupFormValueChanges();

    this.supabase.profile.subscribe(profile => {
      if (profile) {
        if (profile.room_config) {
          this.roomConfig = profile.room_config;

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
        }

        if (profile.column_config && profile.column_config.bookings) {
          const config = profile.column_config.bookings;
          if (Array.isArray(config)) {
            // Legacy flat array format
            this.applySavedColumns(config);
            this.applySavedPopupFields(config);
          } else {
            // New nested format
            if (config.table) this.applySavedColumns(config.table);
            if (config.popup) this.applySavedPopupFields(config.popup);
            this.sortColumn = config.sort_column || 'check_in';
            this.sortDirection = config.sort_direction || 'desc';
            this.isMandatoryCheckEnabled = config.mandatory_edit_check || false;
            this.applyMandatoryChecks(this.isMandatoryCheckEnabled);
          }
        } else {
          const local = localStorage.getItem('bookings_column_config');
          if (local) {
            try {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed)) {
                this.applySavedColumns(parsed);
                this.applySavedPopupFields(parsed);
              } else {
                if (parsed.table) this.applySavedColumns(parsed.table);
                if (parsed.popup) this.applySavedPopupFields(parsed.popup);
                this.sortColumn = parsed.sort_column || 'check_in';
                this.sortDirection = parsed.sort_direction || 'desc';
                this.isMandatoryCheckEnabled = parsed.mandatory_edit_check || false;
                this.applyMandatoryChecks(this.isMandatoryCheckEnabled);
              }
            } catch (e) { }
          }
        }

        // Load Bookings for this hotel context
        this.loadBookings();
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

  isColumnMandatory(key: string): boolean {
    const col = this.popupFields?.find(c => c.key === key);
    return col ? col.mandatory === true : false;
  }

  isFieldVisible(key: string): boolean {
    const field = this.popupFields?.find(c => c.key === key);
    return field ? field.visible === true : false;
  }

  getFieldSpan(key: string): number {
    switch (key) {
      case 'guest_name':
        return 12;
      case 'room_category':
      case 'room_number':
      case 'check_in':
      case 'check_out':
        return 6;
      case 'number_of_people':
      case 'number_of_days':
      case 'amount_paid':
      case 'total_amount':
        return 4;
      case 'booking_source':
        return 8;
      case 'company_name':
      case 'gst_number':
        return 12;
      case 'status':
        return 16;
      case 'notes':
        return 24;
      default:
        return 6;
    }
  }

  applyMandatoryChecks(mandatory: boolean): void {
    if (!this.popupFields || this.popupFields.length === 0) return;

    this.popupFields.forEach(col => {
      const isMandatory = col.mandatory === true;

      // Update bookingForm validators
      const bControl = this.bookingForm?.get(col.key);
      if (bControl) {
        if (isMandatory) {
          if (col.key === 'number_of_days' || col.key === 'number_of_people') {
            bControl.setValidators([Validators.required, Validators.min(1)]);
          } else if (col.key === 'amount_paid') {
            bControl.setValidators([Validators.required, Validators.min(0)]);
          } else {
            bControl.setValidators([Validators.required]);
          }
        } else {
          bControl.clearValidators();
          if (col.key === 'amount_paid') {
            bControl.setValidators([Validators.min(0)]);
          }
        }
        bControl.updateValueAndValidity();
      }

      // Update guestForm validators (map column key to guest form field)
      let guestKey = col.key;
      if (col.key === 'guest_name') guestKey = 'name';
      const gControl = this.guestForm?.get(guestKey);
      if (gControl) {
        if (isMandatory) {
          if (guestKey === 'phone_number') {
            gControl.setValidators([Validators.required, Validators.pattern(/^\+91\s?[0-9]{10}$/)]);
          } else {
            gControl.setValidators([Validators.required]);
          }
        } else {
          gControl.clearValidators();
          if (guestKey === 'phone_number') {
            gControl.setValidators([Validators.pattern(/^\+91\s?[0-9]{10}$/)]);
          }
        }
        gControl.updateValueAndValidity();
      }
    });
  }

  async saveColumnConfig(): Promise<void> {
    const tableConfig = this.columns.map(c => ({ key: c.key, visible: c.visible, mandatory: c.mandatory }));
    const popupConfig = this.popupFields.map(f => ({ key: f.key, visible: f.visible, mandatory: f.mandatory }));
    const combined = { table: tableConfig, popup: popupConfig };

    const profile = this.supabase.currentProfile;
    if (!profile || !profile.hotel_id) {
      localStorage.setItem('bookings_column_config', JSON.stringify(combined));
      return;
    }

    const currentConfig = profile.column_config || {};
    const newConfig = {
      ...currentConfig,
      bookings: combined
    };

    localStorage.setItem('bookings_column_config', JSON.stringify(combined));

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

  get defaultRanges(): { [key: string]: Date[] } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const past7 = new Date(today);
    past7.setDate(today.getDate() - 7);

    const past30 = new Date(today);
    past30.setDate(today.getDate() - 30);

    const past90 = new Date(today);
    past90.setDate(today.getDate() - 90);

    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    const last6Months = new Date(today);
    last6Months.setMonth(today.getMonth() - 6);

    return {
      'Today': [today, endOfToday],
      'Yesterday': [yesterday, endOfYesterday],
      'Past 7 Days': [past7, endOfToday],
      'Past 30 Days': [past30, endOfToday],
      'Past 90 Days': [past90, endOfToday],
      'Current Month': [currentMonthStart, currentMonthEnd],
      'Previous Month': [prevMonthStart, prevMonthEnd],
      'Last 6 Months': [last6Months, endOfToday]
    };
  }

  globalDateRange: Date[] = [];
  activeQuickFilter: string = 'check-in';
  activePresetRange: string = 'Today';

  hasActiveFilters(): boolean {
    return !!this.globalDateRange?.length ||
      this.activeQuickFilter !== 'check-in' ||
      !!this.colFilterDate ||
      !!this.colFilterRoomNo ||
      !!this.colFilterCategory ||
      !!this.colFilterName ||
      !!this.colFilterStatus ||
      this.activePresetRange !== 'Today';
  }

  applyPresetRange(preset: string): void {
    this.activePresetRange = preset;
    if (preset === 'custom') {
      this.globalDateRange = [];
      return;
    }
    const ranges = this.defaultRanges;
    if (ranges[preset]) {
      this.globalDateRange = ranges[preset];
    }
  }

  @HostListener('window:openBookingModal')
  onOpenBookingModal() {
    this.openBookingAddModal();
  }

  ngOnInit(): void {
    this.applyPresetRange('Today');
    this.loadBookings();

    this.bookingsSub = this.supabase.bookingsUpdated.subscribe(() => {
      this.loadBookings();
    });
  }

  setQuickFilter(filter: string): void {
    if (this.activeQuickFilter === filter) {
      this.activeQuickFilter = '';
      setTimeout(() => this.updateCharts(), 50);
      return;
    }

    this.activeQuickFilter = filter;
    setTimeout(() => this.updateCharts(), 50);
  }

  onGlobalFilterChange(): void {
    this.activePresetRange = 'custom';
    if (this.globalDateRange && this.globalDateRange.length === 2) {
      // Optional: clear quick filter on custom date
      this.activeQuickFilter = '';
    }
    setTimeout(() => this.updateCharts(), 50);
  }

  ngOnDestroy(): void {
    if (this.bookingsSub) {
      this.bookingsSub.unsubscribe();
    }
  }

  colFilterDate: Date | null = null;
  colFilterRoomNo = '';
  colFilterCategory = '';
  colFilterName = '';
  colFilterStatus = '';

  // Chart Options
  sparklineCheckins!: Partial<ChartOptions>;
  sparklineGuests!: Partial<ChartOptions>;
  sparklineRevenue!: Partial<ChartOptions>;
  sparklineDuration!: Partial<ChartOptions>;
  sparklineCheckout!: Partial<ChartOptions>;
  sparklineExpectedBookings!: Partial<ChartOptions>;
  paceRevenueChartOptions!: Partial<ChartOptions>;
  statusChartOptions!: Partial<ChartOptions>;

  onFilterChange(): void {
    setTimeout(() => this.updateCharts(), 50);
  }

  get filteredBookings(): any[] {
    const list = this.bookings.filter(b => {
      // 1. Global Date Range Filter
      let matchesGlobalDate = true;
      if (this.globalDateRange && this.globalDateRange.length === 2) {
        const start = new Date(this.globalDateRange[0]);
        start.setHours(0, 0, 0, 0);
        const end = new Date(this.globalDateRange[1]);
        end.setHours(23, 59, 59, 999);

        const checkIn = b.check_in ? new Date(b.check_in) : null;
        let checkOut = b.check_out ? new Date(b.check_out) : null;
        if ((b.status === 'Checked Out' || b.status === 'checked out') && b.actual_checkout) {
          checkOut = new Date(b.actual_checkout);
        }

        if (checkIn && checkOut) {
          matchesGlobalDate = checkIn <= end && checkOut >= start;
        } else {
          matchesGlobalDate = false;
        }
      }

      // 2. Quick Filters
      let matchesQuick = true;
      if (this.activeQuickFilter === 'all') {
        matchesQuick = true;
      } else if (this.activeQuickFilter === 'check-in') {
        matchesQuick = b.status === 'Checked In';
      } else if (this.activeQuickFilter === 'check-out') {
        matchesQuick = b.status === 'Checked Out' || b.status === 'checked out';
      } else if (this.activeQuickFilter === 'confirmed') {
        matchesQuick = b.status === 'Confirmed' || b.status === 'confirmed';
      }

      if (!matchesGlobalDate || !matchesQuick) return false;

      // 3. Existing Column Filters
      let matchesDate = true;
      if (this.colFilterDate) {
        const selDate = new Date(this.colFilterDate);
        selDate.setHours(0, 0, 0, 0);
        const checkInDate = new Date(b.check_in);
        const checkOutDate = new Date(b.check_out);
        checkInDate.setHours(0, 0, 0, 0);
        checkOutDate.setHours(0, 0, 0, 0);
        matchesDate = selDate >= checkInDate && selDate <= checkOutDate;
      }

      const matchesRoomNo = !this.colFilterRoomNo ||
        b.room_number?.toLowerCase().includes(this.colFilterRoomNo.toLowerCase());

      const matchesCategory = !this.colFilterCategory || b.room_category === this.colFilterCategory;

      const matchesName = !this.colFilterName ||
        b.guest_name?.toLowerCase().includes(this.colFilterName.toLowerCase());

      const matchesStatus = !this.colFilterStatus || b.status === this.colFilterStatus;

      return matchesDate && matchesRoomNo && matchesCategory && matchesName && matchesStatus;
    });

    const sortCol = this.sortColumn || 'check_in';
    const sortDir = this.sortDirection || 'desc';

    return list.sort((a, b) => {
      let valA = a[sortCol];
      let valB = b[sortCol];

      if (sortCol === 'check_in' || sortCol === 'check_out' || sortCol === 'created_at') {
        const timeA = valA ? new Date(valA).getTime() : 0;
        const timeB = valB ? new Date(valB).getTime() : 0;
        return sortDir === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (sortCol === 'amount_paid' || sortCol === 'number_of_people' || sortCol === 'number_of_days') {
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

  resetBookingFilters(): void {
    this.colFilterDate = null;
    this.colFilterRoomNo = '';
    this.colFilterCategory = '';
    this.colFilterName = '';
    this.colFilterStatus = '';
    this.activeQuickFilter = 'check-in';
    this.applyPresetRange('Today');
    setTimeout(() => this.updateCharts(), 50);
  }

  getBookingsKey(): string {
    const profile = this.supabase.currentProfile;
    const hotelId = profile?.hotel_id || 'default';
    return `bookings_${hotelId}`;
  }

  async loadBookings(): Promise<void> {
    try {
      const profile = this.supabase.currentProfile;
      const hotelId = profile?.hotel_id;

      let queryResult;
      if (hotelId) {
        queryResult = await this.supabase.getRoomBookings(hotelId);
      } else {
        queryResult = await this.supabase.getRoomBookings();
      }

      const { data, error } = queryResult;

      if (error) {
        if (error.message.includes('relation') || error.message.includes('does not exist') || error.message.includes('schema cache')) {
          this.isDatabaseLinked = false;
          this.loadLocalBookings();
        } else {
          throw error;
        }
      } else {
        this.isDatabaseLinked = true;
        this.bookings = data.map((b: any) => ({
          ...b,
          check_in: b.check_in ? new Date(b.check_in) : null,
          check_out: b.check_out ? new Date(b.check_out) : null
        }));
      }
    } catch (e: any) {
      console.error('Failed to load bookings from Supabase, falling back to local storage', e);
      this.isDatabaseLinked = false;
      this.loadLocalBookings();
    } finally {
      setTimeout(() => this.updateCharts(), 50);
    }
  }

  loadLocalBookings(): void {
    try {
      const key = this.getBookingsKey();
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.bookings = parsed.map((b: any) => ({
          ...b,
          check_in: b.check_in ? new Date(b.check_in) : null,
          check_out: b.check_out ? new Date(b.check_out) : null
        }));
      } else {
        this.bookings = [];
      }
    } catch (e) {
      console.error('Failed to load bookings from local storage', e);
      this.bookings = [];
    } finally {
      setTimeout(() => this.updateCharts(), 50);
    }
  }

  updateCharts(): void {
    const bks = [...this.dateFilteredBookings].reverse(); // oldest to newest

    if (bks.length === 0) {
      this.sparklineCheckins = undefined as any;
      this.sparklineGuests = undefined as any;
      this.sparklineRevenue = undefined as any;
      this.sparklineDuration = undefined as any;
      this.sparklineCheckout = undefined as any;
      this.sparklineExpectedBookings = undefined as any;
      this.paceRevenueChartOptions = undefined as any;
      this.statusChartOptions = undefined as any;
      return;
    }

    // We create daily aggregated data for Pace & Revenue chart
    const dailyMap = new Map<string, { bookings: number, revenue: number }>();
    bks.forEach(b => {
      const dateStr = new Date(b.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dailyMap.has(dateStr)) dailyMap.set(dateStr, { bookings: 0, revenue: 0 });
      const stat = dailyMap.get(dateStr)!;
      stat.bookings += 1;
      stat.revenue += Number(b.amount_paid || 0);
    });
    const dailyKeys = Array.from(dailyMap.keys());
    const dailyBookings = dailyKeys.map(k => dailyMap.get(k)!.bookings);
    const dailyRevenues = dailyKeys.map(k => dailyMap.get(k)!.revenue);

    // Common sparkline template
    const baseSparkline: Partial<ChartOptions> = {
      chart: { type: 'area', width: '100%', height: 48, sparkline: { enabled: true }, animations: { enabled: false } },
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.0, stops: [0, 100] } },
      tooltip: { fixed: { enabled: false }, x: { show: false }, y: { title: { formatter: function () { return '' } } }, marker: { show: false } }
    };

    this.sparklineCheckins = {
      ...baseSparkline,
      series: [{ name: 'Bookings', data: dailyBookings }],
      colors: ['#3b82f6'] // Blue
    };

    const guestsData = bks.map(b => Number(b.number_of_people || 1));
    this.sparklineGuests = {
      ...baseSparkline,
      series: [{ name: 'Guests', data: guestsData }],
      colors: ['#10b981'] // Emerald
    };

    // Calculate historical average rate for sparkline expected income estimations
    const pastCheckedOut = this.bookings.filter(b =>
      (b.status === 'Checked Out' || b.status === 'checked out') && Number(b.amount_paid || 0) > 0
    );
    const avgRate = pastCheckedOut.length > 0
      ? pastCheckedOut.reduce((sum, b) => sum + Number(b.amount_paid || 0), 0) / pastCheckedOut.length
      : 1800;

    // Aggregates for Checked Out and Expected Bookings sparklines
    const dailyCheckouts = dailyKeys.map(k => {
      return bks.filter(b => {
        const dStr = new Date(b.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return dStr === k && (b.status === 'Checked Out' || b.status === 'checked out');
      }).length;
    });

    const dailyExpectedBookingsData = dailyKeys.map(k => {
      return bks.filter(b => {
        const dStr = new Date(b.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return dStr === k;
      }).length;
    });

    this.sparklineCheckout = {
      ...baseSparkline,
      series: [{ name: 'Checked Out', data: dailyCheckouts }],
      colors: ['#f43f5e'] // Rose
    };

    this.sparklineExpectedBookings = {
      ...baseSparkline,
      series: [{ name: 'Est. Bookings', data: dailyExpectedBookingsData }],
      colors: ['#ffe082'] // Gold
    };

    const labelColor = '#94a3b8';

    // Bookings Pace & Revenue Chart
    this.paceRevenueChartOptions = {
      series: [
        { name: 'Revenue (₹)', type: 'area', data: dailyRevenues },
        { name: 'New Bookings', type: 'column', data: dailyBookings }
      ],
      chart: { height: 260, type: 'line', background: 'transparent', toolbar: { show: false }, animations: { enabled: false } },
      stroke: { curve: 'smooth', width: [0, 0] },
      fill: {
        type: ['gradient', 'solid'],
        gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.0, stops: [0, 100] }
      },
      colors: ['#d4af37', '#3b82f6'],
      dataLabels: { enabled: false },
      xaxis: {
        categories: dailyKeys,
        labels: { style: { colors: labelColor, fontFamily: 'Plus Jakarta Sans, sans-serif' } },
        axisBorder: { show: false }, axisTicks: { show: false }
      },
      yaxis: [
        { labels: { formatter: (val: number) => '₹' + val.toLocaleString(), style: { colors: '#d4af37', fontFamily: 'Inter, sans-serif' } } },
        { opposite: true, labels: { formatter: (val: number) => Math.round(val).toString(), style: { colors: '#3b82f6', fontFamily: 'Inter, sans-serif' } } }
      ],
      legend: { position: 'top', horizontalAlign: 'right', labels: { colors: labelColor } },
      tooltip: { theme: 'dark' },
      grid: { borderColor: 'rgba(255, 255, 255, 0.05)', strokeDashArray: 4 }
    };

    // Booking Status Breakdown (Donut/Pie)
    let confirmed = 0, checkedIn = 0, checkedOut = 0;
    bks.forEach(b => {
      const st = b.status?.toLowerCase();
      if (st === 'confirmed') confirmed++;
      else if (st === 'checked in') checkedIn++;
      else if (st === 'checked out') checkedOut++;
    });

    this.statusChartOptions = {
      series: [confirmed, checkedIn, checkedOut],
      chart: { type: 'donut', height: 260, background: 'transparent', animations: { enabled: false } },
      labels: ['Confirmed', 'Checked In', 'Checked Out'],
      colors: ['#ffe082', '#dc2626', '#10b981'],
      dataLabels: { enabled: false },
      stroke: { show: true, colors: ['var(--theme-card)'], width: 2 },
      plotOptions: {
        pie: {
          donut: {
            size: '75%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '11px',
                color: labelColor,
                offsetY: -10
              },
              value: {
                show: true,
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#ffffff',
                offsetY: 10,
                formatter: (val: string) => val
              },
              total: {
                show: true,
                label: 'Total Stays',
                color: labelColor,
                fontSize: '11px',
                formatter: (w: any) => {
                  return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toString();
                }
              }
            }
          }
        }
      },
      legend: { position: 'bottom', labels: { colors: labelColor } },
      tooltip: { theme: 'dark' },
      theme: { mode: 'dark' } as any,
      // TypeScript compiler complains if we don't satisfy all properties, but some are optional.
      xaxis: { categories: [] } as any,
      yaxis: { labels: {} } as any,
      grid: {} as any,
      fill: {} as any
    };
  }

  getOccupancyPacing(): number {
    const total = this.filteredBookings.length;
    if (!total) return 0;
    return Math.round((this.activeCheckedInCount / total) * 100);
  }

  exportToExcel(): void {
    const dataToExport = this.filteredBookings;
    if (dataToExport.length === 0) {
      this.message.warning('No bookings found in the selected date range to export.');
      return;
    }

    const headers = [
      'Guest Name',
      'Phone Number',
      'ID Number',
      'Room Number',
      'Room Category',
      'Booking Source',
      'Check In',
      'Check Out',
      'Number of Days',
      'Number of People',
      'Amount Paid (INR)',
      'Status'
    ];

    const rows = dataToExport.map(b => [
      b.guest_name || '',
      b.phone_number || '',
      b.id_number || '',
      b.room_number || '',
      b.room_category || '',
      b.booking_source || '',
      b.check_in ? new Date(b.check_in).toISOString().split('T')[0] : '',
      b.check_out ? new Date(b.check_out).toISOString().split('T')[0] : '',
      b.number_of_days || 1,
      b.number_of_people || 1,
      b.amount_paid || 0,
      b.status || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF'
      + [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);

    let fileName = 'Room_Bookings_Report';
    if (this.globalDateRange && this.globalDateRange.length === 2) {
      const startStr = new Date(this.globalDateRange[0]).toISOString().split('T')[0];
      const endStr = new Date(this.globalDateRange[1]).toISOString().split('T')[0];
      fileName += `_${startStr}_to_${endStr}`;
    } else {
      fileName += `_${new Date().toISOString().split('T')[0]}`;
    }

    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.message.success(`Exported ${dataToExport.length} bookings successfully.`);
  }

  saveBookings(): void {
    try {
      const key = this.getBookingsKey();
      localStorage.setItem(key, JSON.stringify(this.bookings));
    } catch (e) {
      console.error('Failed to save bookings to local storage', e);
    }
  }

  isRecalculating = false;

  setupFormValueChanges(): void {
    this.bookingForm.get('check_in')?.valueChanges.subscribe(() => {
      this.recalculateCheckOut();
    });

    this.bookingForm.get('number_of_days')?.valueChanges.subscribe(() => {
      this.recalculateCheckOut();
    });

    this.bookingForm.get('check_out')?.valueChanges.subscribe(() => {
      this.recalculateDaysFromDates();
    });

    this.bookingForm.get('room_category')?.valueChanges.subscribe(() => {
      const currentCategory = this.bookingForm.get('room_category')?.value;
      if (currentCategory && this.getRoomsByCategory(currentCategory).length > 0) {
        this.bookingForm.patchValue({ room_number: '' }, { emitEvent: false });
      }
    });
  }

  recalculateCheckOut(): void {
    if (this.isRecalculating) return;
    this.isRecalculating = true;

    const checkIn = this.bookingForm.get('check_in')?.value;
    const days = this.bookingForm.get('number_of_days')?.value;

    if (checkIn && days && days > 0) {
      const checkOutDate = DateUtils.addDays(checkIn, days);
      this.bookingForm.patchValue({ check_out: checkOutDate }, { emitEvent: false });
    }

    this.isRecalculating = false;
  }

  recalculateDaysFromDates(): void {
    if (this.isRecalculating) return;
    this.isRecalculating = true;

    const checkIn = this.bookingForm.get('check_in')?.value;
    const checkOut = this.bookingForm.get('check_out')?.value;

    if (checkIn && checkOut) {
      const diffDays = DateUtils.getDaysBetween(checkIn, checkOut);
      this.bookingForm.patchValue({ number_of_days: diffDays }, { emitEvent: false });
    }

    this.isRecalculating = false;
  }

  // Debounce timer for search
  private searchTimeout: any;

  onGuestNameInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.onGuestSearchChange(value);
  }

  onGuestSearchChange(value: string): void {
    if (!value) {
      this.guestSearchResults = [];
      return;
    }

    // If no match yet, trigger the backend search with debounce
    if (this.guestSearchTimer) {
      clearTimeout(this.guestSearchTimer);
    }

    this.guestSearchTimer = setTimeout(async () => {
      if (value.trim().length < 2) return;
      const profile = this.supabase.currentProfile;
      if (!this.isDatabaseLinked || !profile || !profile.hotel_id) return;

      try {
        const { data, error } = await this.supabase.searchGuests(profile.hotel_id, value);

        if (!error && data) {
          this.guestSearchResults = data;
        }
      } catch (e) {
        console.error('Failed to search guests:', e);
      }
    }, 400);
  }

  onGuestSelected(event: any, guest: any): void {
    if (event && event.isUserInput) {
      let formattedPhone = guest.phone_number || '';
      if (formattedPhone && formattedPhone.length === 10 && !formattedPhone.startsWith('+91')) {
        formattedPhone = '+91 ' + formattedPhone;
      } else if (formattedPhone && formattedPhone.startsWith('+91') && formattedPhone[3] !== ' ') {
        formattedPhone = '+91 ' + formattedPhone.substring(3);
      } else if (!formattedPhone) {
        formattedPhone = '+91 ';
      }

      this.guestForm.patchValue({
        name: guest.name || '',
        phone_number: formattedPhone,
        id_number: guest.id_number || '',
        id_type: guest.id_type || 'Aadhar Card',
        address: guest.address || ''
      });
      this.guestForm.updateValueAndValidity();
      this.message.success(`Auto-filled details for: ${guest.name}`);

      // Also update the search query field to reflect the selected name
      setTimeout(() => {
        this.guestSearchQuery = guest.name;
      }, 0);
    }
  }

  openGuestModal(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.guestForm.reset({ phone_number: '+91 ', id_type: 'Aadhar Card' });
    this.guestSearchQuery = '';
    this.guestSearchResults = [];
    this.isGuestModalVisible = true;
  }

  removeGuest(index: number, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedGuests.splice(index, 1);
    this.updateBookingFormGuests();
  }

  updateBookingFormGuests(): void {
    this.bookingForm.patchValue({
      guest_name: this.selectedGuests.map(g => g.name).join(', '),
      phone_number: this.selectedGuests.map(g => g.phone_number).filter(Boolean).join(', '),
      id_number: this.selectedGuests.map(g => g.id_number).filter(Boolean).join(', '),
      address: this.selectedGuests[0]?.address || '',
      number_of_people: Math.max(1, this.selectedGuests.length)
    });
    this.bookingForm.updateValueAndValidity();
  }

  handleGuestCancel(): void {
    this.isGuestModalVisible = false;
    this.guestForm.reset({ phone_number: '+91 ', id_type: 'Aadhar Card' });
  }

  async handleGuestOk(): Promise<void> {
    if (this.guestForm.valid) {
      this.isGuestOkLoading = true;
      try {
        const formValue = this.guestForm.value;
        const profile = this.supabase.currentProfile;
        const hotelId = profile?.hotel_id;

        if (this.isDatabaseLinked && hotelId) {
          // Check if guest already exists by phone number
          const { data: existing } = await this.supabase.getGuestByPhone(hotelId, formValue.phone_number);

          if (!existing) {
            const { error } = await this.supabase.insertGuest({
                hotel_id: hotelId,
                name: formValue.name,
                phone_number: formValue.phone_number,
                id_number: formValue.id_number || '',
                id_type: formValue.id_type || 'Aadhar Card',
                address: formValue.address || ''
              });

            if (error) {
              console.warn('Could not save to guests table (perhaps table is missing):', error);
            } else {
              this.message.success('Guest profile created and saved to database!');
            }
          } else {
            const { error: updateError } = await this.supabase.updateGuest(existing.id, {
                name: formValue.name,
                id_number: formValue.id_number || '',
                address: formValue.address || ''
              });

            if (!updateError) {
              this.message.success('Guest profile updated!');
            }
          }
        }

        // Add this guest to our selectedGuests array
        this.selectedGuests.push({
          name: formValue.name,
          phone_number: formValue.phone_number,
          id_number: formValue.id_number || '',
          address: formValue.address || ''
        });

        // Auto-fill the booking form with this new guest's details
        this.updateBookingFormGuests();

        this.isGuestModalVisible = false;
        this.guestForm.reset({ phone_number: '+91 ', id_type: 'Aadhar Card' });
      } catch (e: any) {
        console.error('Failed to create guest:', e);
        this.message.error(e.message || 'Failed to create guest profile');
      } finally {
        this.isGuestOkLoading = false;
      }
    } else {
      Object.values(this.guestForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  openBookingAddModal(): void {
    this.editingBookingId = null;
    this.fileList = [];
    this.selectedGuests = [];
    const now = new Date();
    const defaultCheckOut = DateUtils.addDays(now, 1);
    this.bookingForm.reset({
      guest_name: '',
      phone_number: '',
      id_number: '',
      room_number: '',
      room_category: '',
      booking_source: '',
      pincode: '',
      address: '',
      check_in: now,
      check_out: defaultCheckOut,
      number_of_days: 1,
      number_of_people: 1,
      total_amount: null,
      amount_paid: null,
      status: 'Checked In'
    });
    this.isBookingModalVisible = true;
  }

  openBookingEditModal(data: any): void {
    this.editingBookingId = data.id;
    this.fileList = [];

    // Parse existing guests from comma-separated string
    this.selectedGuests = [];
    if (data.guest_name) {
      const names = data.guest_name.split(',').map((s: string) => s.trim());
      const phones = (data.phone_number || '').split(',').map((s: string) => s.trim());
      const ids = (data.id_number || '').split(',').map((s: string) => s.trim());

      for (let i = 0; i < names.length; i++) {
        if (names[i]) {
          this.selectedGuests.push({
            name: names[i],
            phone_number: phones[i] || '',
            id_number: ids[i] || '',
            address: i === 0 ? data.address : ''
          });
        }
      }
    }

    let days = data.number_of_days;
    if (!days && data.check_in && data.check_out) {
      days = DateUtils.getDaysBetween(data.check_in, data.check_out);
    }

    this.bookingForm.reset({
      guest_name: data.guest_name,
      phone_number: data.phone_number || '',
      id_number: data.id_number || '',
      room_number: data.room_number,
      room_category: data.room_category || '',
      booking_source: data.booking_source || '',
      pincode: '',
      address: data.address || '',
      check_in: data.check_in,
      check_out: data.check_out,
      number_of_days: days || 1,
      number_of_people: data.number_of_people || 1,
      total_amount: data.total_amount || null,
      amount_paid: data.amount_paid || null,
      status: data.status
    }, { emitEvent: false });
    this.isBookingModalVisible = true;
  }

  handleBookingCancel(): void {
    this.isBookingModalVisible = false;
    this.editingBookingId = null;
    this.bookingForm.reset();
  }

  async updateBookingStatusDirectly(booking: any, newStatus: string): Promise<void> {
    const oldStatus = booking.status;
    
    if (newStatus === 'Checked Out') {
      // Temporarily nullify the status to force Angular to push the old value 
      // back into the nz-select component, reverting the visual change immediately.
      // If the checkout is completed successfully, the grid will reload anyway.
      booking.status = null;
      setTimeout(() => {
        booking.status = oldStatus;
      });
      
      this.supabase.requestOpenCheckout(booking);
      return;
    }

    try {
      const affectedDates = this.getStayDates(booking.check_in, booking.check_out);

      if (this.isDatabaseLinked) {
        const updatePayload: any = {
          status: newStatus,
          actual_checkout: null
        };

        const { error } = await this.supabase.updateRoomBooking(booking.id, updatePayload);

        if (error) throw error;
        this.message.success(`Status updated to ${newStatus} in database!`);
      } else {
        this.message.success(`Status updated to ${newStatus}!`);
      }

      // Update local array reference
      booking.status = newStatus;
      booking.actual_checkout = null;
      this.bookings = [...this.bookings];

      if (!this.isDatabaseLinked) {
        this.saveBookings();
      }

      // Trigger sync to update daily entries counts
      await this.syncBookingsToDailyEntries(affectedDates);
    } catch (e: any) {
      console.error('Failed to update status directly:', e);
      this.message.error(e.message || 'Failed to update status');
    }
  }


  async handleBookingOk(): Promise<void> {
    if (this.selectedGuests.length === 0) {
      this.message.error('Please add at least one guest profile before saving the booking.', { nzDuration: 4000 });
      return;
    }

    if (this.bookingForm.valid) {
      const formValue = this.bookingForm.value;
      const newIn = new Date(formValue.check_in);
      const newOut = new Date(formValue.check_out);

      if (newOut <= newIn) {
        this.message.error('Check-out date and time must be after check-in.');
        return;
      }

      const isOverlap = this.bookings.some(b => {
        if (this.editingBookingId && b.id === this.editingBookingId) return false;
        if (b.status === 'Cancelled') return false;
        if (b.room_number !== formValue.room_number) return false;

        const extIn = new Date(b.check_in);
        const extOut = new Date(b.check_out);
        return (newIn < extOut && newOut > extIn);
      });

      if (isOverlap) {
        this.message.error(`Room ${formValue.room_number} is already booked for these overlapping dates/times.`);
        return;
      }

      this.isOkLoading = true;
      const profile = this.supabase.currentProfile;
      const hotelId = profile?.hotel_id;

      let affectedDates: string[] = [];

      if (this.isDatabaseLinked) {
        try {


          const dbPayload: any = {
            guest_name: formValue.guest_name,
            phone_number: formValue.phone_number || '',
            id_number: formValue.id_number || '',
            room_number: formValue.room_number,
            room_category: formValue.room_category || '',
            booking_source: formValue.booking_source || '',
            address: formValue.address || '',
            check_in: formValue.check_in,
            check_out: formValue.check_out,
            number_of_days: formValue.number_of_days,
            number_of_people: formValue.number_of_people,
            total_amount: formValue.total_amount || 0,
            amount_paid: formValue.amount_paid || 0,
            status: formValue.status,
            actual_checkout: null,
            gst_number: formValue.gst_number || '',
            company_name: formValue.company_name || '',
            notes: formValue.notes || ''
          };

          if (this.editingBookingId) {
            // Find old booking to compute old stay dates
            const oldBooking = this.bookings.find(b => b.id === this.editingBookingId);
            if (oldBooking) {
              const oldStayDates = this.getStayDates(oldBooking.check_in, oldBooking.check_out);
              const newStayDates = this.getStayDates(formValue.check_in, formValue.check_out);
              affectedDates = Array.from(new Set([...oldStayDates, ...newStayDates]));

              dbPayload.actual_checkout = oldBooking.actual_checkout;
              if (formValue.status === 'Checked Out' && !oldBooking.actual_checkout) {
                dbPayload.actual_checkout = new Date().toISOString();
              } else if (formValue.status !== 'Checked Out') {
                dbPayload.actual_checkout = null;
              }
            } else {
              affectedDates = this.getStayDates(formValue.check_in, formValue.check_out);
            }

            // Update Supabase
            let { error } = await this.supabase.updateRoomBooking(this.editingBookingId, dbPayload);

            if (error) {
              const errMsg = error.message || '';
              if (errMsg.includes('number_of_days') || errMsg.includes('number_of_people')) {
                delete dbPayload.number_of_days;
                delete dbPayload.number_of_people;
                const retryRes = await this.supabase.updateRoomBooking(this.editingBookingId, dbPayload);
                error = retryRes.error;
              }
            }

            if (error) throw error;
            this.message.success('Booking entry updated successfully in database!');
          } else {
            affectedDates = this.getStayDates(formValue.check_in, formValue.check_out);
            dbPayload.hotel_id = hotelId;
            dbPayload.actual_checkout = formValue.status === 'Checked Out' ? new Date().toISOString() : null;

            // Insert Supabase
            let { data: insertedDataArray, error } = await this.supabase.insertRoomBooking(dbPayload);
            let insertedData = insertedDataArray ? insertedDataArray[0] : null;

            if (error) {
              const errMsg = error.message || '';
              if (errMsg.includes('number_of_days') || errMsg.includes('number_of_people')) {
                delete dbPayload.number_of_days;
                delete dbPayload.number_of_people;
                const retryRes = await this.supabase.insertRoomBooking(dbPayload);
                error = retryRes.error;
                insertedData = retryRes.data ? retryRes.data[0] : null;
              }
            }

            if (error) throw error;
            this.editingBookingId = insertedData.id; // Store ID for file upload
            this.message.success('Room booked successfully in database!');
          }

          // Handle File Uploads
          if (this.fileList.length > 0 && this.editingBookingId) {
            this.isUploadingFiles = true;
            let uploadCount = 0;
            const newPaths: string[] = [];

            for (const file of this.fileList) {
              // Only upload if it doesn't have a URL (meaning it's a new file)
              if (!file.url && file as any) {
                try {
                  const actualFile = (file as any).originFileObj || file;
                  const path = await this.supabase.uploadHotelDocument(actualFile, 'bookings', this.editingBookingId);
                  if (path) {
                    newPaths.push(path);
                    uploadCount++;
                  }
                } catch (e) {
                  console.error('Failed to upload file', file.name, e);
                  this.message.error(`Failed to upload ${file.name}`);
                }
              }
            }

            if (newPaths.length > 0) {
              // Update the booking record with the new file paths
              // In a real app we'd fetch the existing JSON array first and append, 
              // but for now we'll just set them (assuming new booking)
              const { error: updatePathsError } = await this.supabase.updateRoomBooking(this.editingBookingId, { id_documents: newPaths });

              if (!updatePathsError) {
                this.message.success(`Uploaded ${uploadCount} document(s) successfully.`);
              }
            }
            this.isUploadingFiles = false;
          }

          await this.loadBookings();

          // Sync to Daily Entries
          await this.syncBookingsToDailyEntries(affectedDates);

          this.isBookingModalVisible = false;
          this.editingBookingId = null;
        } catch (e: any) {
          console.error('Failed to save booking to Supabase', e);
          this.message.error(e.message || 'Failed to save booking to database');
        } finally {
          this.isOkLoading = false;
        }
      } else {
        // Fallback Local Storage
        if (this.editingBookingId) {
          const oldBooking = this.bookings.find(b => b.id === this.editingBookingId);
          if (oldBooking) {
            const oldStayDates = this.getStayDates(oldBooking.check_in, oldBooking.check_out);
            const newStayDates = this.getStayDates(formValue.check_in, formValue.check_out);
            affectedDates = Array.from(new Set([...oldStayDates, ...newStayDates]));
          } else {
            affectedDates = this.getStayDates(formValue.check_in, formValue.check_out);
          }

          this.bookings = this.bookings.map(b => {
            if (b.id === this.editingBookingId) {
              let actualOut = b.actual_checkout;
              if (formValue.status === 'Checked Out' && !b.actual_checkout) {
                actualOut = new Date();
              } else if (formValue.status !== 'Checked Out') {
                actualOut = null;
              }
              return {
                ...b,
                ...formValue,
                actual_checkout: actualOut
              };
            }
            return b;
          });
          this.message.success('Booking entry updated successfully!');
        } else {
          affectedDates = this.getStayDates(formValue.check_in, formValue.check_out);
          const newBooking = {
            id: Math.random().toString(36).substring(2, 9),
            ...formValue,
            actual_checkout: formValue.status === 'Checked Out' ? new Date() : null,
            created_at: new Date()
          };
          this.bookings = [newBooking, ...this.bookings];
          this.message.success('Room booked successfully!');
        }
        this.saveBookings();

        // Sync to Daily Entries
        await this.syncBookingsToDailyEntries(affectedDates);

        this.isBookingModalVisible = false;
        this.editingBookingId = null;
        this.isOkLoading = false;
      }
    } else {
      Object.values(this.bookingForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  async deleteBooking(id: string): Promise<void> {
    const deletedBooking = this.bookings.find(b => b.id === id);
    let affectedDates: string[] = [];
    if (deletedBooking) {
      affectedDates = this.getStayDates(deletedBooking.check_in, deletedBooking.check_out);
    }

    if (this.isDatabaseLinked) {
      try {
        const { error } = await this.supabase.deleteRoomBooking(id);

        if (error) throw error;
        this.message.success('Booking record deleted successfully from database!');
        await this.loadBookings();
        await this.syncBookingsToDailyEntries(affectedDates);
      } catch (e: any) {
        console.error('Failed to delete booking from Supabase', e);
        this.message.error(e.message || 'Failed to delete booking');
      }
    } else {
      this.bookings = this.bookings.filter(b => b.id !== id);
      this.saveBookings();
      await this.syncBookingsToDailyEntries(affectedDates);
      this.message.success('Booking record deleted successfully!');
    }
  }

  // --- Attachments Viewer ---
  async viewAttachments(paths: string[]) {
    this.attachmentUrls = [];
    this.isAttachmentModalVisible = true;
    this.isLoadingAttachments = true;

    for (const path of paths) {
      try {
        const url = await this.supabase.getSignedDocumentUrl(path);
        if (url) {
          this.attachmentUrls.push(url);
        }
      } catch (e) {
        console.error('Failed to load attachment URL', e);
      }
    }
    this.isLoadingAttachments = false;
  }

  // --- Stay Dates & Daily Entries Recalculation Sync Helpers ---

  getStayDates(checkIn: any, checkOut: any): string[] {
    if (!checkIn || !checkOut) return [];
    const dates: string[] = [];
    const start = new Date(checkIn);
    start.setHours(0, 0, 0, 0);
    const end = new Date(checkOut);
    end.setHours(0, 0, 0, 0);

    if (end <= start) {
      dates.push(this.getLocalDateString(start));
      return dates;
    }

    const current = new Date(start);
    while (current < end) {
      dates.push(this.getLocalDateString(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  getLocalDateString(date: Date): string {
    return DateUtils.toLocalDateString(date);
  }

  getDbColumn(roomCategory: string): string {
    const name = (roomCategory || '').toLowerCase();
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
    return 'standard_ac_rooms_sold'; // default fallback
  }

  async syncBookingsToDailyEntries(dates: string[]): Promise<void> {
    const profile = this.supabase.currentProfile;
    const hotelId = profile?.hotel_id || 'default';
    const userId = this.supabase.currentUser?.id;

    // Calculate total capacity from room config
    let totalRoomsLimit = 0;
    if (this.roomConfig) {
      Object.keys(this.roomConfig).forEach(key => {
        if (key !== '_order') {
          totalRoomsLimit += Array.isArray(this.roomConfig[key]) ? this.roomConfig[key].length : Number(this.roomConfig[key] || 0);
        }
      });
    }

    // Load all bookings first to compute occupancy
    let allBookings: any[] = [];
    if (this.isDatabaseLinked) {
      try {
        const { data } = await this.supabase.getRoomBookings(hotelId !== 'default' ? hotelId : undefined);
        if (data) allBookings = data;
      } catch (e) {
        console.error('Failed to get all bookings for sync:', e);
      }
    } else {
      const key = `bookings_${hotelId}`;
      const raw = localStorage.getItem(key);
      if (raw) allBookings = JSON.parse(raw);
    }

    for (const targetDateStr of dates) {
      const targetDate = new Date(targetDateStr);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Filter active bookings on targetDate
      const activeBookings = allBookings.filter((b: any) => {
        if (b.status === 'Cancelled' || b.status?.toLowerCase() === 'cancelled') return false;
        const checkIn = new Date(b.check_in);
        const checkOut = new Date(b.check_out);
        return (checkIn <= endOfDay && checkOut >= startOfDay);
      });

      // Recalculate room categories
      let standard_ac = 0;
      let standard_non_ac = 0;
      let deluxe = 0;
      let suite = 0;

      activeBookings.forEach((b: any) => {
        const col = this.getDbColumn(b.room_category || '');
        if (col === 'standard_ac_rooms_sold') standard_ac++;
        else if (col === 'standard_non_ac_rooms_sold') standard_non_ac++;
        else if (col === 'deluxe_rooms_sold') deluxe++;
        else if (col === 'suite_rooms_sold') suite++;
      });

      const rooms_sold = activeBookings.length;
      const total_guests = activeBookings.reduce((sum: number, b: any) => sum + Number(b.number_of_people || 1), 0);

      // Revenue: sum of amount_paid of bookings that check in on this day
      let total_revenue = 0;
      activeBookings.forEach((b: any) => {
        const checkIn = new Date(b.check_in);
        if (this.getLocalDateString(checkIn) === targetDateStr) {
          total_revenue += Number(b.amount_paid || 0);
        }
      });

      if (this.isDatabaseLinked) {
        try {
          const { data: existing, error: findError } = await this.supabase.getDailyEntryByDate(hotelId, targetDateStr);

          if (!findError) {
            if (existing) {
              // Update
              await this.supabase.updateDailyEntry(existing.id, {
                rooms_sold,
                vacant_rooms: Math.max(0, totalRoomsLimit - rooms_sold),
                total_guests,
                total_revenue,
                standard_ac_rooms_sold: standard_ac,
                standard_non_ac_rooms_sold: standard_non_ac,
                deluxe_rooms_sold: deluxe,
                suite_rooms_sold: suite
              });
            } else {
              await this.supabase.insertDailyEntry({
                hotel_id: hotelId,
                entry_date: targetDateStr,
                rooms_sold,
                total_rooms_available: totalRoomsLimit,
                vacant_rooms: Math.max(0, totalRoomsLimit - rooms_sold),
                total_guests,
                total_revenue,
                standard_ac_rooms_sold: standard_ac,
                standard_non_ac_rooms_sold: standard_non_ac,
                deluxe_rooms_sold: deluxe,
                suite_rooms_sold: suite,
                cash_payments: 0,
                upi_payments: 0,
                card_payments: 0,
                pending_payments: 0,
                restaurant_revenue: 0,
                other_service_revenue: 0,
                notes: 'Generated automatically from Room Bookings',
                created_by: userId
              });
            }
          }
        } catch (e) {
          console.error('Database daily_entries sync failed:', e);
        }
      } else {
        // Local Storage Sync
        const key = `daily_entries_${hotelId}`;
        let localEntries: any[] = [];
        const raw = localStorage.getItem(key);
        if (raw) localEntries = JSON.parse(raw);

        const existingIdx = localEntries.findIndex((e: any) => e.entry_date === targetDateStr);
        const updatedEntry = {
          entry_date: targetDateStr,
          rooms_sold,
          total_rooms_available: totalRoomsLimit,
          vacant_rooms: Math.max(0, totalRoomsLimit - rooms_sold),
          total_guests,
          total_revenue,
          standard_ac_rooms_sold: standard_ac,
          standard_non_ac_rooms_sold: standard_non_ac,
          deluxe_rooms_sold: deluxe,
          suite_rooms_sold: suite,
          notes: 'Generated automatically from Room Bookings'
        };

        if (existingIdx > -1) {
          localEntries[existingIdx] = {
            ...localEntries[existingIdx],
            ...updatedEntry
          };
        } else {
          localEntries.push({
            id: Math.random().toString(36).substring(2, 9),
            ...updatedEntry
          });
        }
        localStorage.setItem(key, JSON.stringify(localEntries));
      }
    }
  }

  extendStay(booking: any): void {
    this.supabase.requestOpenExtension(booking);
  }

  showSqlModal(): void {
    this.isSqlModalVisible = true;
  }

  closeSqlModal(): void {
    this.isSqlModalVisible = false;
  }
}
