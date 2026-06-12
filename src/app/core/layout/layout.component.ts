import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SupabaseService } from '../services/supabase.service';
import { ThemeService, Theme } from '../services/theme.service';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    NzAvatarModule,
    NzDropDownModule,
    NzButtonModule,
    NzModalModule,
    NzFormModule,
    NzSelectModule,
    NzInputModule,
    NzInputNumberModule,
    NzDatePickerModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './layout.component.html'
})
export class LayoutComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  isDailyEntryModalVisible = false;
  isOkLoading = false;
  dailyEntryForm: FormGroup;
  theme$: any;
  activeTitle = 'Executive Analytics';

  roomConfig: any = {};
  roomTypes: string[] = [];
  totalRoomsLimit = 0;

  // Checkout Alerts & Modals State
  bookings: any[] = [];
  snoozedAlerts = new Set<string>();
  alertIntervalId: any;
  isDatabaseLinked = true;

  // Checkout Alert Modal State
  isCheckoutAlertVisible = false;
  activeAlertBooking: any = null;

  // Stay Extension Modal State
  isExtensionModalVisible = false;
  extensionBooking: any = null;
  newCheckoutDate: Date | null = null;
  extensionDays = 1;
  isExtending = false;

  // Checkout Confirmation Modal State
  isCheckoutConfirmVisible = false;
  checkoutConfirmBooking: any = null;
  confirmCheckoutDate: Date | null = null;
  isSavingCheckout = false;

  constructor(
    private supabaseService: SupabaseService,
    private themeService: ThemeService,
    private fb: FormBuilder,
    private message: NzMessageService,
    private router: Router
  ) {
    this.theme$ = this.themeService.currentTheme$;
    this.dailyEntryForm = this.fb.group({
      entry_date: [new Date(), [Validators.required]],
      rooms_sold: [null, [Validators.required, Validators.min(0)]],
      total_rooms_available: [{ value: 0, disabled: true }, [Validators.required, Validators.min(1)]],
      total_guests: [null, [Validators.min(0)]],
      total_revenue: [null, [Validators.required, Validators.min(0)]],
      notes: ['']
    });

    this.supabaseService.profile.subscribe(profile => {
      if (profile && profile.room_config) {
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

        // Clean up any existing dynamic room controls
        Object.keys(this.dailyEntryForm.controls).forEach(key => {
          if (!['entry_date', 'rooms_sold', 'total_rooms_available', 'total_guests', 'total_revenue', 'notes'].includes(key)) {
            this.dailyEntryForm.removeControl(key);
          }
        });

        let totalLimit = 0;
        this.roomTypes.forEach(type => {
          const limit = this.roomConfig[type] || 0;
          totalLimit += limit;

          // Dynamically add a form control for this room type
          this.dailyEntryForm.addControl(
            type,
            this.fb.control(null, [Validators.min(0), Validators.max(limit)])
          );

          // Listen to changes to compute overall rooms sold
          this.dailyEntryForm.get(type)?.valueChanges.subscribe((value) => {
            const limitVal = this.roomConfig[type] || 0;
            if (value > limitVal) {
              this.dailyEntryForm.get(type)?.setValue(limitVal);
            } else {
              this.calculateTotalRoomsSold();
            }
          });
        });

        this.totalRoomsLimit = totalLimit;
        this.dailyEntryForm.patchValue({
          total_rooms_available: this.totalRoomsLimit
        });

        // Trigger pre-populate initially for the current default date (today)
        const initialDate = this.dailyEntryForm.get('entry_date')?.value || new Date();
        this.prepopulateFromBookings(initialDate);
      }
    });

    // Listen to changes on entry_date to pre-populate from bookings
    this.dailyEntryForm.get('entry_date')?.valueChanges.subscribe(async (date) => {
      if (date) {
        await this.prepopulateFromBookings(date);
      }
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateTitle();
    });
    this.updateTitle();
  }

  async prepopulateFromBookings(date: Date) {
    try {
      const targetDateStr = this.getLocalDateString(date);
      let activeBookings: any[] = [];

      const profile = this.supabaseService.currentProfile;
      const hotelId = profile?.hotel_id;

      // Try database first
      const client = this.supabaseService.getClient();
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await client
        .from('room_bookings')
        .select('*');

      if (!error && data) {
        activeBookings = data.filter((b: any) => {
          const checkIn = new Date(b.check_in);
          const checkOut = new Date(b.check_out);
          return (checkIn <= endOfDay && checkOut >= startOfDay);
        });
      } else {
        // Fallback local storage
        const key = `bookings_${hotelId || 'default'}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          activeBookings = parsed.filter((b: any) => {
            const checkIn = new Date(b.check_in);
            const checkOut = new Date(b.check_out);
            return (checkIn <= endOfDay && checkOut >= startOfDay);
          });
        }
      }

      const patchValues: any = {};

      // Initialize room category counters to 0
      this.roomTypes.forEach(type => {
        patchValues[type] = 0;
      });

      activeBookings.forEach(b => {
        const cat = b.room_category;
        if (this.roomTypes.includes(cat)) {
          patchValues[cat] = (patchValues[cat] || 0) + 1;
        } else if (cat) {
          const matchedType = this.roomTypes.find(t => t.toLowerCase() === cat.toLowerCase());
          if (matchedType) {
            patchValues[matchedType] = (patchValues[matchedType] || 0) + 1;
          }
        }
      });

      // Total guests defaults to count of active bookings
      patchValues.total_guests = activeBookings.length;

      // Revenue: sum of amount_paid of bookings that check in on this day
      let revenue = 0;
      activeBookings.forEach(b => {
        const checkIn = new Date(b.check_in);
        if (this.getLocalDateString(checkIn) === targetDateStr) {
          revenue += Number(b.amount_paid || 0);
        }
      });
      patchValues.total_revenue = revenue;

      // Update the form fields
      this.dailyEntryForm.patchValue(patchValues);

      // Recalculate total rooms sold from categories
      this.calculateTotalRoomsSold();
    } catch (e) {
      console.error('Failed to prepopulate daily entry from bookings:', e);
    }
  }

  getLocalDateString(date: Date): string {
    const d = new Date(date);
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
  }

  calculateTotalRoomsSold() {
    const totalSold = this.roomTypes.reduce((sum, type) => sum + (this.dailyEntryForm.get(type)?.value || 0), 0);
    this.dailyEntryForm.patchValue({ rooms_sold: totalSold }, { emitEvent: false });
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

  updateTitle() {
    const url = this.router.url;
    if (url.includes('/dashboard') || url.includes('/analytics')) {
      this.activeTitle = 'Executive Analytics';
    } else if (url.includes('/daily-entries')) {
      this.activeTitle = 'Daily Log Entries';
    } else if (url.includes('/bookings')) {
      this.activeTitle = 'Room Bookings Ledger';
    } else if (url.includes('/expenses')) {
      this.activeTitle = 'Monthly Expense Audit';
    } else if (url.includes('/reports')) {
      this.activeTitle = 'Financial Performance & Variance';
    } else if (url.includes('/settings')) {
      this.activeTitle = 'System Settings';
    } else {
      this.activeTitle = 'Hotelytics Console';
    }
  }

  setTheme(theme: string) {
    this.themeService.setTheme(theme as Theme);
  }

  get profile$() {
    return this.supabaseService.profile;
  }

  showDailyEntryModal(): void {
    this.isDailyEntryModalVisible = true;
    const date = this.dailyEntryForm.get('entry_date')?.value || new Date();
    this.prepopulateFromBookings(date);
  }

  async handleOk(): Promise<void> {
    if (this.dailyEntryForm.valid) {
      this.isOkLoading = true;
      try {
        const formData = this.dailyEntryForm.getRawValue();
        const client = this.supabaseService.getClient();
        const user = this.supabaseService.currentUser;
        const profile = this.supabaseService.currentProfile;

        if (!profile || !profile.hotel_id) {
          throw new Error('No hotel context found. Please log out and back in.');
        }

        const dateObj = formData.entry_date instanceof Date ? formData.entry_date : new Date(formData.entry_date);
        const offset = dateObj.getTimezoneOffset();
        const entryDateStr = new Date(dateObj.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

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

        const { error } = await client.from('daily_entries').insert([
          {
            hotel_id: profile.hotel_id,
            entry_date: entryDateStr,
            rooms_sold: formData.rooms_sold,
            total_rooms_available: formData.total_rooms_available,
            vacant_rooms: vacantRooms >= 0 ? vacantRooms : 0,
            total_guests: formData.total_guests || 0,
            total_revenue: formData.total_revenue,
            ...dbRoomData,
            cash_payments: 0,
            upi_payments: 0,
            card_payments: 0,
            pending_payments: 0,
            restaurant_revenue: 0,
            other_service_revenue: 0,
            notes: formData.notes,
            created_by: user?.id
          }
        ]);

        if (error) {
          if (error.code === '23505') {
            throw new Error('An entry for this date already exists!');
          }
          throw error;
        }

        this.message.success('Daily entry added successfully!');
        this.isDailyEntryModalVisible = false;

        const resetObj: any = {
          entry_date: new Date(),
          rooms_sold: 0,
          total_rooms_available: this.totalRoomsLimit,
          total_guests: 0,
          total_revenue: 0
        };
        this.roomTypes.forEach(type => {
          resetObj[type] = 0;
        });
        this.dailyEntryForm.reset(resetObj);
        
        window.location.reload();
      } catch (error: any) {
        this.message.error(error.message || 'Failed to add daily entry');
      } finally {
        this.isOkLoading = false;
      }
    } else {
      Object.values(this.dailyEntryForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  handleCancel(): void {
    this.isDailyEntryModalVisible = false;
  }

  async logout() {
    await this.supabaseService.signOut();
  }

  ngOnInit(): void {
    this.loadBookings();

    // Scan for checkout time warnings every 30 seconds
    this.alertIntervalId = setInterval(() => {
      this.checkImpendingCheckouts();
    }, 30000);

    // Subscribe to bookings update stream
    this.supabaseService.bookingsUpdated.subscribe(updated => {
      if (updated) {
        this.loadBookings();
      }
    });

    // Subscribe to open checkout requests from Bookings Component
    this.supabaseService.openCheckoutRequest.subscribe(booking => {
      if (booking) {
        this.openCheckoutConfirmModal(booking);
      }
    });

    // Subscribe to open extension requests from Bookings Component
    this.supabaseService.openExtensionRequest.subscribe(booking => {
      if (booking) {
        this.openExtensionModal(booking);
      }
    });
  }

  @HostListener('window:openDailyEntryModal')
  onOpenDailyEntryModal() {
    this.showDailyEntryModal();
  }

  handleAddRoomClick() {
    if (this.router.url.includes('/bookings')) {
      window.dispatchEvent(new Event('openBookingModal'));
    } else {
      this.router.navigate(['/bookings']).then(() => {
        setTimeout(() => {
          window.dispatchEvent(new Event('openBookingModal'));
        }, 100);
      });
    }
  }

  ngOnDestroy(): void {
    if (this.alertIntervalId) {
      clearInterval(this.alertIntervalId);
    }
  }

  getBookingsKey(): string {
    const profile = this.supabaseService.currentProfile;
    const hotelId = profile?.hotel_id || 'default';
    return `bookings_${hotelId}`;
  }

  async loadBookings(): Promise<void> {
    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client
        .from('room_bookings')
        .select('*')
        .order('created_at', { ascending: false });

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
        this.checkImpendingCheckouts();
      }
    } catch (e: any) {
      console.error('Failed to load bookings in Layout, falling back to local storage', e);
      this.isDatabaseLinked = false;
      this.loadLocalBookings();
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
        this.checkImpendingCheckouts();
      } else {
        this.bookings = [];
      }
    } catch (e) {
      console.error('Failed to load bookings locally in Layout', e);
      this.bookings = [];
    }
  }

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

  getDbColumnForSync(roomCategory: string): string {
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
    return 'standard_ac_rooms_sold';
  }

  async syncBookingsToDailyEntries(dates: string[]): Promise<void> {
    const profile = this.supabaseService.currentProfile;
    const hotelId = profile?.hotel_id || 'default';
    const userId = this.supabaseService.currentUser?.id;

    let totalRoomsLimit = 0;
    if (profile && profile.room_config) {
      const config = profile.room_config;
      Object.keys(config).forEach(key => {
        if (key !== '_order') {
          totalRoomsLimit += Number(config[key] || 0);
        }
      });
    }

    let allBookings: any[] = [];
    if (this.isDatabaseLinked) {
      try {
        const client = this.supabaseService.getClient();
        const { data } = await client.from('room_bookings').select('*');
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

      const activeBookings = allBookings.filter((b: any) => {
        const checkIn = new Date(b.check_in);
        const checkOut = new Date(b.check_out);
        return (checkIn <= endOfDay && checkOut >= startOfDay);
      });

      let standard_ac = 0;
      let standard_non_ac = 0;
      let deluxe = 0;
      let suite = 0;

      activeBookings.forEach((b: any) => {
        const col = this.getDbColumnForSync(b.room_category || '');
        if (col === 'standard_ac_rooms_sold') standard_ac++;
        else if (col === 'standard_non_ac_rooms_sold') standard_non_ac++;
        else if (col === 'deluxe_rooms_sold') deluxe++;
        else if (col === 'suite_rooms_sold') suite++;
      });

      const rooms_sold = standard_ac + standard_non_ac + deluxe + suite;
      const total_guests = activeBookings.length;

      let total_revenue = 0;
      activeBookings.forEach((b: any) => {
        const checkIn = new Date(b.check_in);
        if (this.getLocalDateString(checkIn) === targetDateStr) {
          total_revenue += Number(b.amount_paid || 0);
        }
      });

      if (this.isDatabaseLinked) {
        try {
          const client = this.supabaseService.getClient();
          const { data: existing, error: findError } = await client
            .from('daily_entries')
            .select('id')
            .eq('hotel_id', hotelId)
            .eq('entry_date', targetDateStr)
            .maybeSingle();

          if (!findError) {
            if (existing) {
              await client
                .from('daily_entries')
                .update({
                  rooms_sold,
                  vacant_rooms: Math.max(0, totalRoomsLimit - rooms_sold),
                  total_guests,
                  total_revenue,
                  standard_ac_rooms_sold: standard_ac,
                  standard_non_ac_rooms_sold: standard_non_ac,
                  deluxe_rooms_sold: deluxe,
                  suite_rooms_sold: suite
                })
                .eq('id', existing.id);
            } else {
              await client
                .from('daily_entries')
                .insert([{
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
                }]);
            }
          }
        } catch (e) {
          console.error('Database daily_entries sync failed:', e);
        }
      } else {
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

  checkImpendingCheckouts(): void {
    if (this.isCheckoutAlertVisible || this.isExtensionModalVisible || this.isCheckoutConfirmVisible) return;

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const impending = this.bookings.filter(b => {
      if (b.status !== 'Checked In' || !b.check_out) return false;
      if (this.snoozedAlerts.has(b.id)) return false;
      const checkoutTime = new Date(b.check_out);
      return checkoutTime <= oneHourLater;
    });

    if (impending.length > 0) {
      this.activeAlertBooking = impending[0];
      this.isCheckoutAlertVisible = true;
    }
  }

  handleAlertCheckout(): void {
    if (!this.activeAlertBooking) return;
    const booking = this.activeAlertBooking;
    this.isCheckoutAlertVisible = false;
    this.openCheckoutConfirmModal(booking);
  }

  handleAlertExtend(): void {
    if (!this.activeAlertBooking) return;
    const booking = this.activeAlertBooking;
    this.isCheckoutAlertVisible = false;
    this.openExtensionModal(booking);
  }

  snoozeAlert(): void {
    if (!this.activeAlertBooking) return;
    const bookingId = this.activeAlertBooking.id;
    this.snoozedAlerts.add(bookingId);
    this.isCheckoutAlertVisible = false;
    this.activeAlertBooking = null;
    setTimeout(() => {
      this.snoozedAlerts.delete(bookingId);
    }, 15 * 60 * 1000);
  }

  openExtensionModal(booking: any): void {
    this.extensionBooking = booking;
    const currentOut = new Date(booking.check_out || new Date());
    this.newCheckoutDate = new Date(currentOut.getTime() + 24 * 60 * 60 * 1000);
    this.extensionDays = 1;
    this.isExtensionModalVisible = true;
  }

  onExtensionDaysChange(days: number): void {
    if (!this.extensionBooking || !days) return;
    const baseDate = new Date(this.extensionBooking.check_out);
    this.newCheckoutDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
  }

  onExtensionDateChange(date: Date): void {
    if (!this.extensionBooking || !date) return;
    const baseDate = new Date(this.extensionBooking.check_out);
    const diffTime = date.getTime() - baseDate.getTime();
    this.extensionDays = parseFloat(Math.max(0.1, diffTime / (1000 * 60 * 60 * 24)).toFixed(1));
  }

  async confirmExtension(): Promise<void> {
    if (!this.extensionBooking || !this.newCheckoutDate) return;
    
    this.isExtending = true;
    try {
      const start = new Date(this.extensionBooking.check_in);
      const end = new Date(this.newCheckoutDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      
      const affectedDates = this.getStayDates(this.extensionBooking.check_in, this.newCheckoutDate);

      if (this.isDatabaseLinked) {
        const client = this.supabaseService.getClient();
        const { error } = await client
          .from('room_bookings')
          .update({
            check_out: end.toISOString(),
            number_of_days: diffDays
          })
          .eq('id', this.extensionBooking.id);

        if (error) throw error;
      } else {
        const profile = this.supabaseService.currentProfile;
        const hotelId = profile?.hotel_id || 'default';
        const key = `bookings_${hotelId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          let localB = JSON.parse(raw);
          localB = localB.map((b: any) => {
            if (b.id === this.extensionBooking.id) {
              return { ...b, check_out: end, number_of_days: diffDays };
            }
            return b;
          });
          localStorage.setItem(key, JSON.stringify(localB));
        }
      }

      this.extensionBooking.check_out = end;
      this.extensionBooking.number_of_days = diffDays;
      this.loadBookings();

      await this.syncBookingsToDailyEntries(affectedDates);
      this.message.success('Stay extended successfully!');
      
      this.supabaseService.triggerBookingsRefresh();
      this.isExtensionModalVisible = false;
    } catch (e: any) {
      console.error(e);
      this.message.error(e.message || 'Failed to extend stay');
    } finally {
      this.isExtending = false;
    }
  }

  openCheckoutConfirmModal(booking: any): void {
    this.checkoutConfirmBooking = booking;
    this.confirmCheckoutDate = new Date();
    this.isCheckoutConfirmVisible = true;
  }

  async confirmCheckout(): Promise<void> {
    if (!this.checkoutConfirmBooking || !this.confirmCheckoutDate) return;
    
    this.isSavingCheckout = true;
    try {
      const booking = this.checkoutConfirmBooking;
      const checkoutVal = this.confirmCheckoutDate;
      const affectedDates = this.getStayDates(booking.check_in, checkoutVal);

      if (this.isDatabaseLinked) {
        const client = this.supabaseService.getClient();
        const updatePayload: any = { 
          status: 'Checked Out',
          actual_checkout: checkoutVal.toISOString()
        };

        const { error } = await client
          .from('room_bookings')
          .update(updatePayload)
          .eq('id', booking.id);

        if (error) throw error;
        this.message.success('Guest checked out successfully in database!');
      } else {
        const profile = this.supabaseService.currentProfile;
        const hotelId = profile?.hotel_id || 'default';
        const key = `bookings_${hotelId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          let localB = JSON.parse(raw);
          localB = localB.map((b: any) => {
            if (b.id === booking.id) {
              return { ...b, status: 'Checked Out', actual_checkout: checkoutVal };
            }
            return b;
          });
          localStorage.setItem(key, JSON.stringify(localB));
        }
        this.message.success('Guest checked out successfully!');
      }

      this.loadBookings();
      await this.syncBookingsToDailyEntries(affectedDates);
      
      this.supabaseService.triggerBookingsRefresh();
      this.isCheckoutConfirmVisible = false;
    } catch (e: any) {
      console.error('Failed to checkout guest:', e);
      this.message.error(e.message || 'Failed to checkout guest');
    } finally {
      this.isSavingCheckout = false;
    }
  }
}
