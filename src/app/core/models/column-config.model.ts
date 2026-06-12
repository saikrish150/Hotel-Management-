export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableAndPopupConfig {
  table: { key: string; visible: boolean }[];
  popup: { key: string; visible: boolean }[];
}

export const DEFAULT_BOOKING_COLUMNS: ColumnConfig[] = [
  { key: 'check_in', label: 'Check-In', visible: true, width: '150px' },
  { key: 'room_number', label: 'Room No', visible: true, width: '100px' },
  { key: 'room_category', label: 'Category', visible: true, width: '120px' },
  { key: 'guest_name', label: 'Guest Name', visible: true, width: '150px' },
  { key: 'address', label: 'Address', visible: true, width: '180px' },
  { key: 'id_number', label: 'ID Number', visible: true, width: '120px' },
  { key: 'phone_number', label: 'Phone Number', visible: true, width: '120px' },
  { key: 'number_of_people', label: 'People', visible: true, width: '80px', align: 'center' },
  { key: 'number_of_days', label: 'Days', visible: true, width: '80px', align: 'center' },
  { key: 'amount_paid', label: 'Amount Paid', visible: true, width: '120px', align: 'right' },
  { key: 'check_out', label: 'Scheduled Check-Out', visible: true, width: '150px' },
  { key: 'actual_checkout', label: 'Actual Check-Out', visible: true, width: '150px' },
  { key: 'id_documents', label: 'Attachments', visible: true, width: '120px', align: 'center' },
  { key: 'status', label: 'Status', visible: true, width: '160px' }
];

export const DEFAULT_DAILY_ENTRY_BASE_COLUMNS: ColumnConfig[] = [
  { key: 'entry_date', label: 'Log Date', visible: true, width: '150px' },
  { key: 'rooms_sold', label: 'Rooms Sold', visible: true, width: '120px', align: 'center' },
  { key: 'total_rooms_available', label: 'Total Capacity', visible: true, width: '150px', align: 'center' }
];

export const DEFAULT_DAILY_ENTRY_END_COLUMNS: ColumnConfig[] = [
  { key: 'total_guests', label: 'Active Guests', visible: true, width: '120px', align: 'center' },
  { key: 'total_revenue', label: 'Recorded Revenue', visible: true, width: '160px', align: 'center' },
  { key: 'notes', label: 'Remarks', visible: true, width: '220px' }
];

export const DEFAULT_EXPENSE_COLUMNS: ColumnConfig[] = [
  { key: 'month_year', label: 'Month / Year', visible: true, width: '150px' },
  { key: 'utilities', label: 'Utilities', visible: true, width: '130px', align: 'center' },
  { key: 'salaries', label: 'Salaries', visible: true, width: '130px', align: 'center' },
  { key: 'maintenance', label: 'Maintenance', visible: true, width: '130px', align: 'center' },
  { key: 'consumables', label: 'Consumables', visible: true, width: '130px', align: 'center' },
  { key: 'marketing', label: 'Marketing', visible: true, width: '130px', align: 'center' },
  { key: 'other', label: 'Other', visible: true, width: '130px', align: 'center' },
  { key: 'receipts', label: 'Receipts', visible: true, width: '120px', align: 'center' },
  { key: 'payment_status', label: 'Status', visible: true, width: '130px', align: 'center' },
  { key: 'total_amount', label: 'Total Outflow', visible: true, width: '160px', align: 'right' }
];
