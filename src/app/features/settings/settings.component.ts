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
    NzSpinModule
  ],
  template: `
    <div class="space-y-8 pb-10">
      <!-- Settings Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--theme-border)] pb-6">
        <div>
          <h2 class="text-4xl font-normal text-[var(--theme-text-main)]">System Settings</h2>
          <p class="text-sm text-[var(--theme-text-muted)] mt-2">Configuration and Preferences Console</p>
        </div>
      </div>

      <!-- Dynamic Room Configuration Stats -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- KPI Cards Grid -->
        <div class="lg:col-span-2 grid grid-cols-3 gap-4">
          <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
            <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">Total Configured Units</span>
            <h3 class="text-3xl text-[var(--theme-text-main)] font-medium mt-4">{{ totalRooms }} <span class="text-xs text-[var(--theme-text-muted)]">Rooms</span></h3>
            <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-blue-500/5 blur-xl rounded-full"></div>
          </div>
          <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
            <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">Room Categories</span>
            <h3 class="text-3xl text-[var(--theme-text-main)] font-medium mt-4">{{ totalCategories }}</h3>
            <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-[var(--theme-primary)]/5 blur-xl rounded-full"></div>
          </div>
          <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
            <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">Avg. Capacity / Type</span>
            <h3 class="text-3xl text-[var(--theme-text-main)] font-medium mt-4">{{ averageCapacity }}</h3>
            <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-emerald-500/5 blur-xl rounded-full"></div>
          </div>
        </div>

        <!-- Room Types Distribution Progress Layout -->
        <div class="glass-card p-5 flex flex-col justify-between">
          <div class="mb-3">
            <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase block">Room Inventory Allocation Ratios</span>
            <p class="text-[10px] text-[var(--theme-text-muted)] font-normal mt-0.5">Ratio of each category's capacity in the total registered inventory</p>
          </div>
          <div class="space-y-2.5 flex-1 flex flex-col justify-center">
            <div *ngFor="let room of roomTypesDistribution" class="space-y-1">
              <div class="flex justify-between text-[11px] font-semibold">
                <span class="text-[var(--theme-text-muted)]">{{ room.key }}</span>
                <span class="text-[var(--theme-text-main)]">{{ room.pct }}% <span class="text-[9px] text-[var(--theme-text-muted)] font-light">({{ room.limit }} rooms)</span></span>
              </div>
              <div class="w-full h-1 bg-[var(--theme-border)]/20 rounded-full overflow-hidden">
                <div class="h-full rounded-full" [style.background-color]="room.color" [style.width.%]="room.pct"></div>
              </div>
            </div>
            <div *ngIf="roomTypes.length === 0" class="text-center text-xs text-[var(--theme-text-muted)] font-light">
              No categories to display
            </div>
          </div>
        </div>

      </div>

      <!-- Room Inventory Configuration Console -->
      <div class="glass-card p-8 relative overflow-hidden">
        <div class="flex justify-between items-start mb-6 border-b border-[var(--theme-border)] pb-4">
          <div>
            <h3 class="text-lg text-[var(--theme-text-main)] font-medium">Room Inventory Configuration</h3>
            <p class="text-[11px] text-[var(--theme-text-muted)] font-medium mt-1">Manage room categories, edit capacities, and add new room inventory to the system.</p>
          </div>
          <button nz-button 
                  [nzLoading]="isSaving" 
                  (click)="saveConfiguration()"
                  class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none rounded-xl h-10 px-5 text-xs font-semibold uppercase tracking-wider shadow-[0_0_15px_var(--theme-glow)] hover:shadow-[0_0_25px_var(--theme-glow-hover)] transition-all flex items-center gap-2">
            <span nz-icon nzType="save" nzTheme="outline"></span> Save Configuration
          </button>
        </div>

        <nz-spin [nzSpinning]="isSaving">
          <div class="space-y-6">
            
            <!-- Existing Rooms Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-[var(--theme-border)]">
                    <th class="pb-3 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">ROOM CATEGORY</th>
                    <th class="pb-3 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider w-40">TOTAL CAPACITY</th>
                    <th class="pb-3 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider w-24 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody class="text-sm">
                  <tr *ngFor="let room of roomTypes" class="border-b border-[var(--theme-border)] hover:bg-[var(--theme-border)]/10 transition-colors">
                    <td class="py-4 font-medium text-[var(--theme-text-main)]">{{ room.key }}</td>
                    <td class="py-4">
                      <nz-input-number [(ngModel)]="room.limit" [nzMin]="1" [nzStep]="1" class="w-28 rounded-lg bg-transparent text-[var(--theme-text-main)]"></nz-input-number>
                    </td>
                    <td class="py-4 text-right">
                      <button nz-button nzType="text" nzDanger (click)="deleteCategory(room.key)" class="hover:bg-red-500/10 p-1 rounded-lg">
                        <span nz-icon nzType="delete" nzTheme="outline"></span>
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="roomTypes.length === 0">
                    <td colspan="3" class="py-8 text-center text-[var(--theme-text-muted)]">
                      No room categories configured yet. Add one below.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Add New Room Category Form -->
            <div class="bg-[var(--theme-border)]/5 border border-[var(--theme-border)] rounded-2xl p-6 mt-6">
              <h4 class="text-xs font-bold text-[var(--theme-text-main)] uppercase tracking-wider mb-4">Add Room Category</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div class="space-y-2">
                  <label class="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Category Name</label>
                  <input nz-input [(ngModel)]="newCategoryName" placeholder="e.g. Deluxe Suite" class="h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]" />
                </div>
                <div class="space-y-2">
                  <label class="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Max Capacity / Rooms</label>
                  <nz-input-number [(ngModel)]="newCategoryLimit" [nzMin]="1" [nzStep]="1" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]"></nz-input-number>
                </div>
                <div>
                  <button nz-button (click)="addCategory()" class="w-full h-10 bg-transparent border border-[var(--theme-primary)]/50 text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 hover:text-[var(--theme-primary)] rounded-xl font-semibold text-xs uppercase tracking-wider transition-all">
                    <span nz-icon nzType="plus" nzTheme="outline"></span> Add Category
                  </button>
                </div>
              </div>
            </div>

          </div>
        </nz-spin>
      </div>
    </div>
  `,
  styles: [`
    :ng-deep .ant-input-number {
      background-color: transparent !important;
      border-color: var(--theme-border) !important;
    }
    :ng-deep .ant-input-number-input {
      color: var(--theme-text-main) !important;
    }
    :ng-deep .ant-input-number-handler-wrap {
      background-color: var(--theme-border) !important;
      border-left: 1px solid var(--theme-border) !important;
    }
    :ng-deep .ant-input-number-handler {
      border-top: 1px solid var(--theme-border) !important;
    }
    :ng-deep .ant-input-number-handler-up-inner, 
    :ng-deep .ant-input-number-handler-down-inner {
      color: var(--theme-text-muted) !important;
    }
  `]
})
export class SettingsComponent implements OnInit {
  roomConfig: any = {};
  roomTypes: { key: string; limit: number }[] = [];
  hotelId: string = '';
  isSaving = false;

  newCategoryName = '';
  newCategoryLimit = 1;

  categoryColors = ['var(--theme-primary)', '#38bdf8', '#f59e0b', '#ec4899', '#a855f7', '#14b8a6', '#f43f5e', '#10b981'];

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
        
        let keys: string[] = [];
        if (this.roomConfig._order && Array.isArray(this.roomConfig._order)) {
          keys = this.roomConfig._order.filter((key: string) => key in this.roomConfig);
          Object.keys(this.roomConfig).forEach(key => {
            if (key !== '_order' && !keys.includes(key)) {
              keys.push(key);
            }
          });
        } else {
          keys = Object.keys(this.roomConfig).filter(k => k !== '_order');
        }

        this.roomTypes = keys.map(k => ({
          key: k,
          limit: this.roomConfig[k] || 0
        }));
      }
    });
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
    this.roomTypes.push({ key: name, limit: this.newCategoryLimit });
    this.newCategoryName = '';
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
        configObj[r.key] = r.limit;
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
}
