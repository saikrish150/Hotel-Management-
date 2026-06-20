import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    NzButtonModule, 
    NzIconModule, 
    NzInputModule, 
    NzInputNumberModule, 
    NzSpinModule,
    NzTabsModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  roomConfig: any = {};
  roomTypes: { key: string; limit: number; roomsListStr: string }[] = [];
  hotelId: string = '';
  isSaving = false;

  newCategoryName = '';
  newCategoryRoomsListStr = '';
  newCategoryLimit = 1;

  columnConfig: any = {};
  bookingsSortColumn = 'check_in';
  bookingsSortDirection = 'desc';
  bookingsMandatoryEditCheck = false;

  dailySortColumn = 'entry_date';
  dailySortDirection = 'desc';
  dailyMandatoryEditCheck = false;

  expensesSortColumn = 'month_year';
  expensesSortDirection = 'desc';
  expensesMandatoryEditCheck = false;

  bookingsTableList: any[] = [];
  bookingsPopupList: any[] = [];
  dailyTableList: any[] = [];
  dailyPopupList: any[] = [];
  expensesTableList: any[] = [];
  expensesPopupList: any[] = [];
  categoryColors = ['var(--theme-primary)', '#38bdf8', '#f59e0b', '#ec4899', '#a855f7', '#14b8a6', '#f43f5e', '#10b981'];

  moveSettingsColumn(list: any[], index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    // trigger change detection
    if (list === this.bookingsTableList) this.bookingsTableList = [...list];
    if (list === this.bookingsPopupList) this.bookingsPopupList = [...list];
    if (list === this.dailyTableList) this.dailyTableList = [...list];
    if (list === this.dailyPopupList) this.dailyPopupList = [...list];
    if (list === this.expensesTableList) this.expensesTableList = [...list];
    if (list === this.expensesPopupList) this.expensesPopupList = [...list];
  }

  // Computed statistics getters
  get totalRooms(): number {
    return this.roomTypes.reduce((sum, r) => sum + r.limit, 0);
  }

  get totalCategories(): number {
    return this.roomTypes.length;
  }

  get averageCapacity(): number {
    return this.roomTypes.length > 0 ? parseFloat((this.totalRooms / this.roomTypes.length).toFixed(1)) : 0;
  }

  get roomTypesDistribution() {
    const total = this.totalRooms || 1;
    return this.roomTypes.map((r, i) => ({
      key: r.key,
      limit: r.limit,
      pct: Math.round((r.limit / total) * 100),
      color: this.categoryColors[i % this.categoryColors.length]
    })).sort((a,b) => b.limit - a.limit);
  }

  constructor(
    private supabaseService: SupabaseService,
    private message: NzMessageService
  ) {}

  ngOnInit() {
    this.supabaseService.profile.subscribe(profile => {
      if (profile) {
        this.hotelId = profile.hotel_id || '';
        this.roomConfig = profile.room_config || {};
        this.columnConfig = profile.column_config || {};

        // Load Bookings preferences
        const bConf = this.columnConfig.bookings || {};
        this.bookingsSortColumn = bConf.sort_column || 'check_in';
        this.bookingsSortDirection = bConf.sort_direction || 'desc';
        this.bookingsMandatoryEditCheck = bConf.mandatory_edit_check || false;

        const defaultBookingCols = [
          { key: 'check_in', label: 'Check-In', visible: true, mandatory: true },
          { key: 'room_number', label: 'Room No', visible: true, mandatory: true },
          { key: 'room_category', label: 'Category', visible: true, mandatory: false },
          { key: 'booking_source', label: 'Booking Source', visible: true, mandatory: false },
          { key: 'guest_name', label: 'Guest Name', visible: true, mandatory: true },
          { key: 'address', label: 'Address', visible: true, mandatory: false },
          { key: 'id_number', label: 'ID Number', visible: true, mandatory: false },
          { key: 'phone_number', label: 'Phone Number', visible: true, mandatory: false },
          { key: 'company_name', label: 'Company Name', visible: false, mandatory: false },
          { key: 'gst_number', label: 'GST Number', visible: false, mandatory: false },
          { key: 'number_of_people', label: 'People', visible: true, mandatory: true },
          { key: 'number_of_days', label: 'Days', visible: true, mandatory: true },
          { key: 'total_amount', label: 'Amount Due', visible: true, mandatory: false },
          { key: 'amount_paid', label: 'Total Amount', visible: true, mandatory: false },
          { key: 'check_out', label: 'Scheduled Check-Out', visible: true, mandatory: true },
          { key: 'actual_checkout', label: 'Actual Check-Out', visible: true, mandatory: false },
          { key: 'notes', label: 'Notes', visible: false, mandatory: false },
          { key: 'id_documents', label: 'Attachments', visible: true, mandatory: false },
          { key: 'status', label: 'Status', visible: true, mandatory: true }
        ];

        let savedBookingTable = bConf.table || [];
        this.bookingsTableList = defaultBookingCols.map(def => {
          const saved = savedBookingTable.find((s: any) => s.key === def.key);
          return {
            ...def,
            visible: saved ? saved.visible !== false : def.visible,
            mandatory: saved ? saved.mandatory === true : def.mandatory
          };
        });
        if (savedBookingTable.length > 0) {
          const orderMap = new Map<string, number>(savedBookingTable.map((c: any, index: number) => [c.key, index]));
          this.bookingsTableList.sort((a, b) => {
            const indexA = orderMap.has(a.key) ? orderMap.get(a.key)! : 999;
            const indexB = orderMap.has(b.key) ? orderMap.get(b.key)! : 999;
            return indexA - indexB;
          });
        }

        let savedBookingPopup = bConf.popup || [];
        this.bookingsPopupList = defaultBookingCols.map(def => {
          const saved = savedBookingPopup.find((s: any) => s.key === def.key);
          return {
            ...def,
            visible: saved ? saved.visible !== false : def.visible,
            mandatory: saved ? saved.mandatory === true : def.mandatory
          };
        });
        if (savedBookingPopup.length > 0) {
          const orderMap = new Map<string, number>(savedBookingPopup.map((c: any, index: number) => [c.key, index]));
          this.bookingsPopupList.sort((a, b) => {
            const indexA = orderMap.has(a.key) ? orderMap.get(a.key)! : 999;
            const indexB = orderMap.has(b.key) ? orderMap.get(b.key)! : 999;
            return indexA - indexB;
          });
        }

        // Load Daily Entries preferences
        const dConf = this.columnConfig.daily_entries || {};
        this.dailySortColumn = dConf.sort_column || 'entry_date';
        this.dailySortDirection = dConf.sort_direction || 'desc';
        this.dailyMandatoryEditCheck = dConf.mandatory_edit_check || false;

        let roomKeys: string[] = [];
        if (this.roomConfig._order && Array.isArray(this.roomConfig._order)) {
          roomKeys = this.roomConfig._order.filter((key: string) => key in this.roomConfig);
          Object.keys(this.roomConfig).forEach(key => {
            if (key !== '_order' && !roomKeys.includes(key)) {
              roomKeys.push(key);
            }
          });
        } else {
          roomKeys = Object.keys(this.roomConfig).filter(k => k !== '_order');
        }

        const defaultDailyCols = [
          { key: 'entry_date', label: 'Log Date', visible: true, mandatory: true },
          { key: 'rooms_sold', label: 'Rooms Sold', visible: true, mandatory: true },
          { key: 'total_rooms_available', label: 'Total Capacity', visible: true, mandatory: true }
        ];
        const dynamicRoomTypes = roomKeys.map(rt => ({
          key: rt,
          label: rt,
          visible: true,
          mandatory: false
        }));
        const defaultDailyEndCols = [
          { key: 'total_guests', label: 'Active Guests', visible: true, mandatory: false },
          { key: 'total_revenue', label: 'Recorded Revenue', visible: true, mandatory: true },
          { key: 'notes', label: 'Remarks', visible: true, mandatory: false }
        ];
        const fullDailyCols = [...defaultDailyCols, ...dynamicRoomTypes, ...defaultDailyEndCols];
        let savedDailyTable = dConf.table || [];
        this.dailyTableList = fullDailyCols.map(def => {
          const saved = savedDailyTable.find((s: any) => s.key === def.key);
          return {
            ...def,
            visible: saved ? saved.visible !== false : def.visible,
            mandatory: saved ? saved.mandatory === true : def.mandatory
          };
        });
        if (savedDailyTable.length > 0) {
          const orderMap = new Map<string, number>(savedDailyTable.map((c: any, index: number) => [c.key, index]));
          this.dailyTableList.sort((a, b) => {
            const indexA = orderMap.has(a.key) ? orderMap.get(a.key)! : 999;
            const indexB = orderMap.has(b.key) ? orderMap.get(b.key)! : 999;
            return indexA - indexB;
          });
        }

        let savedDailyPopup = dConf.popup || [];
        this.dailyPopupList = fullDailyCols.map(def => {
          const saved = savedDailyPopup.find((s: any) => s.key === def.key);
          return {
            ...def,
            visible: saved ? saved.visible !== false : def.visible,
            mandatory: saved ? saved.mandatory === true : def.mandatory
          };
        });
        if (savedDailyPopup.length > 0) {
          const orderMap = new Map<string, number>(savedDailyPopup.map((c: any, index: number) => [c.key, index]));
          this.dailyPopupList.sort((a, b) => {
            const indexA = orderMap.has(a.key) ? orderMap.get(a.key)! : 999;
            const indexB = orderMap.has(b.key) ? orderMap.get(b.key)! : 999;
            return indexA - indexB;
          });
        }

        // Load Expenses preferences
        const eConf = this.columnConfig.expenses || {};
        this.expensesSortColumn = eConf.sort_column || 'month_year';
        this.expensesSortDirection = eConf.sort_direction || 'desc';
        this.expensesMandatoryEditCheck = eConf.mandatory_edit_check || false;

        const defaultExpenseCols = [
          { key: 'month_year', label: 'Month / Year', visible: true, mandatory: true },
          { key: 'utilities', label: 'Utilities', visible: true, mandatory: false },
          { key: 'salaries', label: 'Salaries', visible: true, mandatory: false },
          { key: 'maintenance', label: 'Maintenance', visible: true, mandatory: false },
          { key: 'consumables', label: 'Consumables', visible: true, mandatory: false },
          { key: 'marketing', label: 'Marketing', visible: true, mandatory: false },
          { key: 'other', label: 'Other', visible: true, mandatory: false },
          { key: 'receipts', label: 'Receipts', visible: true, mandatory: false },
          { key: 'payment_status', label: 'Status', visible: true, mandatory: true },
          { key: 'total_amount', label: 'Total Outflow', visible: true, mandatory: true }
        ];
        let savedExpenseTable = eConf.table || [];
        this.expensesTableList = defaultExpenseCols.map(def => {
          const saved = savedExpenseTable.find((s: any) => s.key === def.key);
          return {
            ...def,
            visible: saved ? saved.visible !== false : def.visible,
            mandatory: saved ? saved.mandatory === true : def.mandatory
          };
        });
        if (savedExpenseTable.length > 0) {
          const orderMap = new Map<string, number>(savedExpenseTable.map((c: any, index: number) => [c.key, index]));
          this.expensesTableList.sort((a, b) => {
            const indexA = orderMap.has(a.key) ? orderMap.get(a.key)! : 999;
            const indexB = orderMap.has(b.key) ? orderMap.get(b.key)! : 999;
            return indexA - indexB;
          });
        }

        let savedExpensePopup = eConf.popup || [];
        this.expensesPopupList = defaultExpenseCols.map(def => {
          const saved = savedExpensePopup.find((s: any) => s.key === def.key);
          return {
            ...def,
            visible: saved ? saved.visible !== false : def.visible,
            mandatory: saved ? saved.mandatory === true : def.mandatory
          };
        });
        if (savedExpensePopup.length > 0) {
          const orderMap = new Map<string, number>(savedExpensePopup.map((c: any, index: number) => [c.key, index]));
          this.expensesPopupList.sort((a, b) => {
            const indexA = orderMap.has(a.key) ? orderMap.get(a.key)! : 999;
            const indexB = orderMap.has(b.key) ? orderMap.get(b.key)! : 999;
            return indexA - indexB;
          });
        }

        this.roomTypes = roomKeys.map(k => {
          const val = this.roomConfig[k];
          return {
            key: k,
            limit: Array.isArray(val) ? val.length : Number(val || 0),
            roomsListStr: Array.isArray(val) ? val.join(', ') : ''
          };
        });
      }
    });
  }

  onRoomsListChange(room: any): void {
    const str = room.roomsListStr || '';
    if (str.trim().length > 0) {
      const items = str.split(',').map((s: string) => s.trim()).filter(Boolean);
      room.limit = items.length;
    }
  }

  onNewCategoryRoomsListChange(): void {
    const str = this.newCategoryRoomsListStr || '';
    if (str.trim().length > 0) {
      const items = str.split(',').map((s: string) => s.trim()).filter(Boolean);
      this.newCategoryLimit = items.length;
    }
  }

  addCategory() {
    const name = this.newCategoryName.trim();
    if (!name) {
      this.message.warning('Please enter a room category name');
      return;
    }
    if (this.roomTypes.some(r => r.key.toLowerCase() === name.toLowerCase())) {
      this.message.warning('Category already exists');
      return;
    }
    if (this.newCategoryLimit <= 0) {
      this.message.warning('Capacity must be greater than 0');
      return;
    }
    this.roomTypes.push({ 
      key: name, 
      limit: this.newCategoryLimit, 
      roomsListStr: this.newCategoryRoomsListStr.trim() 
    });
    this.newCategoryName = '';
    this.newCategoryRoomsListStr = '';
    this.newCategoryLimit = 1;
    this.message.success(`Added ${name} temporarily. Click "Save Configuration" to commit changes.`);
  }

  deleteCategory(key: string) {
    this.roomTypes = this.roomTypes.filter(r => r.key !== key);
    this.message.info(`Removed ${key}. Click "Save Configuration" to commit changes.`);
  }

  async saveConfiguration() {
    if (!this.hotelId) {
      this.message.error('No hotel context found');
      return;
    }

    this.isSaving = true;
    try {
      // Rebuild config object
      const configObj: any = {};
      const order: string[] = [];

      this.roomTypes.forEach(r => {
        const str = r.roomsListStr || '';
        if (str.trim().length > 0) {
          const items = str.split(',').map((s: string) => s.trim()).filter(Boolean);
          configObj[r.key] = items;
        } else {
          configObj[r.key] = r.limit;
        }
        order.push(r.key);
      });

      configObj._order = order;

      const { error } = await this.supabaseService.updateHotelRoomConfig(this.hotelId, configObj);
      if (error) throw error;

      this.message.success('Room configuration updated successfully!');
    } catch (e: any) {
      this.message.error(e.message || 'Failed to update configuration');
    } finally {
      this.isSaving = false;
    }
  }

  async savePreferences() {
    if (!this.hotelId) {
      this.message.error('No hotel context found');
      return;
    }

    this.isSaving = true;
    try {
      const currentConfig = this.columnConfig || {};

      const newConfig = {
        ...currentConfig,
        bookings: {
          ...(currentConfig.bookings || {}),
          table: this.bookingsTableList.map(c => ({ key: c.key, visible: c.visible, mandatory: c.mandatory })),
          popup: this.bookingsPopupList.map(c => ({ key: c.key, visible: c.visible, mandatory: c.mandatory })),
          sort_column: this.bookingsSortColumn,
          sort_direction: this.bookingsSortDirection,
          mandatory_edit_check: this.bookingsPopupList.some(c => c.mandatory)
        },
        daily_entries: {
          ...(currentConfig.daily_entries || {}),
          table: this.dailyTableList.map(c => ({ key: c.key, visible: c.visible, mandatory: c.mandatory })),
          popup: this.dailyPopupList.map(c => ({ key: c.key, visible: c.visible, mandatory: c.mandatory })),
          sort_column: this.dailySortColumn,
          sort_direction: this.dailySortDirection,
          mandatory_edit_check: this.dailyPopupList.some(c => c.mandatory)
        },
        expenses: {
          ...(currentConfig.expenses || {}),
          table: this.expensesTableList.map(c => ({ key: c.key, visible: c.visible, mandatory: c.mandatory })),
          popup: this.expensesPopupList.map(c => ({ key: c.key, visible: c.visible, mandatory: c.mandatory })),
          sort_column: this.expensesSortColumn,
          sort_direction: this.expensesSortDirection,
          mandatory_edit_check: this.expensesPopupList.some(c => c.mandatory)
        }
      };

      const { error } = await this.supabaseService.updateHotelColumnConfig(this.hotelId, newConfig);
      if (error) throw error;

      this.columnConfig = newConfig;
      this.message.success('Preferences updated successfully!');
    } catch (e: any) {
      this.message.error(e.message || 'Failed to update preferences');
    } finally {
      this.isSaving = false;
    }
  }
}
