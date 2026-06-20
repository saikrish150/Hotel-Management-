import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { ThemeService } from '../../core/services/theme.service';
import { Subscription } from 'rxjs';

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
    NzUploadModule,
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
  templateUrl: './expenses.component.html'
})
export class ExpensesComponent implements OnInit, OnDestroy {
  expenses: any[] = [];
  groupedExpenses: any[] = [];
  loading = true;
  totalRevenueYtd = 0;
  categoryPercentages: Array<{ name: string; amount: number; percentage: number; color: string }> = [];

  columns: ColumnConfig[] = [...DEFAULT_EXPENSE_COLUMNS];
  popupFields: ColumnConfig[] = [...DEFAULT_EXPENSE_COLUMNS];

  // Chart properties
  public fixedVsVariableChartOptions: Partial<ApexOptions> | null = null;
  public clearanceChartOptions: Partial<ApexOptions> | null = null;
  
  chartTheme: 'dark' | 'light' = 'dark';
  primaryColor = '#d4af37';
  private themeSubscription?: Subscription;

  // Computed statistics
  get totalOutflowYtd(): number {
    return this.filteredGroupedExpenses.reduce((sum, e) => sum + Number(e.total_amount || 0), 0);
  }

  get previousMonthExpense(): number {
    if (this.groupedExpenses.length === 0) return 0;
    const sorted = [...this.groupedExpenses].sort((a, b) => {
      if (b.expense_year !== a.expense_year) return b.expense_year - a.expense_year;
      return b.expense_month - a.expense_month;
    });
    return sorted[0] ? Number(sorted[0].total_amount || 0) : 0;
  }

  get previousMonthLabel(): string {
    if (this.groupedExpenses.length === 0) return 'Prev Month';
    const sorted = [...this.groupedExpenses].sort((a, b) => {
      if (b.expense_year !== a.expense_year) return b.expense_year - a.expense_year;
      return b.expense_month - a.expense_month;
    });
    const item = sorted[0];
    if (!item) return 'Prev Month';
    return `Prev Month (${this.getMonthName(item.expense_month)} ${item.expense_year})`;
  }

  get clearanceRateText(): string {
    const total = this.totalOutflowYtd;
    const pending = this.pendingLiabilities;
    const paid = total > pending ? total - pending : 0;
    return total > 0 ? Math.round((paid / total) * 100) + '% clearance' : '100% clearance';
  }

  get breakEvenOccupancyRate(): number {
    const expenses = this.totalOutflowYtd;
    if (expenses === 0 || this.totalRevenueYtd === 0) return 0;
    // Derive ADR from real revenue data
    const profile = this.supabase.currentProfile;
    const roomConfig = profile?.room_config || {};
    let totalRooms = 0;
    Object.keys(roomConfig).forEach(key => {
      if (key !== '_order') {
        const val = roomConfig[key];
        totalRooms += Array.isArray(val) ? val.length : Number(val || 0);
      }
    });
    if (totalRooms === 0) totalRooms = 1; // Prevent division by zero
    const activeMonths = this.filteredGroupedExpenses.length || 1;
    const totalAvailableRoomNights = totalRooms * 30.4 * activeMonths;
    const adr = totalAvailableRoomNights > 0 ? this.totalRevenueYtd / totalAvailableRoomNights : 0;
    if (adr === 0) return 0;
    const roomsToSell = expenses / adr;
    const pct = (roomsToSell / totalAvailableRoomNights) * 100;
    return Math.min(100, Math.round(pct * 10) / 10);
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

  sortColumn = 'month_year';
  sortDirection = 'desc';
  isMandatoryCheckEnabled = false;

  get filteredGroupedExpenses(): any[] {
    const list = this.groupedExpenses.filter(e => {
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

    const sortCol = this.sortColumn || 'month_year';
    const sortDir = this.sortDirection || 'desc';

    return list.sort((a, b) => {
      if (sortCol === 'month_year') {
        const timeA = (a.expense_year || 0) * 12 + (a.expense_month || 0);
        const timeB = (b.expense_year || 0) * 12 + (b.expense_month || 0);
        return sortDir === 'asc' ? timeA - timeB : timeB - timeA;
      }

      let valA = a[sortCol];
      let valB = b[sortCol];

      if (['total_amount', 'utilities', 'salaries', 'maintenance', 'consumables', 'marketing', 'other'].includes(sortCol)) {
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

  resetExpenseFilters(): void {
    this.expenseFilterYear = null;
    this.expenseFilterMonth = null;
    this.expenseFilterStatus = '';
    this.expenseMinAmount = null;
    this.updateCharts();
  }

  // Modal State
  isModalVisible = false;
  isOkLoading = false;
  monthAlreadyExists = false;
  expenseForm: FormGroup;
  editingMonthYear: { month: number, year: number } | null = null;
  fileList: NzUploadFile[] = [];
  isUploadingFiles = false;
  private isApplyingExpenseRecord = false;

  checkDuplicateMonth(): void {
    if (this.isApplyingExpenseRecord) {
      return;
    }

    const month = this.expenseForm?.get('expense_month')?.value;
    const year = this.expenseForm?.get('expense_year')?.value;

    if (month && year && this.groupedExpenses) {
      const existingExpense = this.groupedExpenses.find(g => 
        Number(g.expense_month) === Number(month) && 
        Number(g.expense_year) === Number(year)
      );

      if (existingExpense) {
        const isCurrentEditingRecord = this.editingMonthYear &&
          Number(this.editingMonthYear.month) === Number(month) &&
          Number(this.editingMonthYear.year) === Number(year);

        this.monthAlreadyExists = false;
        this.setMonthlyExpenseFieldsEnabled(true);

        if (!isCurrentEditingRecord) {
          this.openEditModal(existingExpense);
        }
        return;
      }

      if (this.editingMonthYear) {
        this.openBlankExpenseRecord(month, year);
        return;
      }
    }

    this.monthAlreadyExists = false;
    this.setMonthlyExpenseFieldsEnabled(true);
  }

  private openBlankExpenseRecord(month: number, year: number): void {
    this.isApplyingExpenseRecord = true;
    this.editingMonthYear = null;
    this.fileList = [];
    this.individualExpenses = [];
    this.expenseForm.reset({
      expense_month: month,
      expense_year: year,
      payment_status: 'Paid',
      description: '',
      utilities: null,
      salaries: null,
      maintenance: null,
      consumables: null,
      marketing: null,
      other: null
    }, { emitEvent: false });
    this.expenseForm.get('expense_month')?.enable({ emitEvent: false });
    this.expenseForm.get('expense_year')?.enable({ emitEvent: false });
    this.setMonthlyExpenseFieldsEnabled(true);
    this.monthAlreadyExists = false;
    this.isApplyingExpenseRecord = false;
  }

  private setMonthlyExpenseFieldsEnabled(enabled: boolean): void {
    const controlsToToggle = ['payment_status', 'description', 'utilities', 'salaries', 'maintenance', 'consumables', 'marketing', 'other'];
    controlsToToggle.forEach(c => {
      const control = this.expenseForm?.get(c);
      if (enabled) {
        control?.enable({ emitEvent: false });
      } else {
        control?.disable({ emitEvent: false });
      }
    });
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
    let previewUrl = file.url || (file as any)['preview'];
    
    if (!previewUrl && file.originFileObj) {
      previewUrl = await this.getBase64(file.originFileObj as File);
      (file as any)['preview'] = previewUrl;
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
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    this.individualExpenseForm.reset({ 
      payment_status: 'Paid', 
      category: 'Maintenance',
      expense_month: currentMonth,
      expense_year: currentYear
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
          const { data: insertedData, error } = await this.supabase.insertExpense(payload);
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
              await this.supabase.updateExpenseReceipts(insertedRow.id, indPaths);
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
    private message: NzMessageService,
    private themeService: ThemeService
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
            this.sortColumn = config.sort_column || 'month_year';
            this.sortDirection = config.sort_direction || 'desc';
            this.isMandatoryCheckEnabled = config.mandatory_edit_check || false;
            this.applyMandatoryChecks(this.isMandatoryCheckEnabled);
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
                this.sortColumn = parsed.sort_column || 'month_year';
                this.sortDirection = parsed.sort_direction || 'desc';
                this.isMandatoryCheckEnabled = parsed.mandatory_edit_check || false;
                this.applyMandatoryChecks(this.isMandatoryCheckEnabled);
              }
            } catch (e) {}
          }
        }
      }
    });

    this.themeSubscription = this.themeService.currentTheme$.subscribe(theme => {
      this.chartTheme = theme === 'theme-cream-white' ? 'light' : 'dark';
      this.primaryColor = theme === 'theme-cream-white' ? '#1c1917' : '#d4af37';
      this.updateCharts();
    });
  }

  isColumnMandatory(key: string): boolean {
    const col = this.popupFields?.find(c => c.key === key);
    return col ? col.mandatory === true : false;
  }

  applyMandatoryChecks(mandatory: boolean): void {
    if (!this.popupFields || this.popupFields.length === 0) return;

    this.popupFields.forEach(col => {
      const isMandatory = col.mandatory === true;
      
      // If it's month_year, we need to update both expense_month and expense_year
      if (col.key === 'month_year') {
        const monthControl = this.expenseForm?.get('expense_month');
        const yearControl = this.expenseForm?.get('expense_year');
        [monthControl, yearControl].forEach(control => {
          if (control) {
            if (isMandatory) {
              if (control === monthControl) {
                control.setValidators([Validators.required, Validators.min(1), Validators.max(12)]);
              } else {
                control.setValidators([Validators.required, Validators.min(2000)]);
              }
            } else {
              control.clearValidators();
              if (control === monthControl) {
                control.setValidators([Validators.min(1), Validators.max(12)]);
              } else {
                control.setValidators([Validators.min(2000)]);
              }
            }
            control.updateValueAndValidity();
          }
        });
        return;
      }

      const control = this.expenseForm?.get(col.key);
      if (control) {
        if (isMandatory) {
          if (['utilities', 'salaries', 'maintenance', 'consumables', 'marketing', 'other'].includes(col.key)) {
            control.setValidators([Validators.required, Validators.min(0)]);
          } else {
            control.setValidators([Validators.required]);
          }
        } else {
          control.clearValidators();
          if (['utilities', 'salaries', 'maintenance', 'consumables', 'marketing', 'other'].includes(col.key)) {
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

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  async loadExpenses() {
    this.loading = true;
    const profile = this.supabase.currentProfile;
    const hotelId = profile?.hotel_id;
    const { data, error } = await this.supabase.getMonthlyExpenses(hotelId);
    
    const { data: entries } = await this.supabase.getTotalRevenue(hotelId);
    const dbRevenue = (entries || []).reduce((sum, e) => sum + Number(e.total_revenue || 0), 0);

    if (data) {
      this.expenses = data;
      this.groupExpensesByMonth(data);
      
      const totalExpenses = data.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      this.totalRevenueYtd = dbRevenue;

      this.updateCharts();
    }
    this.loading = false;
  }

  updateCharts(): void {
    const isLight = this.chartTheme === 'light';
    const textColor = isLight ? '#4b5563' : '#9ca3af';

    // 1. Prepare Category-wise Donut Chart Data
    let salariesTotal = 0;
    let utilitiesTotal = 0;
    let maintenanceTotal = 0;
    let consumablesTotal = 0;
    let marketingTotal = 0;
    let otherTotal = 0;

    this.filteredGroupedExpenses.forEach(e => {
      salariesTotal += Number(e.salaries || 0);
      utilitiesTotal += Number(e.utilities || 0);
      maintenanceTotal += Number(e.maintenance || 0);
      consumablesTotal += Number(e.consumables || 0);
      marketingTotal += Number(e.marketing || 0);
      otherTotal += Number(e.other || 0);

      if (e.individual_items && e.individual_items.length > 0) {
        e.individual_items.forEach((item: any) => {
          const cat = (item.category || '').toLowerCase();
          if (cat === 'salaries') salariesTotal += Number(item.amount || 0);
          else if (cat === 'utilities') utilitiesTotal += Number(item.amount || 0);
          else if (cat === 'maintenance') maintenanceTotal += Number(item.amount || 0);
          else if (cat === 'consumables') consumablesTotal += Number(item.amount || 0);
          else if (cat === 'marketing') marketingTotal += Number(item.amount || 0);
          else otherTotal += Number(item.amount || 0);
        });
      }
    });

    const grandTotal = salariesTotal + utilitiesTotal + maintenanceTotal + consumablesTotal + marketingTotal + otherTotal;
    
    // Default fallback values if no entries exist
    let sVal = salariesTotal;
    let uVal = utilitiesTotal;
    let mVal = maintenanceTotal;
    let cVal = consumablesTotal;
    let mkVal = marketingTotal;
    let oVal = otherTotal;
    let finalTotal = grandTotal;

    if (grandTotal === 0) {
      sVal = 450000;
      uVal = 180000;
      mVal = 120000;
      cVal = 90000;
      mkVal = 60000;
      oVal = 40000;
      finalTotal = sVal + uVal + mVal + cVal + mkVal + oVal;
    }

    const categoriesConfig = [
      { name: 'Salaries', amount: sVal, color: '#d4af37' },
      { name: 'Utilities', amount: uVal, color: '#3b82f6' },
      { name: 'Maintenance', amount: mVal, color: '#10b981' },
      { name: 'Consumables', amount: cVal, color: '#f43f5e' },
      { name: 'Marketing', amount: mkVal, color: '#8b5cf6' },
      { name: 'Other', amount: oVal, color: '#71717a' }
    ];

    this.categoryPercentages = categoriesConfig.map(cat => {
      const pct = finalTotal > 0 ? (cat.amount / finalTotal) * 100 : 0;
      return {
        name: cat.name,
        amount: cat.amount,
        percentage: Math.round(pct * 10) / 10,
        color: cat.color
      };
    });

    this.fixedVsVariableChartOptions = {
      series: this.categoryPercentages.map(c => c.amount),
      chart: {
        type: 'donut',
        height: 200,
        background: 'transparent',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      },
      labels: this.categoryPercentages.map(c => c.name),
      colors: this.categoryPercentages.map(c => c.color),
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
                fontSize: '9px',
                color: textColor,
                offsetY: -5
              },
              value: {
                show: true,
                fontSize: '15px',
                fontWeight: 'bold',
                color: isLight ? '#1c1917' : '#ffffff',
                offsetY: 5,
                formatter: () => '₹' + (finalTotal >= 100000 ? (finalTotal / 100000).toFixed(1) + 'L' : finalTotal.toLocaleString('en-IN'))
              },
              total: {
                show: true,
                label: 'Total',
                color: textColor,
                formatter: () => '₹' + (finalTotal >= 100000 ? (finalTotal / 100000).toFixed(1) + 'L' : finalTotal.toLocaleString('en-IN'))
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      tooltip: {
        theme: this.chartTheme,
        y: {
          formatter: (value) => '₹' + Number(value).toLocaleString('en-IN')
        }
      }
    };

    // 2. Prepare Radial Bar Chart (Liability Clearance Rate)
    const totalOutflow = this.totalOutflowYtd;
    const pending = this.pendingLiabilities;
    const paidAmount = totalOutflow > pending ? totalOutflow - pending : 0;
    const clearanceRate = totalOutflow > 0 ? Math.round((paidAmount / totalOutflow) * 100) : 100;

    this.clearanceChartOptions = {
      series: [clearanceRate],
      chart: {
        type: 'radialBar',
        height: 75,
        width: 75,
        sparkline: { enabled: true }
      },
      plotOptions: {
        radialBar: {
          hollow: { size: '55%' },
          track: {
            background: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
            strokeWidth: '100%'
          },
          dataLabels: {
            name: { show: false },
            value: {
              show: true,
              fontSize: '11px',
              fontWeight: 'bold',
              color: isLight ? '#1c1917' : '#ffffff',
              offsetY: 3,
              formatter: (val) => `${val}%`
            }
          }
        }
      },
      colors: ['#10b981'],
      stroke: { lineCap: 'round' }
    };
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
    }, { emitEvent: false });
    this.expenseForm.get('expense_month')?.enable();
    this.expenseForm.get('expense_year')?.enable();
    this.checkDuplicateMonth();
    this.isModalVisible = true;
  }

  openEditModal(data: any): void {
    this.isApplyingExpenseRecord = true;
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
    }, { emitEvent: false });
    this.expenseForm.get('expense_month')?.enable();
    this.expenseForm.get('expense_year')?.enable();
    this.isApplyingExpenseRecord = false;
    this.checkDuplicateMonth();
    this.isModalVisible = true;
  }

  get calculateTotalAmount(): number {
    let total = 0;
    
    const categories = ['utilities', 'salaries', 'maintenance', 'consumables', 'marketing', 'other'];
    categories.forEach(cat => {
      const val = this.expenseForm?.get(cat)?.value;
      if (val) {
        total += Number(val);
      }
    });
    
    if (this.individualExpenses && this.individualExpenses.length > 0) {
      this.individualExpenses.forEach(ind => {
        if (ind.amount) {
          total += Number(ind.amount);
        }
      });
    }
    
    return total;
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

    if (this.isColumnMandatory('description') || this.isColumnMandatory('receipts')) {
      const descControl = this.expenseForm.get('description');
      if (this.isColumnMandatory('description') && descControl) {
        descControl.markAsDirty();
        descControl.updateValueAndValidity();
        if (!descControl.valid) {
          this.message.error('Ledger description is required.');
          return;
        }
      }
      
      const status = this.expenseForm.get('payment_status')?.value;
      if (this.isColumnMandatory('receipts') && status === 'Paid' && (!this.fileList || this.fileList.length === 0)) {
        this.message.error('At least one receipt document is required for paid expenses.');
        return;
      }
    }

    const formData = this.expenseForm.getRawValue(); // Get values including disabled fields
    const profile = this.supabase.currentProfile;


    if (!profile || !profile.hotel_id) {
      this.message.error('No hotel context found');
      return;
    }

    this.isOkLoading = true;
    try {
      if (this.editingMonthYear) {
        // Delete all existing monthly_expenses matching this month and year for this hotel
        const { error: deleteError } = await this.supabase.deleteExpensesByMonthYear(
          profile.hotel_id, 
          this.editingMonthYear.month, 
          this.editingMonthYear.year
        );

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

      const { data: insertedData, error: insertError } = await this.supabase.insertMultipleExpenses(payloads);
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
            await this.supabase.updateMultipleExpenseReceipts(fixedRowIds, mainPaths);
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
                await this.supabase.updateExpenseReceipts(insertedRow.id, indPaths);
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

      const profile = this.supabase.currentProfile;
      if (!profile || !profile.hotel_id) throw new Error('No hotel context');

      const { error } = await this.supabase.deleteExpensesByMonthYear(
        profile.hotel_id, 
        data.expense_month, 
        data.expense_year
      );

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
