import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { SupabaseService } from '../../core/services/supabase.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { ColumnConfig, DEFAULT_EXPENSE_COLUMNS } from '../../core/models/column-config.model';
import { NzUploadModule, NzUploadFile } from 'ng-zorro-antd/upload';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzIconModule,
    NzPopconfirmModule,
    NzModalModule,
    ReactiveFormsModule,
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    NzPopoverModule,
    NzUploadModule
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
          <h2 class="text-4xl font-normal text-[var(--theme-text-main)]">Monthly Expenses</h2>
          <p class="text-sm text-[var(--theme-text-muted)] mt-2">Operational Outflows & Ledger</p>
        </div>
        <div class="flex items-center gap-3">
          <button class="bg-[var(--theme-card)] hover:bg-[var(--theme-border)]/50 border border-[var(--theme-border)] text-[var(--theme-text-main)] rounded-xl h-10 px-4 sm:px-6 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer" 
                  (click)="showStandaloneIndividualExpenseModal()">
            <span nz-icon nzType="plus"></span> Add Item
          </button>
          <button class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none rounded-xl h-10 px-4 sm:px-6 text-xs font-semibold uppercase tracking-wider shadow-[0_0_15px_var(--theme-glow)] hover:shadow-[0_0_25px_var(--theme-glow-hover)] transition-all flex items-center gap-2 cursor-pointer" 
                  (click)="openAddModal()">
            <span nz-icon nzType="plus"></span> Add Month
          </button>
        </div>
      </div>

      <!-- Dynamic Operational Outflow Stats -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- KPI Cards Grid -->
        <div class="lg:col-span-2 grid grid-cols-2 gap-4">
          <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
            <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">YTD Cumulative Outflow</span>
            <h3 class="text-3xl text-[var(--theme-text-main)] font-medium mt-4">₹{{ totalOutflowYtd | number }}</h3>
            <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-red-500/5 blur-xl rounded-full"></div>
          </div>
          <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
            <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">Average Monthly Outflow</span>
            <h3 class="text-3xl text-[var(--theme-text-main)] font-medium mt-4">₹{{ averageMonthlyOutflow | number }}</h3>
            <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-blue-500/5 blur-xl rounded-full"></div>
          </div>
          <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
            <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">Peak Outflow Period</span>
            <h3 class="text-xl text-[var(--theme-text-main)] font-medium mt-4">{{ highestOutflowMonth }}</h3>
            <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-amber-500/5 blur-xl rounded-full"></div>
          </div>
          <div class="glass-card flex flex-col justify-between min-h-[110px] p-5 relative overflow-hidden">
            <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase">Pending Liabilities</span>
            <h3 class="text-3xl text-rose-500 font-medium mt-4">₹{{ pendingLiabilities | number }}</h3>
            <div class="absolute -bottom-6 -right-6 w-16 h-16 bg-rose-500/5 blur-xl rounded-full"></div>
          </div>
        </div>

        <!-- Expense Category Breakdown Block -->
        <div class="glass-card p-5 flex flex-col justify-between">
          <div class="mb-3">
            <span class="text-[9px] text-[var(--theme-text-muted)] font-bold tracking-wider uppercase block">Expenditure Category Allocation</span>
            <p class="text-[10px] text-[var(--theme-text-muted)] font-normal mt-0.5">YTD Cumulative percentage ratios by department</p>
          </div>
          <div class="space-y-2.5 flex-1 flex flex-col justify-center">
            <div *ngFor="let item of expenseBreakdown" class="space-y-1">
              <div class="flex justify-between text-[11px] font-semibold">
                <span class="text-[var(--theme-text-muted)]">{{ item.name }}</span>
                <span class="text-[var(--theme-text-main)]">{{ item.pct }}% <span class="text-[9px] text-[var(--theme-text-muted)] font-light">(₹{{ item.amount | number }})</span></span>
              </div>
              <div class="w-full h-1 bg-[var(--theme-border)]/20 rounded-full overflow-hidden">
                <div class="h-full rounded-full" [style.background-color]="item.color" [style.width.%]="item.pct"></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div class="glass-card p-6">
        <div class="flex flex-col gap-3 mb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-[var(--theme-text-main)] uppercase tracking-wider">Operational Ledger</span>
            </div>
            <button nz-button nzType="text" class="text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] text-xs flex items-center gap-1" (click)="resetExpenseFilters()">
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
                  [nzData]="filteredGroupedExpenses" 
                  [nzFrontPagination]="true" 
                  [nzPageSize]="10" 
                  nzSize="middle" 
                  [nzBordered]="false"
                  [nzLoading]="loading"
                  [nzScroll]="{ x: '1100px' }">
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
                      <span *ngSwitchCase="'month_year'" nz-icon nzType="filter" nzTheme="outline" 
                            class="cursor-pointer text-[var(--theme-primary)] hover:text-[var(--theme-text-main)] transition-colors"
                            [class.text-[var(--theme-text-main)]]="expenseFilterYear || expenseFilterMonth"
                            nz-popover [nzPopoverContent]="expenseDateFilterTpl" nzPopoverTrigger="click" nzPopoverPlacement="bottomLeft"></span>
                      <span *ngSwitchCase="'payment_status'" nz-icon nzType="filter" nzTheme="outline" 
                            class="cursor-pointer text-[var(--theme-primary)] hover:text-[var(--theme-text-main)] transition-colors"
                            [class.text-[var(--theme-text-main)]]="expenseFilterStatus"
                            nz-popover [nzPopoverContent]="expenseStatusFilterTpl" nzPopoverTrigger="click" nzPopoverPlacement="bottomLeft"></span>
                      <span *ngSwitchCase="'total_amount'" nz-icon nzType="filter" nzTheme="outline" 
                            class="cursor-pointer text-[var(--theme-primary)] hover:text-[var(--theme-text-main)] transition-colors"
                            [class.text-[var(--theme-text-main)]]="expenseMinAmount"
                            nz-popover [nzPopoverContent]="expenseAmountFilterTpl" nzPopoverTrigger="click" nzPopoverPlacement="bottomLeft"></span>
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
                    [class.font-semibold]="col.key === 'month_year' || col.key === 'total_amount'"
                    [class.text-[var(--theme-text-main)]]="col.key === 'month_year' || (col.key !== 'payment_status' && col.key !== 'total_amount')"
                    [class.uppercase]="col.key === 'month_year'"
                    [class.tracking-wider]="col.key === 'month_year'">
                  
                  <ng-container [ngSwitch]="col.key">
                    <span *ngSwitchCase="'month_year'">{{ getMonthName(data.expense_month) }} / {{ data.expense_year }}</span>
                    <ng-container *ngSwitchCase="'payment_status'">
                      <span class="px-3 py-1.5 rounded-xl text-[9px] uppercase tracking-widest font-semibold animate-pulse"
                        [ngClass]="data.payment_status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'">
                        {{ data.payment_status }}
                      </span>
                    </ng-container>

                    <ng-container *ngSwitchCase="'receipts'">
                      <button *ngIf="data.receipts?.length" nz-button nzType="text" class="text-[var(--theme-primary)] hover:!text-amber-300 hover:!bg-transparent focus:!text-amber-300 focus:!bg-transparent active:!bg-transparent text-xs font-semibold px-2 flex items-center justify-center m-auto transition-colors" (click)="viewAttachments(data.receipts)">
                        View ({{data.receipts.length}})
                      </button>
                      <span *ngIf="!data.receipts?.length" class="text-[var(--theme-text-muted)] flex justify-center">-</span>
                    </ng-container>

                    <span *ngSwitchCase="'total_amount'" class="text-rose-500">₹{{ data.total_amount | number }}</span>
                    <!-- Numerical columns -->
                    <span *ngSwitchDefault>{{ data[col.key] ? '₹' + (data[col.key] | number) : '-' }}</span>
                  </ng-container>

                </td>
              </ng-container>
              <td class="py-4 bg-transparent border-none text-right">
                <button type="button" class="text-amber-500 hover:text-amber-400 transition-colors p-0 mr-4 bg-transparent border-none cursor-pointer outline-none focus:outline-none hover:bg-transparent active:bg-transparent" (click)="openEditModal(data)">
                  <span nz-icon nzType="edit" class="text-base"></span>
                </button>
                <button type="button" class="text-rose-500 hover:text-rose-400 transition-colors p-0 bg-transparent border-none cursor-pointer outline-none focus:outline-none hover:bg-transparent active:bg-transparent" nz-popconfirm nzPopconfirmTitle="Are you sure to delete all expenses for this month?" (nzOnConfirm)="deleteExpenseGroup(data)">
                  <span nz-icon nzType="delete" class="text-base"></span>
                </button>
              </td>
            </tr>
            <tr *ngIf="filteredGroupedExpenses.length === 0">
              <td [attr.colspan]="getVisibleColumnsCount() + 1" class="text-center py-8 text-[var(--theme-text-muted)] bg-transparent border-none">
                No expenses matches the active filters.
              </td>
            </tr>
          </tbody>
        </nz-table>
      </div>

      <!-- Popover Content Templates -->
      <ng-template #expenseDateFilterTpl>
        <div class="p-4 w-72">
          <div class="flex items-center justify-between border-b border-[var(--theme-border)] pb-2 mb-3">
            <span class="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider">Filter Month/Year</span>
          </div>
          <div class="mb-3">
            <label class="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider block mb-1">Operating Year</label>
            <nz-select [(ngModel)]="expenseFilterYear" class="w-full h-10 custom-dark-select" nzPlaceHolder="All Years">
              <nz-option [nzValue]="null" nzLabel="All Years"></nz-option>
              <nz-option [nzValue]="2025" nzLabel="2025"></nz-option>
              <nz-option [nzValue]="2026" nzLabel="2026"></nz-option>
              <nz-option [nzValue]="2027" nzLabel="2027"></nz-option>
            </nz-select>
          </div>
          <div class="mb-4">
            <label class="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider block mb-1">Month</label>
            <nz-select [(ngModel)]="expenseFilterMonth" class="w-full h-10 custom-dark-select" nzPlaceHolder="All Months">
              <nz-option [nzValue]="null" nzLabel="All Months"></nz-option>
              <nz-option *ngFor="let m of [1,2,3,4,5,6,7,8,9,10,11,12]" [nzValue]="m" [nzLabel]="getMonthName(m)"></nz-option>
            </nz-select>
          </div>
          <div class="flex justify-end gap-2">
            <button nz-button nzType="text" nzSize="small" class="text-[var(--theme-text-muted)] text-xs hover:text-[var(--theme-text-main)]" (click)="expenseFilterYear = null; expenseFilterMonth = null">Reset</button>
            <button nz-button nzSize="small" class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none font-bold text-xs rounded-lg px-4 h-8 transition-all">APPLY FILTER</button>
          </div>
        </div>
      </ng-template>

      <ng-template #expenseStatusFilterTpl>
        <div class="p-4 w-72">
          <div class="flex items-center justify-between border-b border-[var(--theme-border)] pb-2 mb-3">
            <span class="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider">Filter Payment Status</span>
          </div>
          <div class="mb-4">
            <nz-select [(ngModel)]="expenseFilterStatus" class="w-full h-10 custom-dark-select" nzPlaceHolder="Select Status">
              <nz-option nzValue="" nzLabel="All Statuses"></nz-option>
              <nz-option nzValue="Paid" nzLabel="Paid"></nz-option>
              <nz-option nzValue="Pending" nzLabel="Pending"></nz-option>
            </nz-select>
          </div>
          <div class="flex justify-end gap-2">
            <button nz-button nzType="text" nzSize="small" class="text-[var(--theme-text-muted)] text-xs hover:text-[var(--theme-text-main)]" (click)="expenseFilterStatus = ''">Reset</button>
            <button nz-button nzSize="small" class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none font-bold text-xs rounded-lg px-4 h-8 transition-all">APPLY FILTER</button>
          </div>
        </div>
      </ng-template>

      <ng-template #expenseAmountFilterTpl>
        <div class="p-4 w-72">
          <div class="flex items-center justify-between border-b border-[var(--theme-border)] pb-2 mb-3">
            <span class="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider">Min Total Outflow</span>
          </div>
          <div class="mb-4">
            <nz-input-number [(ngModel)]="expenseMinAmount" [nzMin]="0" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)] border-[var(--theme-border)]" placeholder="e.g. 10000"></nz-input-number>
          </div>
          <div class="flex justify-end gap-2">
            <button nz-button nzType="text" nzSize="small" class="text-[var(--theme-text-muted)] text-xs hover:text-[var(--theme-text-main)]" (click)="expenseMinAmount = null">Reset</button>
            <button nz-button nzSize="small" class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none font-bold text-xs rounded-lg px-4 h-8 transition-all">APPLY FILTER</button>
          </div>
        </div>
      </ng-template>
    </div>

    <!-- Add/Edit Modal -->
    <nz-modal [(nzVisible)]="isModalVisible" 
              [nzTitle]="modalTitle" 
              (nzOnCancel)="handleCancel()" 
              [nzFooter]="modalFooter"
              [nzWidth]="900">
      
      <ng-template #modalTitle>
        <div class="flex items-center gap-3">
          <span nz-icon [nzType]="editingMonthYear ? 'edit' : 'plus-circle'" class="text-lg" [style.color]="'var(--theme-primary)'"></span>
          <span class="text-[var(--theme-text-main)] font-semibold uppercase tracking-wider text-xs" style="font-family: 'Hanken Grotesk', sans-serif;">
            {{ editingMonthYear ? 'Edit Expense Record' : 'Add New Expense' }}
          </span>
        </div>
      </ng-template>

      <ng-template #modalFooter>
        <div class="flex justify-end gap-3 px-4 py-3">
          <button nz-button nzType="default" class="bg-[var(--theme-border)]/5 border border-[var(--theme-border)] hover:bg-[var(--theme-border)]/20 text-[var(--theme-text-main)] rounded-xl h-10 px-5 text-xs font-semibold uppercase tracking-wider transition-all" (click)="handleCancel()">
            Cancel
          </button>
          <button nz-button [nzLoading]="isOkLoading" [disabled]="monthAlreadyExists && !editingMonthYear" class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none rounded-xl h-10 px-5 text-xs font-semibold uppercase tracking-wider shadow-[0_0_15px_var(--theme-glow)] hover:shadow-[0_0_25px_var(--theme-glow-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed" (click)="handleOk()">
            {{ editingMonthYear ? 'Save Changes' : 'Add Expense' }}
          </button>
        </div>
      </ng-template>

      <ng-container *nzModalContent>
        <form nz-form nzLayout="vertical" [formGroup]="expenseForm" class="p-2">
          <div *ngIf="monthAlreadyExists && !editingMonthYear" class="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
            <span nz-icon nzType="warning" class="text-base"></span>
            <span>An expense record for this month already exists. Please edit it from the main table instead.</span>
          </div>
          <div nz-row [nzGutter]="[16, 12]">
            <ng-container *ngFor="let field of popupFields">
              <div *ngIf="field.visible && field.key !== 'total_amount'" nz-col nzXs="24" [nzSm]="field.key === 'month_year' ? 16 : 8">
                <ng-container [ngSwitch]="field.key">
                  
                  <!-- Month & Year -->
                  <div *ngSwitchCase="'month_year'" nz-row [nzGutter]="16">
                    <div nz-col nzSpan="12">
                      <nz-form-item class="mb-0">
                        <nz-form-label nzRequired class="text-[var(--theme-text-main)]/80 font-medium">Month</nz-form-label>
                        <nz-form-control nzErrorTip="Please select month">
                          <nz-select formControlName="expense_month" class="w-full h-10 custom-dark-select">
                            <nz-option [nzValue]="1" nzLabel="January"></nz-option>
                            <nz-option [nzValue]="2" nzLabel="February"></nz-option>
                            <nz-option [nzValue]="3" nzLabel="March"></nz-option>
                            <nz-option [nzValue]="4" nzLabel="April"></nz-option>
                            <nz-option [nzValue]="5" nzLabel="May"></nz-option>
                            <nz-option [nzValue]="6" nzLabel="June"></nz-option>
                            <nz-option [nzValue]="7" nzLabel="July"></nz-option>
                            <nz-option [nzValue]="8" nzLabel="August"></nz-option>
                            <nz-option [nzValue]="9" nzLabel="September"></nz-option>
                            <nz-option [nzValue]="10" nzLabel="October"></nz-option>
                            <nz-option [nzValue]="11" nzLabel="November"></nz-option>
                            <nz-option [nzValue]="12" nzLabel="December"></nz-option>
                          </nz-select>
                        </nz-form-control>
                      </nz-form-item>
                    </div>
                    <div nz-col nzSpan="12">
                      <nz-form-item class="mb-0">
                        <nz-form-label nzRequired class="text-[var(--theme-text-main)]/80 font-medium">Year</nz-form-label>
                        <nz-form-control nzErrorTip="Please input year">
                          <nz-input-number formControlName="expense_year" [nzMin]="2000" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]"></nz-input-number>
                        </nz-form-control>
                      </nz-form-item>
                    </div>
                  </div>

                  <!-- Payment Status -->
                  <nz-form-item *ngSwitchCase="'payment_status'" class="mb-0">
                    <nz-form-label nzRequired class="text-[var(--theme-text-main)]/80 font-medium">Payment Status</nz-form-label>
                    <nz-form-control>
                      <nz-select formControlName="payment_status" class="w-full h-10 custom-dark-select">
                        <nz-option nzValue="Paid" nzLabel="Paid"></nz-option>
                        <nz-option nzValue="Pending" nzLabel="Pending"></nz-option>
                      </nz-select>
                    </nz-form-control>
                  </nz-form-item>

                  <!-- Utilities -->
                  <nz-form-item *ngSwitchCase="'utilities'" class="mb-0">
                    <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium">Utilities (Elec/Water)</nz-form-label>
                      <div class="rupee-input-wrapper relative w-full h-10 flex items-center">
                        <span class="absolute left-4 text-[var(--theme-primary)] pointer-events-none font-medium z-10">₹</span>
                        <input type="number" nz-input formControlName="utilities" placeholder="0.00" class="!pl-10 bg-transparent border border-[var(--theme-border)] rounded-xl text-[var(--theme-text-main)] h-full w-full hover:border-[var(--theme-primary)] focus:border-transparent focus:shadow-[0px_4px_20px_var(--theme-glow),_inset_0px_-2px_0px_var(--theme-primary)] transition-all" />
                      </div>
                  </nz-form-item>

                  <!-- Salaries -->
                  <nz-form-item *ngSwitchCase="'salaries'" class="mb-0">
                    <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium">Salaries & Wages</nz-form-label>
                      <div class="rupee-input-wrapper relative w-full h-10 flex items-center">
                        <span class="absolute left-4 text-[var(--theme-primary)] pointer-events-none font-medium z-10">₹</span>
                        <input type="number" nz-input formControlName="salaries" placeholder="0.00" class="!pl-10 bg-transparent border border-[var(--theme-border)] rounded-xl text-[var(--theme-text-main)] h-full w-full hover:border-[var(--theme-primary)] focus:border-transparent focus:shadow-[0px_4px_20px_var(--theme-glow),_inset_0px_-2px_0px_var(--theme-primary)] transition-all" />
                      </div>
                  </nz-form-item>

                  <!-- Maintenance -->
                  <nz-form-item *ngSwitchCase="'maintenance'" class="mb-0">
                    <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium">Repairs & Maint</nz-form-label>
                      <div class="rupee-input-wrapper relative w-full h-10 flex items-center">
                        <span class="absolute left-4 text-[var(--theme-primary)] pointer-events-none font-medium z-10">₹</span>
                        <input type="number" nz-input formControlName="maintenance" placeholder="0.00" class="!pl-10 bg-transparent border border-[var(--theme-border)] rounded-xl text-[var(--theme-text-main)] h-full w-full hover:border-[var(--theme-primary)] focus:border-transparent focus:shadow-[0px_4px_20px_var(--theme-glow),_inset_0px_-2px_0px_var(--theme-primary)] transition-all" />
                      </div>
                  </nz-form-item>

                  <!-- Consumables -->
                  <nz-form-item *ngSwitchCase="'consumables'" class="mb-0">
                    <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium">Consumables</nz-form-label>
                      <div class="rupee-input-wrapper relative w-full h-10 flex items-center">
                        <span class="absolute left-4 text-[var(--theme-primary)] pointer-events-none font-medium z-10">₹</span>
                        <input type="number" nz-input formControlName="consumables" placeholder="0.00" class="!pl-10 bg-transparent border border-[var(--theme-border)] rounded-xl text-[var(--theme-text-main)] h-full w-full hover:border-[var(--theme-primary)] focus:border-transparent focus:shadow-[0px_4px_20px_var(--theme-glow),_inset_0px_-2px_0px_var(--theme-primary)] transition-all" />
                      </div>
                  </nz-form-item>

                  <!-- Marketing -->
                  <nz-form-item *ngSwitchCase="'marketing'" class="mb-0">
                    <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium">Marketing / OTA</nz-form-label>
                      <div class="rupee-input-wrapper relative w-full h-10 flex items-center">
                        <span class="absolute left-4 text-[var(--theme-primary)] pointer-events-none font-medium z-10">₹</span>
                        <input type="number" nz-input formControlName="marketing" placeholder="0.00" class="!pl-10 bg-transparent border border-[var(--theme-border)] rounded-xl text-[var(--theme-text-main)] h-full w-full hover:border-[var(--theme-primary)] focus:border-transparent focus:shadow-[0px_4px_20px_var(--theme-glow),_inset_0px_-2px_0px_var(--theme-primary)] transition-all" />
                      </div>
                  </nz-form-item>

                  <!-- Other -->
                  <nz-form-item *ngSwitchCase="'other'" class="mb-0">
                    <nz-form-label class="text-[var(--theme-text-main)]/80 font-medium">Other Expenses</nz-form-label>
                      <div class="rupee-input-wrapper relative w-full h-10 flex items-center">
                        <span class="absolute left-4 text-[var(--theme-primary)] pointer-events-none font-medium z-10">₹</span>
                        <input type="number" nz-input formControlName="other" placeholder="0.00" class="!pl-10 bg-transparent border border-[var(--theme-border)] rounded-xl text-[var(--theme-text-main)] h-full w-full hover:border-[var(--theme-primary)] focus:border-transparent focus:shadow-[0px_4px_20px_var(--theme-glow),_inset_0px_-2px_0px_var(--theme-primary)] transition-all" />
                      </div>
                  </nz-form-item>

                </ng-container>
              </div>
            </ng-container>
          </div>

          <!-- Individual Expenses Section -->
          <div nz-row [nzGutter]="16" class="border-t border-[var(--theme-border)] my-3 pt-3">
            <div nz-col nzSpan="24">
              <div class="flex items-center justify-between mb-3">
                <span class="text-[var(--theme-text-main)] opacity-80 font-medium">Individual Expenses</span>
                <button type="button" [disabled]="monthAlreadyExists && !editingMonthYear" class="bg-transparent border border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-black font-semibold text-xs rounded-lg px-3 py-1 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--theme-primary)]" (click)="showIndividualExpenseModal()">
                  <span nz-icon nzType="plus"></span> Add Item
                </button>
              </div>
              
              <div *ngIf="individualExpenses.length === 0" class="text-center py-4 text-[var(--theme-text-muted)] text-xs border border-dashed border-[var(--theme-border)] rounded-xl">
                No individual expenses added for this month yet.
              </div>
              
              <div *ngIf="individualExpenses.length > 0" class="flex flex-col gap-2">
                <div *ngFor="let item of individualExpenses; let i = index" class="flex items-center justify-between p-3 border border-[var(--theme-border)] rounded-xl bg-black/20">
                  <div class="flex flex-col gap-1">
                    <span class="text-[var(--theme-text-main)] font-semibold text-sm">{{ item.description }}</span>
                    <div class="flex items-center gap-2 text-xs text-[var(--theme-text-muted)]">
                      <span class="uppercase tracking-widest font-bold">{{ item.category }}</span>
                      <span>•</span>
                      <span [ngClass]="item.payment_status === 'Paid' ? 'text-emerald-400' : 'text-amber-400'">{{ item.payment_status }}</span>
                      <span *ngIf="item.files && item.files.length" class="text-[var(--theme-primary)] flex items-center gap-1 cursor-pointer hover:text-amber-300 transition-colors" (click)="viewIndividualAttachments(item)">
                        <span nz-icon nzType="paper-clip"></span> {{ item.files.length }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-4">
                    <span class="text-rose-500 font-bold">₹{{ item.amount | number }}</span>
                    <div class="flex gap-1">
                      <button type="button" class="text-amber-500 hover:text-amber-400 p-1 bg-transparent border-none cursor-pointer outline-none focus:outline-none hover:bg-transparent active:bg-transparent" (click)="editIndividualExpense(i)"><span nz-icon nzType="edit"></span></button>
                      <button type="button" class="text-rose-500 hover:text-rose-400 p-1 bg-transparent border-none cursor-pointer outline-none focus:outline-none hover:bg-transparent active:bg-transparent" (click)="removeIndividualExpense(i)"><span nz-icon nzType="delete"></span></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Description (Common) -->
          <div nz-row [nzGutter]="16" class="border-t border-[var(--theme-border)] my-3 pt-3">
            <div nz-col nzSpan="24">
              <nz-form-item class="mb-1">
                <nz-form-label class="text-[var(--theme-text-main)] opacity-80 font-medium">Description</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="description" placeholder="Optional details..." class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]" />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <!-- Receipts Upload -->
          <div nz-row [nzGutter]="16" class="border-t border-[var(--theme-border)] my-3 pt-3">
            <div nz-col nzSpan="24">
              <nz-form-item class="mb-1">
                <nz-form-label class="text-[var(--theme-text-main)] opacity-80 font-medium">Expense Receipts (Optional)</nz-form-label>
                <nz-form-control>
                  <nz-upload
                    nzType="drag"
                    [nzMultiple]="true"
                    nzAccept="image/*,application/pdf"
                    [nzBeforeUpload]="beforeUpload"
                    [nzPreview]="handlePreview"
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

    <!-- Add Individual Expense Modal -->
    <nz-modal [(nzVisible)]="isIndividualExpenseModalVisible" 
              nzTitle="Add Individual Expense" 
              (nzOnCancel)="handleIndividualExpenseCancel()" 
              [nzFooter]="individualExpenseFooter"
              [nzWidth]="600">
      
      <ng-template #individualExpenseFooter>
        <div class="flex justify-end gap-3 px-4 py-3">
          <button nz-button nzType="default" class="bg-[var(--theme-border)]/5 border border-[var(--theme-border)] hover:bg-[var(--theme-border)]/20 text-[var(--theme-text-main)] rounded-xl h-10 px-5 text-xs font-semibold uppercase tracking-wider transition-all" (click)="handleIndividualExpenseCancel()">
            Cancel
          </button>
          <button nz-button [nzLoading]="isSavingStandalone" class="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-dark)] text-black border-none rounded-xl h-10 px-5 text-xs font-semibold uppercase tracking-wider shadow-[0_0_15px_var(--theme-glow)] hover:shadow-[0_0_25px_var(--theme-glow-hover)] transition-all" (click)="saveIndividualExpense()">
            Save Item
          </button>
        </div>
      </ng-template>

      <ng-container *nzModalContent>
        <form nz-form nzLayout="vertical" [formGroup]="individualExpenseForm" class="p-2">
          <div *ngIf="isStandaloneIndividual" nz-row [nzGutter]="16" class="mb-3">
            <div nz-col nzSpan="12">
              <nz-form-item class="mb-0">
                <nz-form-label nzRequired class="text-[var(--theme-text-main)] opacity-80 font-medium">Month</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="expense_month" class="w-full h-10 custom-dark-select">
                    <nz-option [nzValue]="1" nzLabel="January"></nz-option>
                    <nz-option [nzValue]="2" nzLabel="February"></nz-option>
                    <nz-option [nzValue]="3" nzLabel="March"></nz-option>
                    <nz-option [nzValue]="4" nzLabel="April"></nz-option>
                    <nz-option [nzValue]="5" nzLabel="May"></nz-option>
                    <nz-option [nzValue]="6" nzLabel="June"></nz-option>
                    <nz-option [nzValue]="7" nzLabel="July"></nz-option>
                    <nz-option [nzValue]="8" nzLabel="August"></nz-option>
                    <nz-option [nzValue]="9" nzLabel="September"></nz-option>
                    <nz-option [nzValue]="10" nzLabel="October"></nz-option>
                    <nz-option [nzValue]="11" nzLabel="November"></nz-option>
                    <nz-option [nzValue]="12" nzLabel="December"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col nzSpan="12">
              <nz-form-item class="mb-0">
                <nz-form-label nzRequired class="text-[var(--theme-text-main)] opacity-80 font-medium">Year</nz-form-label>
                <nz-form-control>
                  <nz-input-number formControlName="expense_year" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]"></nz-input-number>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <nz-form-item class="mb-3">
            <nz-form-label nzRequired class="text-[var(--theme-text-main)] opacity-80 font-medium">Expense Name / Description</nz-form-label>
            <nz-form-control nzErrorTip="Please enter a description">
              <input nz-input formControlName="description" placeholder="e.g. Plumber Repair" class="w-full h-10 rounded-xl bg-transparent text-[var(--theme-text-main)]" />
            </nz-form-control>
          </nz-form-item>

          <div nz-row [nzGutter]="16">
            <div nz-col nzSpan="12">
              <nz-form-item class="mb-3">
                <nz-form-label nzRequired class="text-[var(--theme-text-main)] opacity-80 font-medium">Amount</nz-form-label>
                <nz-form-control nzErrorTip="Required">
                  <div class="rupee-input-wrapper relative w-full h-10 flex items-center">
                    <span class="absolute left-4 text-[var(--theme-primary)] pointer-events-none font-medium z-10">₹</span>
                    <input type="number" nz-input formControlName="amount" placeholder="0.00" class="!pl-10 bg-transparent border border-[var(--theme-border)] rounded-xl text-[var(--theme-text-main)] h-full w-full hover:border-[var(--theme-primary)] focus:border-transparent transition-all" />
                  </div>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col nzSpan="12">
              <nz-form-item class="mb-3">
                <nz-form-label class="text-[var(--theme-text-main)] opacity-80 font-medium">Category</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="category" class="w-full h-10 custom-dark-select">
                    <nz-option nzValue="Utilities" nzLabel="Utilities"></nz-option>
                    <nz-option nzValue="Salaries" nzLabel="Salaries"></nz-option>
                    <nz-option nzValue="Maintenance" nzLabel="Maintenance"></nz-option>
                    <nz-option nzValue="Consumables" nzLabel="Consumables"></nz-option>
                    <nz-option nzValue="Marketing" nzLabel="Marketing"></nz-option>
                    <nz-option nzValue="Other" nzLabel="Other"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
          
          <nz-form-item class="mb-3">
            <nz-form-label class="text-[var(--theme-text-main)] opacity-80 font-medium">Payment Status</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="payment_status" class="w-full h-10 custom-dark-select">
                <nz-option nzValue="Paid" nzLabel="Paid"></nz-option>
                <nz-option nzValue="Pending" nzLabel="Pending"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <!-- Individual Receipt Upload -->
          <nz-form-item class="mb-0 mt-2 border-t border-[var(--theme-border)] pt-3">
            <nz-form-label class="text-[var(--theme-text-main)] opacity-80 font-medium">Specific Receipt / Invoice (Optional)</nz-form-label>
            <nz-form-control>
              <nz-upload
                nzType="drag"
                [nzMultiple]="true"
                nzAccept="image/*,application/pdf"
                [nzBeforeUpload]="beforeIndividualUpload"
                [nzPreview]="handlePreview"
                [(nzFileList)]="individualFileList"
                class="dark-theme-upload">
                <p class="ant-upload-drag-icon">
                  <span nz-icon nzType="camera" class="text-[var(--theme-primary)] text-2xl"></span>
                </p>
                <p class="ant-upload-text text-[var(--theme-text-main)] font-medium mt-1">Upload Receipt</p>
              </nz-upload>
            </nz-form-control>
          </nz-form-item>
        </form>
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
  `
})
export class ExpensesComponent implements OnInit {
  expenses: any[] = [];
  groupedExpenses: any[] = [];
  loading = true;

  columns: ColumnConfig[] = [...DEFAULT_EXPENSE_COLUMNS];
  popupFields: ColumnConfig[] = [...DEFAULT_EXPENSE_COLUMNS];

  // Computed statistics
  get totalOutflowYtd(): number {
    return this.filteredGroupedExpenses.reduce((sum, e) => sum + Number(e.total_amount || 0), 0);
  }

  get highestOutflowMonth(): string {
    if (this.filteredGroupedExpenses.length === 0) return 'N/A';
    const highest = [...this.filteredGroupedExpenses].sort((a, b) => Number(b.total_amount || 0) - Number(a.total_amount || 0))[0];
    return `${this.getMonthName(highest.expense_month)} ${highest.expense_year}`;
  }

  get averageMonthlyOutflow(): number {
    return this.filteredGroupedExpenses.length > 0 
      ? Math.round(this.totalOutflowYtd / this.filteredGroupedExpenses.length) 
      : 0;
  }

  get pendingLiabilities(): number {
    return this.filteredGroupedExpenses
      .filter(e => e.payment_status !== 'Paid')
      .reduce((sum, e) => sum + Number(e.total_amount || 0), 0);
  }

  get expenseBreakdown() {
    let util = 0, sal = 0, maint = 0, cons = 0, mark = 0, oth = 0;
    this.filteredGroupedExpenses.forEach(e => {
      util += Number(e.utilities || 0);
      sal += Number(e.salaries || 0);
      maint += Number(e.maintenance || 0);
      cons += Number(e.consumables || 0);
      mark += Number(e.marketing || 0);
      oth += Number(e.other || 0);
    });
    const total = util + sal + maint + cons + mark + oth || 1;
    return [
      { name: 'Salaries', amount: sal, pct: Math.round((sal / total) * 100), color: 'var(--theme-primary)' },
      { name: 'Utilities', amount: util, pct: Math.round((util / total) * 100), color: '#38bdf8' },
      { name: 'Maintenance', amount: maint, pct: Math.round((maint / total) * 100), color: '#f59e0b' },
      { name: 'Consumables', amount: cons, pct: Math.round((cons / total) * 100), color: '#ec4899' },
      { name: 'Marketing', amount: mark, pct: Math.round((mark / total) * 100), color: '#a855f7' },
      { name: 'Other', amount: oth, pct: Math.round((oth / total) * 100), color: '#737373' }
    ].sort((a,b) => b.amount - a.amount);
  }

  // Filter variables
  expenseFilterYear: number | null = null;
  expenseFilterMonth: number | null = null;
  expenseFilterStatus = '';
  expenseMinAmount: number | null = null;

  get filteredGroupedExpenses(): any[] {
    return this.groupedExpenses.filter(e => {
      let matchesYear = true;
      if (this.expenseFilterYear !== null && this.expenseFilterYear !== undefined) {
        matchesYear = e.expense_year === this.expenseFilterYear;
      }

      let matchesMonth = true;
      if (this.expenseFilterMonth !== null && this.expenseFilterMonth !== undefined) {
        matchesMonth = e.expense_month === this.expenseFilterMonth;
      }

      let matchesStatus = true;
      if (this.expenseFilterStatus) {
        matchesStatus = e.payment_status === this.expenseFilterStatus;
      }

      let matchesAmount = true;
      if (this.expenseMinAmount !== null && this.expenseMinAmount !== undefined) {
        matchesAmount = e.total_amount >= this.expenseMinAmount;
      }

      return matchesYear && matchesMonth && matchesStatus && matchesAmount;
    });
  }

  resetExpenseFilters(): void {
    this.expenseFilterYear = null;
    this.expenseFilterMonth = null;
    this.expenseFilterStatus = '';
    this.expenseMinAmount = null;
  }

  // Modal State
  isModalVisible = false;
  isOkLoading = false;
  monthAlreadyExists = false;
  expenseForm: FormGroup;
  editingMonthYear: { month: number, year: number } | null = null;
  fileList: NzUploadFile[] = [];
  isUploadingFiles = false;

  checkDuplicateMonth(): void {
    if (this.editingMonthYear) {
      this.monthAlreadyExists = false;
      return;
    }

    const month = this.expenseForm?.get('expense_month')?.value;
    const year = this.expenseForm?.get('expense_year')?.value;

    if (month && year && this.groupedExpenses) {
      this.monthAlreadyExists = this.groupedExpenses.some(g => 
        Number(g.expense_month) === Number(month) && 
        Number(g.expense_year) === Number(year)
      );

      const controlsToToggle = ['payment_status', 'description', 'utilities', 'salaries', 'maintenance', 'consumables', 'marketing', 'other'];

      if (this.monthAlreadyExists) {
        controlsToToggle.forEach(c => this.expenseForm.get(c)?.disable({ emitEvent: false }));
      } else {
        controlsToToggle.forEach(c => this.expenseForm.get(c)?.enable({ emitEvent: false }));
      }
    }
  }

  // Individual Expense State
  isIndividualExpenseModalVisible = false;
  isStandaloneIndividual = false;
  isSavingStandalone = false;
  individualExpenseForm: FormGroup;
  individualExpenses: any[] = [];
  individualFileList: NzUploadFile[] = [];

  // Attachment Viewer State
  isAttachmentModalVisible = false;
  isLoadingAttachments = false;
  attachmentUrls: string[] = [];

  onImageError(event: any) {
    // If the image fails to load, replace it with a broken image icon placeholder
    event.target.style.display = 'none';
    event.target.parentElement.innerHTML += '<div class="flex flex-col items-center justify-center text-rose-500/70 p-4"><span class="anticon anticon-disconnect text-4xl mb-2"></span><span class="text-xs font-bold text-center">Access Denied<br/>or Broken Link</span></div>';
  }

  beforeUpload = (file: NzUploadFile): boolean => {
    this.fileList = this.fileList.concat(file);
    return false;
  };

  beforeIndividualUpload = (file: NzUploadFile): boolean => {
    this.individualFileList = this.individualFileList.concat(file);
    return false;
  };

  getBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  handlePreview = async (file: NzUploadFile): Promise<void> => {
    let previewUrl = file.url || file['preview'];
    
    if (!previewUrl && file.originFileObj) {
      previewUrl = await this.getBase64(file.originFileObj as File);
      file['preview'] = previewUrl;
    }
    
    if (previewUrl && typeof previewUrl === 'string') {
      if (!previewUrl.startsWith('blob:') && !previewUrl.startsWith('data:')) {
        try {
          const signedUrl = await this.supabase.getSignedDocumentUrl(previewUrl);
          if (signedUrl) {
            window.open(signedUrl, '_blank');
            return;
          }
        } catch (e) {
          console.error('Failed to generate preview URL', e);
          this.message.error('Failed to open file. The link might be expired or invalid.');
          return;
        }
      } else {
        // Local preview
        window.open(previewUrl, '_blank');
      }
    }
  };

  async viewIndividualAttachments(item: any): Promise<void> {
    if (item.files && item.files.length > 0) {
      const dbPaths: string[] = [];
      const localPaths: string[] = [];

      for (const f of item.files) {
        if (f.url && !f.url.startsWith('blob:') && !f.url.startsWith('data:')) {
          dbPaths.push(f.url);
        } else {
          let previewUrl = f.url || (f as any)['preview'];
          if (!previewUrl && f.originFileObj) {
            previewUrl = await this.getBase64(f.originFileObj as File);
            (f as any)['preview'] = previewUrl;
          } else if (!previewUrl && (f instanceof File || f instanceof Blob)) {
            previewUrl = await this.getBase64(f as File);
            (f as any)['preview'] = previewUrl;
          }
          if (previewUrl) localPaths.push(previewUrl as string);
        }
      }

      if (dbPaths.length > 0) {
        this.viewAttachments(dbPaths);
      }
      
      for (const local of localPaths) {
        window.open(local, '_blank');
      }
    }
  }



  showIndividualExpenseModal(): void {
    this.isStandaloneIndividual = false;
    this.individualExpenseForm.reset({ payment_status: 'Paid', category: 'Maintenance' });
    this.individualFileList = [];
    this.isIndividualExpenseModalVisible = true;
  }

  showStandaloneIndividualExpenseModal(): void {
    this.isStandaloneIndividual = true;
    const currentDate = new Date();
    let prevMonth = currentDate.getMonth();
    let prevYear = currentDate.getFullYear();
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    this.individualExpenseForm.reset({ 
      payment_status: 'Paid', 
      category: 'Maintenance',
      expense_month: prevMonth,
      expense_year: prevYear
    });
    this.individualFileList = [];
    this.isIndividualExpenseModalVisible = true;
  }

  handleIndividualExpenseCancel(): void {
    this.isIndividualExpenseModalVisible = false;
  }

  async saveIndividualExpense(): Promise<void> {
    if (this.individualExpenseForm.valid) {
      const data = this.individualExpenseForm.value;
      
      if (this.isStandaloneIndividual) {
        this.isSavingStandalone = true;
        const profile = this.supabase.currentProfile;
        const client = this.supabase.getClient();
        
        if (!profile || !profile.hotel_id) {
          this.message.error('No hotel context found');
          this.isSavingStandalone = false;
          return;
        }

        const payload = {
          hotel_id: profile.hotel_id,
          expense_month: data.expense_month,
          expense_year: data.expense_year,
          category: data.category,
          amount: data.amount,
          payment_status: data.payment_status,
          description: `INDIVIDUAL::${data.description}`
        };

        try {
          const { data: insertedData, error } = await client.from('monthly_expenses').insert([payload]).select();
          if (error) throw error;
          
          if (this.individualFileList.length > 0 && insertedData && insertedData.length > 0) {
            const insertedRow = insertedData[0];
            const indPaths: string[] = [];
            let uploadCount = 0;
            for (const file of this.individualFileList) {
              if (!file.url || file.url.startsWith('blob:')) {
                try {
                  const actualFile = (file as any).originFileObj || file;
                  const path = await this.supabase.uploadHotelDocument(actualFile, 'expenses', insertedRow.id);
                  if (path) { indPaths.push(path); uploadCount++; }
                } catch (e) {
                  console.error('Failed to upload file', file.name, e);
                }
              }
            }
            if (indPaths.length > 0) {
              await client.from('monthly_expenses').update({ receipts: indPaths }).eq('id', insertedRow.id);
            }
          }
          this.message.success('Individual expense saved successfully!');
          this.isIndividualExpenseModalVisible = false;
          await this.loadExpenses();
        } catch (e: any) {
          this.message.error(e.message || 'Failed to save individual expense.');
        } finally {
          this.isSavingStandalone = false;
        }
      } else {
        this.individualExpenses.push({
          id: 'temp_' + Date.now(),
          ...data,
          files: [...this.individualFileList]
        });
        this.isIndividualExpenseModalVisible = false;
        this.message.success('Individual expense added to pending list.');
      }
    } else {
      Object.values(this.individualExpenseForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  removeIndividualExpense(index: number): void {
    this.individualExpenses.splice(index, 1);
  }

  editIndividualExpense(index: number): void {
    const item = this.individualExpenses[index];
    this.individualExpenseForm.patchValue(item);
    this.individualFileList = item.files || [];
    this.removeIndividualExpense(index);
    this.isIndividualExpenseModalVisible = true;
  }

  constructor(
    private supabase: SupabaseService,
    private fb: FormBuilder,
    private message: NzMessageService
  ) {
    const currentDate = new Date();
    let prevMonth = currentDate.getMonth(); // 0-indexed, meaning previous month (e.g. June (5) => May (5 in 1-indexed))
    let prevYear = currentDate.getFullYear();
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    this.expenseForm = this.fb.group({
      expense_month: [prevMonth, [Validators.required, Validators.min(1), Validators.max(12)]],
      expense_year: [prevYear, [Validators.required, Validators.min(2000)]],
      payment_status: ['Paid', Validators.required],
      description: [''],
      // Category fields
      utilities: [null, [Validators.min(0)]],
      salaries: [null, [Validators.min(0)]],
      maintenance: [null, [Validators.min(0)]],
      consumables: [null, [Validators.min(0)]],
      marketing: [null, [Validators.min(0)]],
      other: [null, [Validators.min(0)]]
    });

    this.individualExpenseForm = this.fb.group({
      description: ['', [Validators.required]],
      category: ['Maintenance'],
      amount: [null, [Validators.required, Validators.min(1)]],
      payment_status: ['Paid'],
      expense_month: [null],
      expense_year: [null]
    });

    this.supabase.profile.subscribe(profile => {
      if (profile) {
        if (profile.column_config && profile.column_config.expenses) {
          const config = profile.column_config.expenses;
          if (Array.isArray(config)) {
            this.applySavedColumns(config);
            this.applySavedPopupFields(config);
          } else {
            if (config.table) this.applySavedColumns(config.table);
            if (config.popup) this.applySavedPopupFields(config.popup);
          }
        } else {
          const local = localStorage.getItem('expenses_column_config');
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
      localStorage.setItem('expenses_column_config', JSON.stringify(combined));
      return;
    }
    
    const currentConfig = profile.column_config || {};
    const newConfig = {
      ...currentConfig,
      expenses: combined
    };
    
    localStorage.setItem('expenses_column_config', JSON.stringify(combined));
    
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
    this.expenseForm.get('expense_month')?.valueChanges.subscribe(() => this.checkDuplicateMonth());
    this.expenseForm.get('expense_year')?.valueChanges.subscribe(() => this.checkDuplicateMonth());
    await this.loadExpenses();
  }

  async loadExpenses() {
    this.loading = true;
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('monthly_expenses')
      .select('*')
      .order('expense_year', { ascending: false })
      .order('expense_month', { ascending: false });
    
    if (data) {
      this.expenses = data;
      this.groupExpensesByMonth(data);
    }
    this.loading = false;
  }

  groupExpensesByMonth(rawExpenses: any[]) {
    const groups: { [key: string]: any } = {};

    rawExpenses.forEach(exp => {
      const key = `${exp.expense_year}-${exp.expense_month}`;
      if (!groups[key]) {
        groups[key] = {
          expense_month: exp.expense_month,
          expense_year: exp.expense_year,
          payment_status: exp.payment_status,
          description: '',
          utilities: 0,
          salaries: 0,
          maintenance: 0,
          consumables: 0,
          marketing: 0,
          other: 0,
          total_amount: 0,
          ids: [],
          receipts: [],
          individual_items: []
        };
      }
      
      groups[key].ids.push(exp.id);
      
      if (!groups[key].main_receipts) groups[key].main_receipts = [];

      const isIndividual = exp.description && exp.description.startsWith('INDIVIDUAL::');
      let cleanDesc = exp.description || '';

      if (!isIndividual && exp.receipts && Array.isArray(exp.receipts)) {
        exp.receipts.forEach((r: string) => {
          if (!groups[key].main_receipts.includes(r)) groups[key].main_receipts.push(r);
          if (!groups[key].receipts.includes(r)) groups[key].receipts.push(r);
        });
      } else if (isIndividual && exp.receipts && Array.isArray(exp.receipts)) {
        exp.receipts.forEach((r: string) => {
          if (!groups[key].receipts.includes(r)) groups[key].receipts.push(r);
        });
      }

      if (exp.payment_status === 'Pending') {
        groups[key].payment_status = 'Pending';
      }

      if (isIndividual) {
        cleanDesc = exp.description.replace('INDIVIDUAL::', '');
        groups[key].individual_items.push({
          description: cleanDesc,
          category: exp.category,
          amount: exp.amount,
          payment_status: exp.payment_status,
          files: exp.receipts && Array.isArray(exp.receipts) ? exp.receipts.map((r: string, idx: number) => {
            const parts = r.split('/');
            const name = parts[parts.length - 1] || `Receipt_${idx + 1}`;
            return { uid: '-1-' + idx, url: r, name: name, status: 'done' };
          }) : [],
          id: exp.id
        });
      } else {
        const catKey = exp.category.toLowerCase();
        if (catKey === 'utilities') groups[key].utilities += exp.amount;
        else if (catKey === 'salaries') groups[key].salaries += exp.amount;
        else if (catKey === 'maintenance') groups[key].maintenance += exp.amount;
        else if (catKey === 'consumables') groups[key].consumables += exp.amount;
        else if (catKey === 'marketing') groups[key].marketing += exp.amount;
        else if (catKey === 'other') groups[key].other += exp.amount;
      }

      groups[key].total_amount += exp.amount;
      
      if (cleanDesc && !groups[key].description.includes(cleanDesc)) {
        groups[key].description = groups[key].description 
          ? `${groups[key].description}, ${cleanDesc}` 
          : cleanDesc;
      }
    });

    this.groupedExpenses = Object.values(groups);
  }

  getMonthName(monthNum: number): string {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[monthNum - 1] || monthNum.toString();
  }

  openAddModal(): void {
    this.editingMonthYear = null;
    this.fileList = [];
    this.individualExpenses = [];
    const currentDate = new Date();
    let prevMonth = currentDate.getMonth();
    let prevYear = currentDate.getFullYear();
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    this.expenseForm.reset({
      expense_month: prevMonth,
      expense_year: prevYear,
      payment_status: 'Paid',
      description: '',
      utilities: null,
      salaries: null,
      maintenance: null,
      consumables: null,
      marketing: null,
      other: null
    });
    this.expenseForm.get('expense_month')?.enable();
    this.expenseForm.get('expense_year')?.enable();
    this.checkDuplicateMonth();
    this.isModalVisible = true;
  }

  openEditModal(data: any): void {
    this.editingMonthYear = { month: data.expense_month, year: data.expense_year };
    
    // Load existing main receipts into the file uploader
    this.fileList = data.main_receipts && Array.isArray(data.main_receipts) 
      ? data.main_receipts.map((url: string, index: number) => {
          const parts = url.split('/');
          const name = parts[parts.length - 1] || `Receipt_${index + 1}`;
          return {
            uid: '-1-' + index,
            name: name,
            status: 'done',
            url: url
          };
        })
      : [];
    // Deep clone the individual items to prevent mutating the table data before save
    this.individualExpenses = data.individual_items ? JSON.parse(JSON.stringify(data.individual_items)) : [];
    
    // Filter out individual item descriptions from the main form description
    let mainDesc = data.description || '';
    if (data.individual_items && data.individual_items.length > 0) {
      data.individual_items.forEach((item: any) => {
        mainDesc = mainDesc.replace(item.description, '').replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim();
      });
    }

    this.expenseForm.reset({
      expense_month: data.expense_month,
      expense_year: data.expense_year,
      payment_status: data.payment_status,
      description: mainDesc,
      utilities: data.utilities || null,
      salaries: data.salaries || null,
      maintenance: data.maintenance || null,
      consumables: data.consumables || null,
      marketing: data.marketing || null,
      other: data.other || null
    });
    this.checkDuplicateMonth();
    this.isModalVisible = true;
  }

  handleCancel(): void {
    this.isModalVisible = false;
    this.editingMonthYear = null;
  }

  async handleOk(): Promise<void> {
    // Force date validation
    this.expenseForm.get('expense_month')?.markAsDirty();
    this.expenseForm.get('expense_month')?.updateValueAndValidity();
    this.expenseForm.get('expense_year')?.markAsDirty();
    this.expenseForm.get('expense_year')?.updateValueAndValidity();

    if (!this.expenseForm.get('expense_month')?.valid || !this.expenseForm.get('expense_year')?.valid) {
      return;
    }

    const formData = this.expenseForm.getRawValue(); // Get values including disabled fields
    const profile = this.supabase.currentProfile;
    const client = this.supabase.getClient();

    if (!profile || !profile.hotel_id) {
      this.message.error('No hotel context found');
      return;
    }

    this.isOkLoading = true;
    try {
      if (this.editingMonthYear) {
        // Delete all existing monthly_expenses matching this month and year for this hotel
        const { error: deleteError } = await client
          .from('monthly_expenses')
          .delete()
          .eq('hotel_id', profile.hotel_id)
          .eq('expense_month', this.editingMonthYear.month)
          .eq('expense_year', this.editingMonthYear.year);

        if (deleteError) throw deleteError;
      } else {
        // Add Mode: Check if this month/year already exists
        const monthExists = this.groupedExpenses.some(g => 
          Number(g.expense_month) === Number(formData.expense_month) && 
          Number(g.expense_year) === Number(formData.expense_year)
        );

        if (monthExists) {
          this.message.error(`An expense record for ${this.getMonthName(formData.expense_month)} ${formData.expense_year} already exists. Please edit the existing entry instead.`);
          this.isOkLoading = false;
          return;
        }
      }

      // Add mode validation & bulk save (inserts new non-zero categories)
      const categoriesMap = [
        { key: 'utilities', label: 'Utilities' },
        { key: 'salaries', label: 'Salaries' },
        { key: 'maintenance', label: 'Maintenance' },
        { key: 'consumables', label: 'Consumables' },
        { key: 'marketing', label: 'Marketing' },
        { key: 'other', label: 'Other' }
      ];

      const payloads = [];
      for (const cat of categoriesMap) {
        const val = formData[cat.key];
        if (val !== null && val !== undefined && val > 0) {
          payloads.push({
            hotel_id: profile.hotel_id,
            expense_month: formData.expense_month,
            expense_year: formData.expense_year,
            category: cat.label,
            amount: val,
            payment_status: formData.payment_status,
            description: formData.description
          });
        }
      }

      // Add Individual Expenses
      for (const ind of this.individualExpenses) {
        payloads.push({
          hotel_id: profile.hotel_id,
          expense_month: formData.expense_month,
          expense_year: formData.expense_year,
          category: ind.category,
          amount: ind.amount,
          payment_status: ind.payment_status,
          description: `INDIVIDUAL::${ind.description}`
        });
      }

      if (payloads.length === 0) {
        this.message.error('Please enter amount for at least one category or add an individual expense.');
        this.isOkLoading = false;
        return;
      }

      // If user uploaded main files, but there are no fixed categories, let's create a dummy "Other" category with amount 0 to hold the main receipts
      const hasFixedCategories = payloads.some(p => !p.description || !p.description.startsWith('INDIVIDUAL::'));
      if (!hasFixedCategories && this.fileList.length > 0) {
        payloads.push({
          hotel_id: profile.hotel_id,
          expense_month: formData.expense_month,
          expense_year: formData.expense_year,
          category: 'Other',
          amount: 0,
          payment_status: formData.payment_status,
          description: formData.description || 'General Attachments'
        });
      }

      const { data: insertedData, error: insertError } = await client.from('monthly_expenses').insert(payloads).select();
      if (insertError) throw insertError;

      // Handle File Uploads
      if (insertedData && insertedData.length > 0) {
        this.isUploadingFiles = true;
        let uploadCount = 0;
        const batchRecordId = insertedData[0].id;
        
        // 1. Upload Main Files (Fixed Categories)
        const fixedRowIds = insertedData.filter((r: any) => !r.description || !r.description.startsWith('INDIVIDUAL::')).map((r: any) => r.id);
        
        if (this.fileList.length > 0 && fixedRowIds.length > 0) {
          const mainPaths: string[] = [];
          for (const file of this.fileList) {
            if (!file.url || file.url.startsWith('blob:')) {
              try {
                const actualFile = (file as any).originFileObj || file;
                const path = await this.supabase.uploadHotelDocument(actualFile, 'expenses', batchRecordId);
                if (path) { mainPaths.push(path); uploadCount++; }
              } catch (e) {
                console.error('Failed to upload main file', file.name, e);
              }
            } else {
              // Preserve existing URL
              mainPaths.push(file.url);
            }
          }
          if (mainPaths.length > 0) {
            await client.from('monthly_expenses').update({ receipts: mainPaths }).in('id', fixedRowIds);
          }
        }

        // 2. Upload Individual Files
        for (const ind of this.individualExpenses) {
          if (ind.files && ind.files.length > 0) {
            // Match the inserted row by description and amount (we assume name+amount is unique enough per save batch)
            const targetDesc = `INDIVIDUAL::${ind.description}`;
            const insertedRow = insertedData.find((r: any) => r.description === targetDesc && Number(r.amount) === Number(ind.amount));
            
            if (insertedRow) {
              const indPaths: string[] = [];
              // Preserve existing URLs if editing
              ind.files.forEach((f: any) => { 
                if (f.url && !f.url.startsWith('blob:')) indPaths.push(f.url); 
              });

              for (const file of ind.files) {
                if (!file.url || file.url.startsWith('blob:')) {
                  try {
                    const actualFile = file.originFileObj || file;
                    const path = await this.supabase.uploadHotelDocument(actualFile, 'expenses', insertedRow.id);
                    if (path) { indPaths.push(path); uploadCount++; }
                  } catch (e) {
                    console.error('Failed to upload individual file', file.name, e);
                  }
                }
              }
              if (indPaths.length > 0) {
                await client.from('monthly_expenses').update({ receipts: indPaths }).eq('id', insertedRow.id);
              }
            }
          }
        }
        
        if (uploadCount > 0) {
          this.message.success(`Uploaded ${uploadCount} receipt(s) successfully.`);
        }
        this.isUploadingFiles = false;
      }

      this.message.success(this.editingMonthYear ? 'Expense record updated successfully!' : 'Expense records added successfully!');
      this.isModalVisible = false;
      this.editingMonthYear = null;
      await this.loadExpenses();
    } catch (error: any) {
      console.error('Failed to save expense', error);
      this.message.error(error.message || 'Failed to save expense');
    } finally {
      this.isOkLoading = false;
    }
  }

  async deleteExpenseGroup(data: any) {
    try {
      const client = this.supabase.getClient();
      const profile = this.supabase.currentProfile;
      if (!profile || !profile.hotel_id) throw new Error('No hotel context');

      const { error } = await client
        .from('monthly_expenses')
        .delete()
        .eq('hotel_id', profile.hotel_id)
        .eq('expense_month', data.expense_month)
        .eq('expense_year', data.expense_year);

      if (error) throw error;
      this.message.success('Expense record deleted successfully!');
      await this.loadExpenses();
    } catch (error: any) {
      this.message.error(error.message || 'Failed to delete expense');
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
}
