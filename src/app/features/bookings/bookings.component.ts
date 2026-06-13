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
import { NzMessageService } from 'ng-zorro-antd/message';
import { ColumnConfig, DEFAULT_BOOKING_COLUMNS } from '../../core/models/column-config.model';
import { NzUploadModule, NzUploadFile } from 'ng-zorro-antd/upload';

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
    NzUploadModule
  ],
  template: `
    <div class="space-y-8 pb-10">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--theme-border)] pb-6">
        <div>
          <h2 class="text-4xl font-normal text-[var(--theme-text-main)]">Room Bookings</h2>
          <p class="text-sm text-[var(--theme-text-muted)] mt-2">Check-in details, room statuses & guest records</p>
        </div>
        <button class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none rounded-xl h-10 px-6 text-xs font-semibold uppercase tracking-wider shadow-[0_0_15px_var(--theme-glow)] hover:shadow-[0_0_25px_var(--theme-glow-hover)] transition-all flex items-center gap-2 cursor-pointer" 
                (click)="openBookingAddModal()">
          <span nz-icon nzType="plus"></span> New Booking
        </button>
      </div>

      <!-- Database Connection Status Banner -->
      <div *ngIf="!isDatabaseLinked" class="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div class="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <span nz-icon nzType="warning" nzTheme="outline"></span> Database Table Link Pending
          </div>
          <p class="text-xs text-[var(--theme-text-muted)] mt-1 max-w-2xl">
            Bookings are currently saved in your local browser storage. To synchronize bookings across all devices, create the <code class="text-amber-300 bg-amber-500/5 px-1.5 py-0.5 rounded font-mono">room_bookings</code> table in your Supabase SQL Editor.
          </p>
        </div>
        <button nz-button nzSize="small" class="bg-amber-500 hover:bg-amber-400 text-black border-none rounded-lg text-[10px] font-bold uppercase tracking-wider py-1.5 px-4" (click)="showSqlModal()">
          Setup SQL Table
        </button>
      </div>



      <!-- Dynamic Bookings Statistics Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
          <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">Active Check-ins</span>
          <h3 class="text-3xl text-[var(--theme-text-main)] font-medium mt-4">{{ activeCheckedInCount }}</h3>
          <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-blue-500/5 blur-xl rounded-full"></div>
        </div>
        <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
          <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">Total Guests Registered</span>
          <h3 class="text-3xl text-[var(--theme-text-main)] font-medium mt-4">{{ totalGuestsRegistered }}</h3>
          <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-[var(--theme-primary)]/5 blur-xl rounded-full"></div>
        </div>
        <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
          <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">Cumulative Revenue</span>
          <h3 class="text-3xl text-[var(--theme-primary)] font-medium mt-4">₹{{ totalBookingRevenue | number }}</h3>
          <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-[var(--theme-primary)]/10 blur-xl rounded-full"></div>
        </div>
        <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
          <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">Avg. Stay Duration</span>
          <h3 class="text-3xl text-[var(--theme-text-main)] font-medium mt-4">{{ averageDurationOfStay }} <span class="text-xs text-[var(--theme-text-muted)]">days</span></h3>
          <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-emerald-500/5 blur-xl rounded-full"></div>
        </div>
      </div>

      <div class="glass-card p-6">
        <div class="flex flex-col gap-3 mb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-[var(--theme-text-main)] uppercase tracking-wider">{{ hotelName }}</span>
            </div>
            <button *ngIf="hasActiveFilters()" nz-button nzType="text" class="text-[var(--theme-text-muted)] hover:text-white text-xs flex items-center gap-1" (click)="resetBookingFilters()">
              <span nz-icon nzType="close"></span> Clear All Filters
            </button>
          </div>
          
          <!-- Advanced Filtering Toolbar -->
          <div class="flex flex-col gap-4 border-b border-[var(--theme-border)] pb-4 mb-4 mt-2">
            <!-- Top row: Quick Filters and Preset Ranges (A tags) -->
            <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              
              <!-- Quick Filter Segmented Buttons -->
              <div class="flex bg-[var(--theme-bg)] p-1 rounded-xl border border-[var(--theme-border)] shadow-inner overflow-x-auto max-w-full hide-scrollbar">
                <button type="button" [ngClass]="activeQuickFilter === 'all' ? 'bg-[var(--theme-primary)] shadow-[0_0_10px_var(--theme-glow)] font-bold text-black' : 'text-[var(--theme-text-muted)] hover:text-white font-medium bg-transparent'" class="rounded-lg text-[10px] uppercase tracking-wider px-4 h-8 transition-all border-none outline-none cursor-pointer flex items-center justify-center whitespace-nowrap" (click)="setQuickFilter('all')">All</button>
                <button type="button" [ngClass]="activeQuickFilter === 'check-in' ? 'bg-[var(--theme-primary)] shadow-[0_0_10px_var(--theme-glow)] font-bold text-black' : 'text-[var(--theme-text-muted)] hover:text-white font-medium bg-transparent'" class="rounded-lg text-[10px] uppercase tracking-wider px-4 h-8 transition-all border-none outline-none cursor-pointer flex items-center justify-center whitespace-nowrap" (click)="setQuickFilter('check-in')">Check In</button>
                <button type="button" [ngClass]="activeQuickFilter === 'check-out' ? 'bg-[var(--theme-primary)] shadow-[0_0_10px_var(--theme-glow)] font-bold text-black' : 'text-[var(--theme-text-muted)] hover:text-white font-medium bg-transparent'" class="rounded-lg text-[10px] uppercase tracking-wider px-4 h-8 transition-all border-none outline-none cursor-pointer flex items-center justify-center whitespace-nowrap" (click)="setQuickFilter('check-out')">Check Out</button>
                <button type="button" [ngClass]="activeQuickFilter === 'confirmed' ? 'bg-[var(--theme-primary)] shadow-[0_0_10px_var(--theme-glow)] font-bold text-black' : 'text-[var(--theme-text-muted)] hover:text-white font-medium bg-transparent'" class="rounded-lg text-[10px] uppercase tracking-wider px-4 h-8 transition-all border-none outline-none cursor-pointer flex items-center justify-center whitespace-nowrap" (click)="setQuickFilter('confirmed')">Confirmed</button>
              </div>

              <!-- Preset Ranges as Pill Buttons -->
              <div class="flex flex-wrap items-center gap-2 text-xs font-medium">
                <span class="text-[var(--theme-text-muted)] text-[10px] uppercase tracking-wider font-bold mr-2">Timeframe:</span>
                <button type="button" class="rounded-full text-[10px] uppercase tracking-wider px-3 h-7 transition-all border outline-none cursor-pointer" [ngClass]="activePresetRange === 'Today' ? 'timeframe-pill-active' : 'timeframe-pill'" (click)="applyPresetRange('Today')">Today</button>
                <button type="button" class="rounded-full text-[10px] uppercase tracking-wider px-3 h-7 transition-all border outline-none cursor-pointer" [ngClass]="activePresetRange === 'Yesterday' ? 'timeframe-pill-active' : 'timeframe-pill'" (click)="applyPresetRange('Yesterday')">Yesterday</button>
                <button type="button" class="rounded-full text-[10px] uppercase tracking-wider px-3 h-7 transition-all border outline-none cursor-pointer" [ngClass]="activePresetRange === 'Past 7 Days' ? 'timeframe-pill-active' : 'timeframe-pill'" (click)="applyPresetRange('Past 7 Days')">Past 7 Days</button>
                <button type="button" class="rounded-full text-[10px] uppercase tracking-wider px-3 h-7 transition-all border outline-none cursor-pointer" [ngClass]="activePresetRange === 'Past 30 Days' ? 'timeframe-pill-active' : 'timeframe-pill'" (click)="applyPresetRange('Past 30 Days')">Past 30 Days</button>
                <button type="button" class="rounded-full text-[10px] uppercase tracking-wider px-3 h-7 transition-all border outline-none cursor-pointer" [ngClass]="activePresetRange === 'Current Month' ? 'timeframe-pill-active' : 'timeframe-pill'" (click)="applyPresetRange('Current Month')">Current Month</button>
                <button type="button" class="rounded-full text-[10px] uppercase tracking-wider px-3 h-7 transition-all border outline-none cursor-pointer" [ngClass]="activePresetRange === 'Previous Month' ? 'timeframe-pill-active' : 'timeframe-pill'" (click)="applyPresetRange('Previous Month')">Previous Month</button>
                <button type="button" class="rounded-full text-[10px] uppercase tracking-wider px-3 h-7 transition-all border outline-none cursor-pointer" [ngClass]="activePresetRange === 'Last 6 Months' ? 'timeframe-pill-active' : 'timeframe-pill'" (click)="applyPresetRange('Last 6 Months')">Last 6 Months</button>
                <button type="button" class="rounded-full text-[10px] uppercase tracking-wider px-3 h-7 transition-all border outline-none cursor-pointer" [ngClass]="activePresetRange === 'custom' ? 'timeframe-pill-active' : 'timeframe-pill'" (click)="activePresetRange = 'custom'">Custom...</button>
              </div>
            </div>

            <!-- Custom Date Range Picker (Only visible if 'custom' is selected or active) -->
            <div class="flex items-center gap-4" *ngIf="activePresetRange === 'custom' || globalDateRange.length > 0 && activePresetRange === null">
              <nz-range-picker [(ngModel)]="globalDateRange" (ngModelChange)="onGlobalFilterChange()" [nzAllowClear]="true" nzFormat="yyyy-MM-dd" class="w-full sm:w-64 h-10 rounded-xl bg-transparent border-[var(--theme-border)] text-[var(--theme-text-main)]"></nz-range-picker>
            </div>
          </div>
          <!-- Hidden Columns restore area -->
          <div *ngIf="getHiddenColumns().length > 0" class="flex flex-wrap items-center gap-2 bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-2.5">
            <span class="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mr-1">Hidden Columns:</span>
            <button *ngFor="let col of getHiddenColumns()" 
                    (click)="toggleColumnVisibility(col.key, true)" 
                    class="bg-zinc-800 hover:bg-zinc-700 text-gray-300 hover:text-white text-[10px] px-2.5 py-1 rounded-lg border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer">
              <span nz-icon nzType="plus" class="text-[8px]"></span>
              <span>{{ col.label }}</span>
            </button>
          </div>
        </div>

        <nz-table #bookingTable 
                  [nzData]="filteredBookings" 
                  [nzFrontPagination]="true" 
                  [nzPageSize]="10" 
                  nzSize="middle" 
                  [nzBordered]="false"
                  [nzScroll]="{ x: '1600px' }">
          <thead>
            <tr class="text-left border-b border-[var(--theme-border)]">
              <ng-container *ngFor="let col of columns; let i = index">
                <th *ngIf="col.visible" 
                    class="pb-3 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider bg-transparent border-none group relative" 
                    [nzWidth]="col.width || null" 
                    [class.text-center]="col.align === 'center'" 
                    [class.text-right]="col.align === 'right'">
                  
                  <div class="flex items-center gap-1.5" [class.justify-center]="col.align === 'center'" [class.justify-end]="col.align === 'right'">
                    <!-- Reordering & Hide Controls on Hover -->
                    <div class="hidden group-hover:flex items-center gap-0.5 mr-1 text-[10px] text-[var(--theme-text-muted)] bg-black/80 backdrop-blur rounded-lg px-1.5 py-1 border border-zinc-700 absolute -top-8 left-1/2 -translate-x-1/2 z-10 shadow-lg">
                      <button nz-button nzType="text" class="text-gray-400 hover:text-white p-0 h-4 w-4 leading-none flex items-center justify-center min-w-0" 
                              [disabled]="i === 0" (click)="moveColumn(i, 'left'); $event.stopPropagation()">
                        <span nz-icon nzType="left" class="text-[9px]"></span>
                      </button>
                      <button nz-button nzType="text" class="text-gray-400 hover:text-white p-0 h-4 w-4 leading-none flex items-center justify-center min-w-0 ml-0.5" 
                              [disabled]="i === columns.length - 1" (click)="moveColumn(i, 'right'); $event.stopPropagation()">
                        <span nz-icon nzType="right" class="text-[9px]"></span>
                      </button>
                      <button nz-button nzType="text" class="text-rose-400 hover:text-rose-300 p-0 h-4 w-4 leading-none flex items-center justify-center min-w-0 ml-1 border-l border-zinc-700 pl-1" 
                              (click)="toggleColumnVisibility(col.key, false); $event.stopPropagation()">
                        <span nz-icon nzType="close" class="text-[9px]"></span>
                      </button>
                    </div>

                    <span>{{ col.label }}</span>

                    <!-- Conditional Column Header popover filters -->
                    <ng-container [ngSwitch]="col.key">
                      <span *ngSwitchCase="'check_in'" nz-icon nzType="filter" nzTheme="outline" 
                            class="cursor-pointer text-[var(--theme-primary)] hover:text-white transition-colors"
                            [class.text-white]="colFilterDate"
                            nz-popover [nzPopoverContent]="checkInFilterTpl" nzPopoverTrigger="click" nzPopoverPlacement="bottomLeft"></span>
                      <span *ngSwitchCase="'room_number'" nz-icon nzType="filter" nzTheme="outline" 
                            class="cursor-pointer text-[var(--theme-primary)] hover:text-white transition-colors"
                            [class.text-white]="colFilterRoomNo"
                            nz-popover [nzPopoverContent]="roomNoFilterTpl" nzPopoverTrigger="click" nzPopoverPlacement="bottomLeft"></span>
                      <span *ngSwitchCase="'room_category'" nz-icon nzType="filter" nzTheme="outline" 
                            class="cursor-pointer text-[var(--theme-primary)] hover:text-white transition-colors"
                            [class.text-white]="colFilterCategory"
                            nz-popover [nzPopoverContent]="categoryFilterTpl" nzPopoverTrigger="click" nzPopoverPlacement="bottomLeft"></span>
                      <span *ngSwitchCase="'guest_name'" nz-icon nzType="filter" nzTheme="outline" 
                            class="cursor-pointer text-[var(--theme-primary)] hover:text-white transition-colors"
                            [class.text-white]="colFilterName"
                            nz-popover [nzPopoverContent]="nameFilterTpl" nzPopoverTrigger="click" nzPopoverPlacement="bottomLeft"></span>
                      <span *ngSwitchCase="'status'" nz-icon nzType="filter" nzTheme="outline" 
                            class="cursor-pointer text-[var(--theme-primary)] hover:text-white transition-colors"
                            [class.text-white]="colFilterStatus"
                            nz-popover [nzPopoverContent]="statusFilterTpl" nzPopoverTrigger="click" nzPopoverPlacement="bottomLeft"></span>
                    </ng-container>
                  </div>
                </th>
              </ng-container>
              <th class="pb-3 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider bg-transparent border-none text-right" nzWidth="100px">ACTIONS</th>
            </tr>
          </thead>
          <tbody class="text-sm">
            <tr *ngFor="let data of bookingTable.data" class="border-b border-[var(--theme-border)] transition-colors">
              <ng-container *ngFor="let col of columns">
                <td *ngIf="col.visible" 
                    class="py-4 text-xs bg-transparent border-none" 
                    [class.text-center]="col.align === 'center'" 
                    [class.text-right]="col.align === 'right'"
                    [class.font-semibold]="col.key === 'guest_name' || col.key === 'amount_paid'"
                    [class.text-[var(--theme-text-main)]]="col.key === 'check_in' || col.key === 'room_number' || col.key === 'guest_name' || col.key === 'number_of_people' || col.key === 'number_of_days' || col.key === 'check_out'"
                    [class.text-[var(--theme-text-muted)]]="col.key === 'room_category' || col.key === 'address' || col.key === 'id_number' || col.key === 'phone_number'"
                    [class.uppercase]="col.key === 'room_category'"
                    [class.tracking-wider]="col.key === 'room_category'"
                    [class.max-w-[180px]]="col.key === 'address'"
                    [class.truncate]="col.key === 'address'"
                    [title]="col.key === 'address' ? data.address : ''">
                  
                  <ng-container [ngSwitch]="col.key">
                    <span *ngSwitchCase="'check_in'">{{ data.check_in | date:'dd MMM yyyy HH:mm' }}</span>
                    <span *ngSwitchCase="'room_number'">{{ data.room_number }}</span>
                    <span *ngSwitchCase="'room_category'">{{ data.room_category || '-' }}</span>
                    <span *ngSwitchCase="'guest_name'">{{ data.guest_name }}</span>
                    <span *ngSwitchCase="'address'">{{ data.address || '-' }}</span>
                    <span *ngSwitchCase="'id_number'">{{ data.id_number || '-' }}</span>
                    <span *ngSwitchCase="'phone_number'">{{ data.phone_number || '-' }}</span>
                    <span *ngSwitchCase="'number_of_people'">{{ data.number_of_people || 1 }}</span>
                    <span *ngSwitchCase="'number_of_days'">{{ data.number_of_days || 1 }}</span>
                    <span *ngSwitchCase="'amount_paid'" class="text-emerald-400">₹{{ (data.amount_paid || 0) | number }}</span>
                    <span *ngSwitchCase="'check_out'">{{ (data.status === 'Checked Out' || data.status === 'checked out') && data.actual_checkout ? (data.actual_checkout | date:'dd MMM yyyy HH:mm') : (data.check_out | date:'dd MMM yyyy HH:mm') }}</span>
                    <span *ngSwitchCase="'actual_checkout'">{{ data.actual_checkout ? (data.actual_checkout | date:'dd MMM yyyy HH:mm') : '-' }}</span>
                    
                    <ng-container *ngSwitchCase="'id_documents'">
                      <button *ngIf="data.id_documents?.length" nz-button nzType="text" class="text-[var(--theme-primary)] hover:!text-amber-300 hover:!bg-transparent focus:!text-amber-300 focus:!bg-transparent active:!bg-transparent text-xs font-semibold px-2 flex items-center justify-center m-auto transition-colors" (click)="viewAttachments(data.id_documents)">
                        View ({{data.id_documents.length}})
                      </button>
                      <span *ngIf="!data.id_documents?.length" class="text-[var(--theme-text-muted)]">-</span>
                    </ng-container>

                    <ng-container *ngSwitchCase="'status'">
                      <nz-select [ngModel]="data.status" 
                                 (ngModelChange)="updateBookingStatusDirectly(data, $event)" 
                                 class="w-[130px] custom-dark-select"
                                 [class.status-confirmed]="data.status === 'Confirmed'"
                                 [class.status-checked-in]="data.status === 'Checked In'"
                                 [class.status-checked-out]="data.status === 'Checked Out'">
                        <nz-option nzValue="Checked In" nzLabel="Check In"></nz-option>
                        <nz-option nzValue="Checked Out" nzLabel="Check Out"></nz-option>
                      </nz-select>
                    </ng-container>
                  </ng-container>

                </td>
              </ng-container>
              <td class="py-4 bg-transparent border-none text-right">
                <div class="flex items-center justify-end gap-3">
                  <button *ngIf="data.status === 'Checked In'" 
                          nz-button nzType="text" 
                          class="text-rose-500 hover:text-rose-400 transition-colors p-0" 
                          nz-tooltip nzTooltipTitle="Extend Stay" 
                          (click)="extendStay(data)">
                    <span nz-icon nzType="calendar" class="text-base"></span>
                  </button>
                  <button nz-button nzType="text" class="text-amber-500 hover:text-amber-400 transition-colors p-0" (click)="openBookingEditModal(data)">
                    <span nz-icon nzType="edit" class="text-base"></span>
                  </button>
                  <button nz-button nzType="text" class="text-rose-500 hover:text-rose-400 transition-colors p-0" nz-popconfirm nzPopconfirmTitle="Are you sure to delete this booking?" (nzOnConfirm)="deleteBooking(data.id)">
                    <span nz-icon nzType="delete" class="text-base"></span>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="filteredBookings.length === 0">
              <td [attr.colspan]="getVisibleColumnsCount() + 1" class="text-center py-8 text-[var(--theme-text-muted)] bg-transparent border-none">
                No bookings matches the active filters.
              </td>
            </tr>
          </tbody>
        </nz-table>
      </div>

      <!-- Popover Content Templates -->
      <ng-template #checkInFilterTpl>
        <div class="p-4 w-72">
          <div class="flex items-center justify-between border-b border-[var(--theme-border)] pb-2 mb-3">
            <span class="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider">Filter Check-in Date</span>
          </div>
          <div class="mb-4">
            <nz-date-picker [(ngModel)]="colFilterDate" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)] border-[var(--theme-border)]" nzFormat="yyyy-MM-dd"></nz-date-picker>
          </div>
          <div class="flex justify-end gap-2">
            <button nz-button nzType="text" nzSize="small" class="text-[var(--theme-text-muted)] text-xs hover:text-[var(--theme-text-main)]" (click)="colFilterDate = null">Reset</button>
            <button nz-button nzSize="small" class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none font-bold text-xs rounded-lg px-4 h-8 transition-all">APPLY FILTER</button>
          </div>
        </div>
      </ng-template>

      <ng-template #roomNoFilterTpl>
        <div class="p-4 w-72">
          <div class="flex items-center justify-between border-b border-[var(--theme-border)] pb-2 mb-3">
            <span class="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider">Filter Room No</span>
          </div>
          <div class="mb-4">
            <input nz-input [(ngModel)]="colFilterRoomNo" placeholder="Enter room number..." class="w-full h-10 rounded-xl bg-transparent border-[var(--theme-border)] text-[var(--theme-text-main)]" />
          </div>
          <div class="flex justify-end gap-2">
            <button nz-button nzType="text" nzSize="small" class="text-[var(--theme-text-muted)] text-xs hover:text-[var(--theme-text-main)]" (click)="colFilterRoomNo = ''">Reset</button>
            <button nz-button nzSize="small" class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none font-bold text-xs rounded-lg px-4 h-8 transition-all">APPLY FILTER</button>
          </div>
        </div>
      </ng-template>

      <ng-template #categoryFilterTpl>
        <div class="p-4 w-72">
          <div class="flex items-center justify-between border-b border-[var(--theme-border)] pb-2 mb-3">
            <span class="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider">Filter Category</span>
          </div>
          <div class="mb-4">
            <nz-select [(ngModel)]="colFilterCategory" class="w-full h-10 custom-dark-select" nzPlaceHolder="Select Category">
              <nz-option nzValue="" nzLabel="All Categories"></nz-option>
              <nz-option *ngFor="let type of roomTypes" [nzValue]="type" [nzLabel]="type"></nz-option>
            </nz-select>
          </div>
          <div class="flex justify-end gap-2">
            <button nz-button nzType="text" nzSize="small" class="text-[var(--theme-text-muted)] text-xs hover:text-[var(--theme-text-main)]" (click)="colFilterCategory = ''">Reset</button>
            <button nz-button nzSize="small" class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none font-bold text-xs rounded-lg px-4 h-8 transition-all">APPLY FILTER</button>
          </div>
        </div>
      </ng-template>

      <ng-template #nameFilterTpl>
        <div class="p-4 w-72">
          <div class="flex items-center justify-between border-b border-[var(--theme-border)] pb-2 mb-3">
            <span class="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider">Filter Guest Name</span>
          </div>
          <div class="mb-4">
            <input nz-input [(ngModel)]="colFilterName" placeholder="Enter guest name..." class="w-full h-10 rounded-xl bg-transparent border-[var(--theme-border)] text-[var(--theme-text-main)]" />
          </div>
          <div class="flex justify-end gap-2">
            <button nz-button nzType="text" nzSize="small" class="text-[var(--theme-text-muted)] text-xs hover:text-[var(--theme-text-main)]" (click)="colFilterName = ''">Reset</button>
            <button nz-button nzSize="small" class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none font-bold text-xs rounded-lg px-4 h-8 transition-all">APPLY FILTER</button>
          </div>
        </div>
      </ng-template>

      <ng-template #statusFilterTpl>
        <div class="p-4 w-72">
          <div class="flex items-center justify-between border-b border-[var(--theme-border)] pb-2 mb-3">
            <span class="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider">Filter Status</span>
          </div>
          <div class="mb-4">
            <nz-select [(ngModel)]="colFilterStatus" class="w-full h-10 custom-dark-select" nzPlaceHolder="Select Status">
              <nz-option nzValue="" nzLabel="All Statuses"></nz-option>
              <nz-option nzValue="Confirmed" nzLabel="Confirmed"></nz-option>
              <nz-option nzValue="Checked In" nzLabel="Check In"></nz-option>
              <nz-option nzValue="Checked Out" nzLabel="Check Out"></nz-option>
            </nz-select>
          </div>
          <div class="flex justify-end gap-2">
            <button nz-button nzType="text" nzSize="small" class="text-[var(--theme-text-muted)] text-xs hover:text-[var(--theme-text-main)]" (click)="colFilterStatus = ''">Reset</button>
            <button nz-button nzSize="small" class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none font-bold text-xs rounded-lg px-4 h-8 transition-all">APPLY FILTER</button>
          </div>
        </div>
      </ng-template>
    </div>

    <!-- Add/Edit Booking Modal -->
    <nz-modal [(nzVisible)]="isBookingModalVisible" 
              [nzTitle]="bookingModalTitle" 
              (nzOnCancel)="handleBookingCancel()" 
              [nzFooter]="bookingModalFooter"
              [nzWidth]="750">
      
      <ng-template #bookingModalTitle>
        <div class="flex items-center gap-3">
          <span nz-icon [nzType]="editingBookingId ? 'edit' : 'plus-circle'" class="text-lg" [style.color]="'var(--theme-primary)'"></span>
          <span class="text-[var(--theme-text-main)] font-semibold uppercase tracking-wider text-xs" style="font-family: 'Hanken Grotesk', sans-serif;">
            {{ editingBookingId ? 'Edit Booking Entry' : 'New Room Booking' }}
          </span>
        </div>
      </ng-template>

      <ng-template #bookingModalFooter>
        <div class="flex justify-end gap-3 px-4 py-3">
          <button nz-button nzType="default" class="bg-[var(--theme-border)]/5 border border-[var(--theme-border)] hover:bg-[var(--theme-border)]/20 text-[var(--theme-text-main)] rounded-xl h-10 px-5 text-xs font-semibold uppercase tracking-wider transition-all" (click)="handleBookingCancel()">
            Cancel
          </button>
          <button nz-button class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none rounded-xl h-10 px-5 text-xs font-semibold uppercase tracking-wider shadow-[0_0_15px_var(--theme-glow)] hover:shadow-[0_0_25px_var(--theme-glow-hover)] transition-all" (click)="handleBookingOk()">
            {{ editingBookingId ? 'Save Entry' : 'Book Room' }}
          </button>
        </div>
      </ng-template>

      <ng-container *nzModalContent>
        <form nz-form nzLayout="vertical" [formGroup]="bookingForm" class="p-2">
          <div nz-row [nzGutter]="[16, 12]" class="mt-2">
            <ng-container *ngFor="let field of popupFields">
              <div *ngIf="field.visible" nz-col nzXs="24" nzSm="12" [nzMd]="field.key === 'status' || field.key === 'notes' ? 24 : 8">
                <ng-container [ngSwitch]="field.key">
                  <!-- Check In -->
                  <nz-form-item *ngSwitchCase="'check_in'" class="mb-0">
                    <nz-form-label nzRequired class="text-[var(--theme-text-main)]/80 font-medium">Check-In Date/Time</nz-form-label>
                    <nz-form-control nzErrorTip="Please select check-in date/time">
                      <nz-date-picker formControlName="check_in" [nzShowTime]="{ nzUse12Hours: true, nzFormat: 'hh:mm a' }" nzFormat="yyyy-MM-dd hh:mm a" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]"></nz-date-picker>
                    </nz-form-control>
                  </nz-form-item>

                  <!-- Room Number -->
                  <nz-form-item *ngSwitchCase="'room_number'" class="mb-0">
                    <nz-form-label nzRequired class="text-[var(--theme-text-main)]/80 font-medium">Room Number</nz-form-label>
                    <nz-form-control nzErrorTip="Please enter room number">
                      <input nz-input formControlName="room_number" placeholder="e.g. 104" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]" />
                    </nz-form-control>
                  </nz-form-item>

                  <!-- Room Category -->
                  <nz-form-item *ngSwitchCase="'room_category'" class="mb-0">
                    <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium">Room Category</nz-form-label>
                    <nz-form-control>
                      <nz-select formControlName="room_category" class="w-full h-10 custom-dark-select">
                        <nz-option nzValue="" nzLabel="-- Select Category --"></nz-option>
                        <nz-option *ngFor="let type of roomTypes" [nzValue]="type" [nzLabel]="type"></nz-option>
                      </nz-select>
                    </nz-form-control>
                  </nz-form-item>

                  <!-- Guest Name -->
                  <nz-form-item *ngSwitchCase="'guest_name'" class="mb-0">
                    <nz-form-label nzRequired class="text-[var(--theme-text-main)]/80 font-medium">Guest Name</nz-form-label>
                    <nz-form-control nzErrorTip="Please enter guest name">
                      <input nz-input formControlName="guest_name" placeholder="Guest Name" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]" />
                    </nz-form-control>
                  </nz-form-item>

                  <!-- Address -->
                  <nz-form-item *ngSwitchCase="'address'" class="mb-0">
                    <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium">Address</nz-form-label>
                    <nz-form-control>
                      <input nz-input formControlName="address" placeholder="Guest Address (Optional)" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]" />
                    </nz-form-control>
                  </nz-form-item>

                  <!-- ID Number -->
                  <nz-form-item *ngSwitchCase="'id_number'" class="mb-0">
                    <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium">ID Number</nz-form-label>
                    <nz-form-control>
                      <input nz-input formControlName="id_number" placeholder="ID Number (Optional)" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]" />
                    </nz-form-control>
                  </nz-form-item>

                  <!-- Phone Number -->
                  <nz-form-item *ngSwitchCase="'phone_number'" class="mb-0">
                    <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium">Phone Number</nz-form-label>
                    <nz-form-control>
                      <input nz-input formControlName="phone_number" placeholder="Phone Number (Optional)" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]" />
                    </nz-form-control>
                  </nz-form-item>

                  <!-- Number of People -->
                  <nz-form-item *ngSwitchCase="'number_of_people'" class="mb-0">
                    <nz-form-label nzRequired class="text-[var(--theme-text-main)]/80 font-medium">Number of People</nz-form-label>
                    <nz-form-control nzErrorTip="Please enter number of guests">
                      <nz-input-number formControlName="number_of_people" [nzMin]="1" [nzStep]="1" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]" placeholder="1"></nz-input-number>
                    </nz-form-control>
                  </nz-form-item>

                  <!-- Number of Days -->
                  <nz-form-item *ngSwitchCase="'number_of_days'" class="mb-0">
                    <nz-form-label nzRequired class="text-[var(--theme-text-main)]/80 font-medium">Number of Days</nz-form-label>
                    <nz-form-control nzErrorTip="Please enter number of days">
                      <nz-input-number formControlName="number_of_days" [nzMin]="1" [nzStep]="1" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]" placeholder="1"></nz-input-number>
                    </nz-form-control>
                  </nz-form-item>

                  <!-- Amount Paid -->
                  <nz-form-item *ngSwitchCase="'amount_paid'" class="mb-0">
                    <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium">Amount Paid</nz-form-label>
                    <nz-form-control>
                      <nz-input-number formControlName="amount_paid" [nzMin]="0" [nzStep]="100" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]" placeholder="0.00"></nz-input-number>
                    </nz-form-control>
                  </nz-form-item>

                  <!-- Check Out -->
                  <nz-form-item *ngSwitchCase="'check_out'" class="mb-0">
                    <nz-form-label nzRequired class="text-[var(--theme-text-main)]/80 font-medium">Check-Out Date/Time</nz-form-label>
                    <nz-form-control nzErrorTip="Please select check-out date/time">
                      <nz-date-picker formControlName="check_out" [nzShowTime]="{ nzUse12Hours: true, nzFormat: 'hh:mm a' }" nzFormat="yyyy-MM-dd hh:mm a" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]"></nz-date-picker>
                    </nz-form-control>
                  </nz-form-item>


                  <!-- Status -->
                  <nz-form-item *ngSwitchCase="'status'" class="mb-0">
                    <nz-form-label nzRequired class="text-[var(--theme-text-main)]/80 font-medium">Booking Status</nz-form-label>
                    <nz-form-control>
                      <nz-radio-group formControlName="status" class="flex flex-wrap gap-4 mt-2 premium-status-radio">
                        <label nz-radio nzValue="Confirmed" class="status-radio-confirmed">Confirmed (Reserved)</label>
                        <label nz-radio nzValue="Checked In" class="status-radio-active">Checked In (Active)</label>
                        <label nz-radio nzValue="Checked Out" class="status-radio-completed">Checked Out</label>
                      </nz-radio-group>
                    </nz-form-control>
                  </nz-form-item>
                </ng-container>
              </div>
            </ng-container>
          </div>

          <!-- ID Documents Upload -->
          <div nz-row [nzGutter]="16" class="border-t border-[var(--theme-border)] my-3 pt-3">
            <div nz-col nzSpan="24">
              <nz-form-item class="mb-0">
                <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium">ID Documents (Optional)</nz-form-label>
                <nz-form-control>
                  <nz-upload
                    nzType="drag"
                    [nzMultiple]="true"
                    nzAccept="image/*,application/pdf"
                    [nzBeforeUpload]="beforeUpload"
                    [(nzFileList)]="fileList"
                    class="dark-theme-upload">
                    <p class="ant-upload-drag-icon">
                      <span nz-icon nzType="camera" class="text-[var(--theme-primary)] text-3xl"></span>
                    </p>
                    <p class="ant-upload-text text-[var(--theme-text-main)] font-medium mt-2">Tap to Take Photo or Upload</p>
                    <p class="ant-upload-hint text-[var(--theme-text-muted)] text-xs mt-1">Supports camera capture, images, and PDFs.</p>
                  </nz-upload>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
        </form>
      </ng-container>
    </nz-modal>

    <!-- SQL Copy Modal -->
    <nz-modal [(nzVisible)]="isSqlModalVisible" 
              nzTitle="Supabase SQL Setup" 
              (nzOnCancel)="closeSqlModal()" 
              [nzFooter]="sqlModalFooter"
              [nzWidth]="650">
      
      <ng-template #sqlModalFooter>
        <button nz-button nzType="default" class="bg-[var(--theme-border)]/5 border border-[var(--theme-border)] text-[var(--theme-text-main)] rounded-xl h-10 px-5 text-xs font-semibold uppercase tracking-wider" (click)="closeSqlModal()">
          Close
        </button>
      </ng-template>

      <ng-container *nzModalContent>
        <p class="text-xs text-[var(--theme-text-muted)] mb-4">
          Copy and execute the following SQL code inside your Supabase SQL Editor to create the table and enable Row Level Security (RLS).
        </p>
        <pre class="bg-zinc-950 p-4 rounded-xl text-xs overflow-x-auto text-amber-400 border border-[var(--theme-border)] select-all font-mono" style="max-height: 350px;">{{ sqlCode }}</pre>
      </ng-container>
    </nz-modal>

    <!-- Attachments Viewer Modal -->
    <nz-modal [(nzVisible)]="isAttachmentModalVisible" 
              nzTitle="View Attachments" 
              (nzOnCancel)="isAttachmentModalVisible = false" 
              [nzFooter]="null"
              [nzWidth]="800">
      <ng-container *nzModalContent>
        <div class="flex flex-col gap-4">
          <div *ngIf="isLoadingAttachments" class="flex justify-center p-8">
            <span nz-icon nzType="loading" nzTheme="outline" class="text-4xl text-[var(--theme-primary)]"></span>
          </div>
          <div *ngIf="!isLoadingAttachments && attachmentUrls.length === 0" class="text-center text-[var(--theme-text-muted)] p-8">
            No valid attachments found or links expired.
          </div>
          <div *ngIf="!isLoadingAttachments && attachmentUrls.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
            <div *ngFor="let url of attachmentUrls" class="border border-[var(--theme-border)] rounded-xl overflow-hidden bg-black/40 flex flex-col items-center justify-center p-4 relative group min-h-[200px]">
               
               <!-- File Preview (Image) -->
               <img *ngIf="!url.includes('.pdf')" [src]="url" class="max-w-full max-h-[300px] object-contain rounded-lg transition-transform duration-300 group-hover:scale-105" alt="Attachment" (error)="onImageError($event)" />
               
               <!-- File Preview (PDF) -->
               <div *ngIf="url.includes('.pdf')" class="flex flex-col items-center justify-center h-[200px] w-full bg-zinc-900/50 rounded-lg">
                 <span nz-icon nzType="file-pdf" class="text-6xl text-rose-500 mb-3"></span>
                 <span class="text-sm font-semibold text-[var(--theme-text-main)]">PDF Document</span>
               </div>

               <!-- Download / View Link Overlay -->
               <a [href]="url" target="_blank" class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col gap-2 items-center justify-center transition-opacity text-white hover:text-[var(--theme-primary)]">
                 <span nz-icon nzType="eye" class="text-3xl mb-1"></span>
                 <span class="text-xs font-bold uppercase tracking-widest bg-black/50 px-3 py-1 rounded-full border border-white/20">Click to Open</span>
               </a>
            </div>
          </div>
          

        </div>
      </ng-container>
    </nz-modal>
  `,
  styles: [`
    /* Status Radio Button Custom Styling */
    ::ng-deep .premium-status-radio .ant-radio-checked .ant-radio-inner { border-color: var(--theme-primary) !important; }
    ::ng-deep .premium-status-radio .ant-radio-inner::after { background-color: var(--theme-primary) !important; }
    ::ng-deep .premium-status-radio .ant-radio-wrapper:hover .ant-radio-inner { border-color: var(--theme-primary-dark) !important; }
    
    ::ng-deep .premium-status-radio .ant-radio-wrapper { color: var(--theme-text-main) !important; font-weight: 500; }
    ::ng-deep .premium-status-radio .ant-radio-inner { background-color: transparent !important; border-color: var(--theme-border) !important; }

    ::ng-deep .custom-dark-select.status-confirmed .ant-select-selector {
      color: #fbbf24 !important;
      border-color: rgba(251, 191, 36, 0.3) !important;
      background-color: rgba(251, 191, 36, 0.05) !important;
    }
    ::ng-deep .custom-dark-select.status-checked-in .ant-select-selector {
      color: #34d399 !important;
      border-color: rgba(52, 211, 153, 0.3) !important;
      background-color: rgba(52, 211, 153, 0.05) !important;
    }
    ::ng-deep .custom-dark-select.status-checked-out .ant-select-selector {
      color: #a1a1aa !important;
      border-color: rgba(161, 161, 170, 0.3) !important;
      background-color: rgba(161, 161, 170, 0.05) !important;
    }
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
  `]
})
export class BookingsComponent implements OnInit, OnDestroy {
  bookings: any[] = [];
  roomTypes: string[] = [];
  roomConfig: any = {};

  columns: ColumnConfig[] = [...DEFAULT_BOOKING_COLUMNS];
  popupFields: ColumnConfig[] = [...DEFAULT_BOOKING_COLUMNS];
  private bookingsSub?: Subscription;

  get hotelName(): string {
    const profile = this.supabase.currentProfile;
    return profile?.hotel_name || 'Room Bookings';
  }

  // Computed statistics getters
  get totalGuestsRegistered(): number {
    return this.filteredBookings.reduce((sum, b) => sum + Number(b.number_of_people || 0), 0);
  }

  get activeCheckedInCount(): number {
    return this.filteredBookings.filter(b => b.status === 'Checked In' || b.status === 'Active').length;
  }

  get totalBookingRevenue(): number {
    return this.filteredBookings.reduce((sum, b) => sum + Number(b.amount_paid || 0), 0);
  }

  get averageDurationOfStay(): number {
    const valid = this.filteredBookings.filter(b => Number(b.number_of_days || 0) > 0);
    return valid.length > 0 
      ? parseFloat((valid.reduce((sum, b) => sum + Number(b.number_of_days), 0) / valid.length).toFixed(1))
      : 0;
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
    address TEXT,
    check_in TIMESTAMPTZ NOT NULL,
    check_out TIMESTAMPTZ NOT NULL,
    actual_checkout TIMESTAMPTZ,
    number_of_days INTEGER DEFAULT 1,
    number_of_people INTEGER DEFAULT 1,
    amount_paid NUMERIC DEFAULT 0,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- If your table already exists, run this query to add the column:
-- ALTER TABLE public.room_bookings ADD COLUMN IF NOT EXISTS actual_checkout TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Allow public select" ON public.room_bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.room_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.room_bookings FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.room_bookings FOR DELETE USING (true);`;

  // Booking Modal State
  isBookingModalVisible = false;
  isOkLoading = false;
  bookingForm: FormGroup;
  editingBookingId: string | null = null;
  fileList: NzUploadFile[] = [];
  isUploadingFiles = false;

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
    this.bookingForm = this.fb.group({
      guest_name: ['', [Validators.required]],
      phone_number: [''],
      id_number: [''],
      room_number: ['', [Validators.required]],
      room_category: [''],
      address: [''],
      check_in: [null, [Validators.required]],
      check_out: [null, [Validators.required]],
      number_of_days: [1, [Validators.required, Validators.min(1)]],
      number_of_people: [1, [Validators.required, Validators.min(1)]],
      amount_paid: [null, [Validators.min(0)]],
      status: ['Checked In', [Validators.required]]
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
              }
            } catch (e) {}
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
          visible: s.visible
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
          visible: s.visible
        });
        fieldMap.delete(s.key);
      }
    });
    
    fieldMap.forEach(f => newFields.push(f));
    this.popupFields = newFields;
  }

  async saveColumnConfig(): Promise<void> {
    const tableConfig = this.columns.map(c => ({ key: c.key, visible: c.visible }));
    const popupConfig = this.popupFields.map(f => ({ key: f.key, visible: f.visible }));
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
      return;
    }

    this.activeQuickFilter = filter;

  }

  onGlobalFilterChange(): void {
    this.activePresetRange = 'custom';
    if (this.globalDateRange && this.globalDateRange.length === 2) {
      // Optional: clear quick filter on custom date
      this.activeQuickFilter = '';
    }
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

  get filteredBookings(): any[] {
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
  }

  resetBookingFilters(): void {
    this.colFilterDate = null;
    this.colFilterRoomNo = '';
    this.colFilterCategory = '';
    this.colFilterName = '';
    this.colFilterStatus = '';
    this.activeQuickFilter = 'check-in';
    this.applyPresetRange('Today');
  }

  getBookingsKey(): string {
    const profile = this.supabase.currentProfile;
    const hotelId = profile?.hotel_id || 'default';
    return `bookings_${hotelId}`;
  }

  async loadBookings(): Promise<void> {
    try {
      const client = this.supabase.getClient();
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
      }
    } catch (e: any) {
      console.error('Failed to load bookings from Supabase, falling back to local storage', e);
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
      } else {
        this.bookings = [];
      }
    } catch (e) {
      console.error('Failed to load bookings from local storage', e);
      this.bookings = [];
    }
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
  }

  recalculateCheckOut(): void {
    if (this.isRecalculating) return;
    this.isRecalculating = true;

    const checkIn = this.bookingForm.get('check_in')?.value;
    const days = this.bookingForm.get('number_of_days')?.value;

    if (checkIn && days && days > 0) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkInDate.getTime() + days * 24 * 60 * 60 * 1000);
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
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      this.bookingForm.patchValue({ number_of_days: diffDays }, { emitEvent: false });
    }

    this.isRecalculating = false;
  }

  openBookingAddModal(): void {
    this.editingBookingId = null;
    this.fileList = [];
    const now = new Date();
    const defaultCheckOut = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    this.bookingForm.reset({
      guest_name: '',
      phone_number: '',
      id_number: '',
      room_number: '',
      room_category: '',
      address: '',
      check_in: now,
      check_out: defaultCheckOut,
      number_of_days: 1,
      number_of_people: 1,
      amount_paid: null,
      status: 'Checked In'
    });
    this.isBookingModalVisible = true;
  }

  openBookingEditModal(data: any): void {
    this.editingBookingId = data.id;
    this.fileList = [];

    let days = data.number_of_days;
    if (!days && data.check_in && data.check_out) {
      const start = new Date(data.check_in);
      const end = new Date(data.check_out);
      const diffTime = end.getTime() - start.getTime();
      days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    this.bookingForm.reset({
      guest_name: data.guest_name,
      phone_number: data.phone_number || '',
      id_number: data.id_number || '',
      room_number: data.room_number,
      room_category: data.room_category || '',
      address: data.address || '',
      check_in: data.check_in,
      check_out: data.check_out,
      number_of_days: days || 1,
      number_of_people: data.number_of_people || 1,
      amount_paid: data.amount_paid,
      status: data.status
    });
    this.isBookingModalVisible = true;
  }

  handleBookingCancel(): void {
    this.isBookingModalVisible = false;
    this.editingBookingId = null;
    this.bookingForm.reset();
  }

  async updateBookingStatusDirectly(booking: any, newStatus: string): Promise<void> {
    if (newStatus === 'Checked Out') {
      this.supabase.requestOpenCheckout(booking);
      return;
    }

    try {
      const affectedDates = this.getStayDates(booking.check_in, booking.check_out);

      if (this.isDatabaseLinked) {
        const client = this.supabase.getClient();
        const updatePayload: any = { 
          status: newStatus,
          actual_checkout: null
        };

        const { error } = await client
          .from('room_bookings')
          .update(updatePayload)
          .eq('id', booking.id);

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
    if (this.bookingForm.valid) {
      this.isOkLoading = true;
      const formValue = this.bookingForm.value;
      const profile = this.supabase.currentProfile;
      const hotelId = profile?.hotel_id;

      let affectedDates: string[] = [];

      if (this.isDatabaseLinked) {
        try {
          const client = this.supabase.getClient();
          
          const dbPayload: any = {
            guest_name: formValue.guest_name,
            phone_number: formValue.phone_number || '',
            id_number: formValue.id_number || '',
            room_number: formValue.room_number,
            room_category: formValue.room_category || '',
            address: formValue.address || '',
            check_in: formValue.check_in,
            check_out: formValue.check_out,
            number_of_days: formValue.number_of_days,
            number_of_people: formValue.number_of_people,
            amount_paid: formValue.amount_paid || 0,
            status: formValue.status,
            actual_checkout: null
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
            let { error } = await client
              .from('room_bookings')
              .update(dbPayload)
              .eq('id', this.editingBookingId);

            if (error) {
              const errMsg = error.message || '';
              if (errMsg.includes('number_of_days') || errMsg.includes('number_of_people')) {
                delete dbPayload.number_of_days;
                delete dbPayload.number_of_people;
                const retryRes = await client
                  .from('room_bookings')
                  .update(dbPayload)
                  .eq('id', this.editingBookingId);
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
            let { data: insertedData, error } = await client
              .from('room_bookings')
              .insert([dbPayload])
              .select()
              .single();

            if (error) {
              const errMsg = error.message || '';
              if (errMsg.includes('number_of_days') || errMsg.includes('number_of_people')) {
                delete dbPayload.number_of_days;
                delete dbPayload.number_of_people;
                const retryRes = await client
                  .from('room_bookings')
                  .insert([dbPayload])
                  .select()
                  .single();
                error = retryRes.error;
                insertedData = retryRes.data;
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
              const { error: updatePathsError } = await client
                .from('room_bookings')
                .update({ id_documents: newPaths })
                .eq('id', this.editingBookingId);
                
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
        const client = this.supabase.getClient();
        const { error } = await client
          .from('room_bookings')
          .delete()
          .eq('id', id);

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
    const d = new Date(date);
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
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
          totalRoomsLimit += Number(this.roomConfig[key] || 0);
        }
      });
    }

    // Load all bookings first to compute occupancy
    let allBookings: any[] = [];
    if (this.isDatabaseLinked) {
      try {
        const client = this.supabase.getClient();
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

      // Filter active bookings on targetDate
      const activeBookings = allBookings.filter((b: any) => {
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

      const rooms_sold = standard_ac + standard_non_ac + deluxe + suite;
      const total_guests = activeBookings.length;

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
          const client = this.supabase.getClient();
          const { data: existing, error: findError } = await client
            .from('daily_entries')
            .select('id')
            .eq('hotel_id', hotelId)
            .eq('entry_date', targetDateStr)
            .maybeSingle();

          if (!findError) {
            if (existing) {
              // Update
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
              // Insert
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
