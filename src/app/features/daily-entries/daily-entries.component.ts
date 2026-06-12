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
    NzPopoverModule
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
  template: `
    <div class="space-y-8 pb-10">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--theme-border)] pb-6">
        <div>
          <h2 class="text-4xl font-normal text-[var(--theme-text-main)]">Daily Audit Logs</h2>
          <p class="text-sm text-[var(--theme-text-muted)] mt-2">Room Occupancy & Daily Yield Ledger</p>
        </div>
        <button class="bg-[var(--theme-primary)] text-black border-none hover:bg-[var(--theme-primary-dark)] shadow-[0_0_15px_var(--theme-glow)] hover:shadow-[0_0_25px_var(--theme-glow-hover)] rounded-xl h-10 px-5 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                (click)="openAddModal()">
          <span nz-icon nzType="plus"></span> Add Daily Entry
        </button>
      </div>

      <!-- Dynamic Statistics Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
          <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">Avg Daily Occupancy</span>
          <h3 class="text-3xl text-[var(--theme-text-main)] font-medium mt-4">{{ averageOccupancy }}%</h3>
          <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-blue-500/5 blur-xl rounded-full"></div>
        </div>
        <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
          <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">Total Rooms Sold</span>
          <h3 class="text-3xl text-[var(--theme-text-main)] font-medium mt-4">{{ totalRoomsSold }}</h3>
          <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-[var(--theme-primary)]/5 blur-xl rounded-full"></div>
        </div>
        <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
          <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">Recorded Revenue</span>
          <h3 class="text-3xl text-[var(--theme-primary)] font-medium mt-4">₹{{ totalRevenueCollected | number }}</h3>
          <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-[var(--theme-primary)]/10 blur-xl rounded-full"></div>
        </div>
        <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
          <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">Peak Daily Revenue</span>
          <h3 class="text-3xl text-[var(--theme-text-main)] font-medium mt-4">₹{{ peakDailyRevenue | number }}</h3>
          <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-emerald-500/5 blur-xl rounded-full"></div>
        </div>
      </div>

      <div class="glass-card p-6">
        <div class="flex flex-col gap-3 mb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-[var(--theme-text-main)] uppercase tracking-wider">Audit Logs Ledger</span>
            </div>
            <button nz-button nzType="text" class="text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] text-xs flex items-center gap-1" (click)="resetDailyFilters()">
              <span nz-icon nzType="close"></span> Clear All Filters
            </button>
          </div>
          <!-- Hidden Columns restore area -->
          <div *ngIf="getHiddenColumns().length > 0" class="flex flex-wrap items-center gap-2 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-2.5">
            <span class="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mr-1">Hidden Columns:</span>
            <button *ngFor="let col of getHiddenColumns()" 
                    (click)="toggleColumnVisibility(col.key, true)" 
                    class="bg-[var(--theme-border)]/20 hover:bg-[var(--theme-border)]/40 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] text-[10px] px-2.5 py-1 rounded-lg border border-[var(--theme-border)] transition-all flex items-center gap-1.5 cursor-pointer">
              <span nz-icon nzType="plus" class="text-[8px]"></span>
              <span>{{ col.label }}</span>
            </button>
          </div>
        </div>

        <nz-table #basicTable 
                  [nzData]="filteredEntries" 
                  [nzFrontPagination]="true" 
                  [nzPageSize]="10" 
                  nzSize="middle" 
                  [nzBordered]="false"
                  [nzLoading]="loading"
                  [nzScroll]="{ x: '1400px' }">
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
                    <div class="hidden group-hover:flex items-center gap-0.5 mr-1 text-[10px] text-[var(--theme-text-muted)] bg-[var(--theme-card)] backdrop-blur rounded-lg px-1.5 py-1 border border-[var(--theme-border)] absolute -top-8 left-1/2 -translate-x-1/2 z-10 shadow-lg">
                      <button nz-button nzType="text" class="text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] p-0 h-4 w-4 leading-none flex items-center justify-center min-w-0" 
                              [disabled]="i === 0" (click)="moveColumn(i, 'left'); $event.stopPropagation()">
                        <span nz-icon nzType="left" class="text-[9px]"></span>
                      </button>
                      <button nz-button nzType="text" class="text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] p-0 h-4 w-4 leading-none flex items-center justify-center min-w-0 ml-0.5" 
                              [disabled]="i === columns.length - 1" (click)="moveColumn(i, 'right'); $event.stopPropagation()">
                        <span nz-icon nzType="right" class="text-[9px]"></span>
                      </button>
                      <button nz-button nzType="text" class="text-rose-400 hover:text-rose-300 p-0 h-4 w-4 leading-none flex items-center justify-center min-w-0 ml-1 border-l border-[var(--theme-border)] pl-1" 
                              (click)="toggleColumnVisibility(col.key, false); $event.stopPropagation()">
                        <span nz-icon nzType="close" class="text-[9px]"></span>
                      </button>
                    </div>

                    <span>{{ col.label }}</span>

                    <!-- Conditional Column Header popover filters -->
                    <ng-container [ngSwitch]="col.key">
                      <span *ngSwitchCase="'entry_date'" nz-icon nzType="filter" nzTheme="outline" 
                            class="cursor-pointer text-[var(--theme-primary)] hover:text-[var(--theme-text-main)] transition-colors"
                            [class.text-[var(--theme-text-main)]]="dailyFilterDate"
                            nz-popover [nzPopoverContent]="dailyDateFilterTpl" nzPopoverTrigger="click" nzPopoverPlacement="bottomLeft"></span>
                      <span *ngSwitchCase="'rooms_sold'" nz-icon nzType="filter" nzTheme="outline" 
                            class="cursor-pointer text-[var(--theme-primary)] hover:text-[var(--theme-text-main)] transition-colors"
                            [class.text-[var(--theme-text-main)]]="dailyMinRoomsSold"
                            nz-popover [nzPopoverContent]="dailyRoomsFilterTpl" nzPopoverTrigger="click" nzPopoverPlacement="bottomLeft"></span>
                      <span *ngSwitchCase="'total_revenue'" nz-icon nzType="filter" nzTheme="outline" 
                            class="cursor-pointer text-[var(--theme-primary)] hover:text-[var(--theme-text-main)] transition-colors"
                            [class.text-[var(--theme-text-main)]]="dailyMinRevenue"
                            nz-popover [nzPopoverContent]="dailyRevenueFilterTpl" nzPopoverTrigger="click" nzPopoverPlacement="bottomLeft"></span>
                    </ng-container>
                  </div>
                </th>
              </ng-container>
              <th class="pb-3 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider bg-transparent border-none text-right" nzWidth="100px">ACTIONS</th>
            </tr>
          </thead>
          <tbody class="text-sm">
            <tr *ngFor="let data of basicTable.data" class="border-b border-[var(--theme-border)] transition-colors">
              <ng-container *ngFor="let col of columns">
                <td *ngIf="col.visible" 
                    class="py-4 text-xs bg-transparent border-none font-light" 
                    [class.text-center]="col.align === 'center'" 
                    [class.text-right]="col.align === 'right'"
                    [class.font-semibold]="col.key === 'entry_date' || col.key === 'total_revenue'"
                    [class.font-medium]="col.key === 'rooms_sold'"
                    [class.text-[var(--theme-text-main)]]="col.key === 'entry_date' || col.key === 'rooms_sold' || col.key !== 'total_rooms_available' && col.key !== 'total_guests' && col.key !== 'notes'"
                    [class.text-[var(--theme-text-muted)]]="col.key === 'total_rooms_available' || col.key === 'total_guests' || col.key === 'notes'"
                    [class.max-w-[200px]]="col.key === 'notes'"
                    [class.truncate]="col.key === 'notes'"
                    [class.uppercase]="col.key === 'entry_date'"
                    [class.tracking-wider]="col.key === 'entry_date'"
                    [title]="col.key === 'notes' ? (data.notes || '') : ''">
                  
                  <ng-container [ngSwitch]="col.key">
                    <span *ngSwitchCase="'entry_date'">{{ data.entry_date | date:'dd MMM yyyy' }}</span>
                    <span *ngSwitchCase="'rooms_sold'">{{ data.rooms_sold }}</span>
                    <span *ngSwitchCase="'total_rooms_available'">{{ data.total_rooms_available }} rooms</span>
                    <span *ngSwitchCase="'total_guests'">{{ data.total_guests }} guests</span>
                    <span *ngSwitchCase="'total_revenue'" class="text-[var(--theme-primary)]">₹{{ data.total_revenue | number }}</span>
                    <span *ngSwitchCase="'notes'">{{ data.notes || '-' }}</span>
                    <span *ngSwitchDefault>{{ data[col.key] || 0 }}</span>
                  </ng-container>

                </td>
              </ng-container>
              <td class="py-4 bg-transparent border-none text-right">
                <button nz-button nzType="text" class="text-amber-500 hover:text-amber-400 transition-colors p-0 mr-4" (click)="openEditModal(data)">
                  <span nz-icon nzType="edit" class="text-base"></span>
                </button>
                <button nz-button nzType="text" class="text-rose-500 hover:text-rose-400 transition-colors p-0" nz-popconfirm nzPopconfirmTitle="Are you sure to delete this daily audit log?" (nzOnConfirm)="deleteEntry(data.id)">
                  <span nz-icon nzType="delete" class="text-base"></span>
                </button>
              </td>
            </tr>
            <tr *ngIf="filteredEntries.length === 0">
              <td [attr.colspan]="getVisibleColumnsCount() + 1" class="text-center py-8 text-[var(--theme-text-muted)] bg-transparent border-none">
                No logs matches the active filters.
              </td>
            </tr>
          </tbody>
        </nz-table>
      </div>

      <!-- Popover Content Templates -->
      <ng-template #dailyDateFilterTpl>
        <div class="p-4 w-72">
          <div class="flex items-center justify-between border-b border-[var(--theme-border)] pb-2 mb-3">
            <span class="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider">Filter Date</span>
          </div>
          <div class="mb-4">
            <nz-date-picker [(ngModel)]="dailyFilterDate" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)] border-[var(--theme-border)]" nzFormat="yyyy-MM-dd"></nz-date-picker>
          </div>
          <div class="flex justify-end gap-2">
            <button nz-button nzType="text" nzSize="small" class="text-[var(--theme-text-muted)] text-xs hover:text-[var(--theme-text-main)]" (click)="dailyFilterDate = null">Reset</button>
            <button nz-button nzSize="small" class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none font-bold text-xs rounded-lg px-4 h-8 transition-all">APPLY FILTER</button>
          </div>
        </div>
      </ng-template>

      <ng-template #dailyRoomsFilterTpl>
        <div class="p-4 w-72">
          <div class="flex items-center justify-between border-b border-[var(--theme-border)] pb-2 mb-3">
            <span class="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider">Min Rooms Sold</span>
          </div>
          <div class="mb-4">
            <nz-input-number [(ngModel)]="dailyMinRoomsSold" [nzMin]="0" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)] border-[var(--theme-border)]" placeholder="e.g. 5"></nz-input-number>
          </div>
          <div class="flex justify-end gap-2">
            <button nz-button nzType="text" nzSize="small" class="text-[var(--theme-text-muted)] text-xs hover:text-[var(--theme-text-main)]" (click)="dailyMinRoomsSold = null">Reset</button>
            <button nz-button nzSize="small" class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none font-bold text-xs rounded-lg px-4 h-8 transition-all">APPLY FILTER</button>
          </div>
        </div>
      </ng-template>

      <ng-template #dailyRevenueFilterTpl>
        <div class="p-4 w-72">
          <div class="flex items-center justify-between border-b border-[var(--theme-border)] pb-2 mb-3">
            <span class="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider">Min Revenue (₹)</span>
          </div>
          <div class="mb-4">
            <nz-input-number [(ngModel)]="dailyMinRevenue" [nzMin]="0" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)] border-[var(--theme-border)]" placeholder="e.g. 10000"></nz-input-number>
          </div>
          <div class="flex justify-end gap-2">
            <button nz-button nzType="text" nzSize="small" class="text-[var(--theme-text-muted)] text-xs hover:text-[var(--theme-text-main)]" (click)="dailyMinRevenue = null">Reset</button>
            <button nz-button nzSize="small" class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none font-bold text-xs rounded-lg px-4 h-8 transition-all">APPLY FILTER</button>
          </div>
        </div>
      </ng-template>
    </div>

    <!-- Edit Modal -->
    <nz-modal [(nzVisible)]="isEditModalVisible" 
              [nzTitle]="modalTitle" 
              (nzOnCancel)="handleCancel()" 
              [nzFooter]="modalFooter"
              [nzWidth]="950">
      
      <ng-template #modalTitle>
        <div class="flex items-center gap-3">
          <span nz-icon nzType="edit" class="text-lg" [style.color]="'var(--theme-primary)'"></span>
          <span class="text-[var(--theme-text-main)] font-semibold uppercase tracking-wider text-xs" style="font-family: 'Hanken Grotesk', sans-serif;">Edit Daily Audit Log</span>
        </div>
      </ng-template>

      <ng-template #modalFooter>
        <div class="flex justify-end gap-3 px-4 py-3">
          <button nz-button nzType="default" class="bg-[var(--theme-border)]/5 border border-[var(--theme-border)] hover:bg-[var(--theme-border)]/20 text-[var(--theme-text-main)] rounded-xl h-10 px-5 text-xs font-semibold uppercase tracking-wider transition-all" (click)="handleCancel()">
            Cancel
          </button>
          <button nz-button [nzLoading]="isOkLoading" class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none rounded-xl h-10 px-5 text-xs font-semibold uppercase tracking-wider shadow-[0_0_15px_var(--theme-glow)] hover:shadow-[0_0_25px_var(--theme-glow-hover)] transition-all" (click)="handleEditOk()">
            Save Changes
          </button>
        </div>
      </ng-template>

      <ng-container *nzModalContent>
        <form nz-form nzLayout="vertical" [formGroup]="editForm" class="p-2">
          <div nz-row [nzGutter]="[16, 12]">
            <ng-container *ngFor="let field of popupFields">
              <ng-container *ngIf="field.visible && field.key !== 'entry_date' && field.key !== 'vacant_rooms' && field.key !== 'total_rooms_available'">
                <div nz-col nzXs="24" nzSm="12" [nzMd]="field.key === 'notes' ? 24 : 8">
                  <ng-container [ngSwitch]="field.key">
                    
                    <!-- Rooms Sold -->
                    <nz-form-item *ngSwitchCase="'rooms_sold'" class="mb-0">
                      <nz-form-label nzRequired class="text-[var(--theme-text-main)]/80 font-medium">Rooms Sold (Total)</nz-form-label>
                      <nz-form-control>
                        <nz-input-number formControlName="rooms_sold" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]"></nz-input-number>
                      </nz-form-control>
                    </nz-form-item>

                    <!-- Total Revenue -->
                    <nz-form-item *ngSwitchCase="'total_revenue'" class="mb-0">
                      <nz-form-label nzRequired class="text-[var(--theme-text-main)]/80 font-medium">Total Revenue</nz-form-label>
                      <nz-form-control nzErrorTip="Please input total revenue">
                        <div class="rupee-input-wrapper relative w-full h-10 flex items-center">
                          <span class="absolute left-4 text-[var(--theme-primary)] pointer-events-none font-medium z-10">₹</span>
                          <input type="number" nz-input formControlName="total_revenue" placeholder="0.00" class="!pl-10 bg-transparent border border-[var(--theme-border)] rounded-xl text-[var(--theme-text-main)] h-full w-full hover:border-[var(--theme-primary)] focus:border-transparent focus:shadow-[0px_4px_20px_var(--theme-glow),_inset_0px_-2px_0px_var(--theme-primary)] transition-all" />
                        </div>
                      </nz-form-control>
                    </nz-form-item>

                    <!-- Total Guests -->
                    <nz-form-item *ngSwitchCase="'total_guests'" class="mb-0">
                      <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium">Total Guests</nz-form-label>
                      <nz-form-control>
                        <nz-input-number formControlName="total_guests" [nzMin]="0" [nzStep]="1" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]" placeholder="Optional"></nz-input-number>
                      </nz-form-control>
                    </nz-form-item>

                    <!-- Notes -->
                    <nz-form-item *ngSwitchCase="'notes'" class="mb-0">
                      <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium">Notes / Remarks</nz-form-label>
                      <nz-form-control>
                        <input nz-input formControlName="notes" placeholder="Any special notes for today..." class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]" />
                      </nz-form-control>
                    </nz-form-item>
                    
                    <!-- Dynamic Room Categories -->
                    <nz-form-item *ngSwitchDefault class="mb-0">
                      <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium overflow-hidden text-ellipsis whitespace-nowrap">{{ field.label }}</nz-form-label>
                      <nz-form-control [nzErrorTip]="'Max ' + (roomConfig[field.key] || 0)">
                        <nz-input-number [formControlName]="field.key" [nzMin]="0" [nzMax]="roomConfig[field.key]" [nzStep]="1" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]"></nz-input-number>
                      </nz-form-control>
                    </nz-form-item>

                  </ng-container>
                </div>
              </ng-container>
            </ng-container>
          </div>
        </form>
      </ng-container>
    </nz-modal>
  `
})
export class DailyEntriesComponent implements OnInit {
  entries: any[] = [];
  loading = true;

  columns: ColumnConfig[] = [];
  popupFields: ColumnConfig[] = [];

  // Computed statistics
  get averageOccupancy(): number {
    const sold = this.filteredEntries.reduce((sum, e) => sum + Number(e.rooms_sold || 0), 0);
    const avail = this.filteredEntries.reduce((sum, e) => sum + Number(e.total_rooms_available || 0), 0);
    return avail > 0 ? Math.round((sold / avail) * 100) : 0;
  }

  get totalRoomsSold(): number {
    return this.filteredEntries.reduce((sum, e) => sum + Number(e.rooms_sold || 0), 0);
  }

  get totalRevenueCollected(): number {
    return this.filteredEntries.reduce((sum, e) => sum + Number(e.total_revenue || 0), 0);
  }

  get peakDailyRevenue(): number {
    return this.filteredEntries.reduce((max, e) => Math.max(max, Number(e.total_revenue || 0)), 0);
  }

  // Filter variables
  dailyFilterDate: Date | null = null;
  dailyMinRoomsSold: number | null = null;
  dailyMinRevenue: number | null = null;

  get filteredEntries(): any[] {
    return this.entries.filter(e => {
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
  }

  resetDailyFilters(): void {
    this.dailyFilterDate = null;
    this.dailyMinRoomsSold = null;
    this.dailyMinRevenue = null;
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
            const limit = this.roomConfig[type] || 0;
            totalLimit += limit;

            // Dynamically add form control
            this.editForm.addControl(
              type,
              this.fb.control(null, [Validators.min(0), Validators.max(limit)])
            );

            // Calculate total rooms sold on change
            this.editForm.get(type)?.valueChanges.subscribe((value) => {
              const limitVal = this.roomConfig[type] || 0;
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
              }
            } catch (e) {}
          }
        }
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
      const client = this.supabase.getClient();
      const { data, error } = await client
        .from('daily_entries')
        .select('*')
        .order('entry_date', { ascending: false });

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
          const client = this.supabase.getClient();
          const { error } = await client
            .from('daily_entries')
            .update({
              rooms_sold: formData.rooms_sold,
              total_rooms_available: formData.total_rooms_available,
              vacant_rooms: vacantRooms >= 0 ? vacantRooms : 0,
              total_guests: formData.total_guests || 0,
              total_revenue: formData.total_revenue,
              notes: formData.notes,
              ...dbRoomData
            })
            .eq('id', this.editingId);

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
      const client = this.supabase.getClient();
      const { error } = await client.from('daily_entries').delete().eq('id', id);
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
