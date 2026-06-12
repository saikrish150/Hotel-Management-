# RK Residency Admin Web Portal - System Memory & Feature Catalog

This document serves as the absolute source of truth for the project context, technical architecture, database schemas, application components, theme tokens, security settings, and specific user preferences implemented so far.

---

## 1. Project Overview & Multi-Tenant Architecture

The project is an **Enterprise-grade Multi-Tenant SaaS Admin Console** built using **Angular 17/18** and **Supabase (PostgreSQL)**. It is designed to host multiple independent hotels (tenants). Data isolation is strictly enforced via **Row-Level Security (RLS)** using database helper functions mapping users to their respective hotels.

- **Frontend Core**: Angular Standalone Components, Reactive Forms, RxJS.
- **UI Framework & Styling**: `ng-zorro-antd` (Ant Design for Angular) alongside a Custom Premium & Futuristic Dark CSS design system using Vanilla CSS custom properties.
- **Database Backend**: Supabase PostgreSQL with built-in RLS, authentication, and structured schema tables.

---

## 2. Relational Database Schema (`database_schema.sql`)

### Hotels (The Tenant Entity)
Stores registration, contact detail records, and subscription configurations, including custom room types.
- `id` (UUID, Primary Key)
- `name` (TEXT, e.g., 'RK Residency')
- `address` (TEXT)
- `contact_phone` (TEXT)
- `subscription_status` (TEXT: 'trial', 'active', 'suspended')
- `room_config` (JSONB, dynamic capacity tracking, e.g., `{"Standard room": 3, "Standard non ac room": 3, "Delux room": 2, "Suite room": 4}`)
- `created_at` (TIMESTAMP WITH TIME ZONE)

### Profiles (Extended User Details)
Links user accounts created via Supabase Auth to a tenant hotel ID and defines roles.
- `id` (UUID, Primary Key, references `auth.users(id)`)
- `hotel_id` (UUID, references `hotels(id)`)
- `role` (TEXT: 'Admin', 'Manager', 'Staff')
- `full_name` (TEXT)
- `created_at` (TIMESTAMP WITH TIME ZONE)

### Daily Entries (Occupancy Ledger)
Tracks audit logs, revenue metrics, and specific room category sales.
- `id` (UUID, Primary Key)
- `hotel_id` (UUID, references `hotels(id)`)
- `entry_date` (DATE)
- `total_rooms_available` (INTEGER)
- `rooms_sold` (INTEGER)
- `vacant_rooms` (INTEGER)
- `total_guests` (INTEGER)
- `total_revenue` (NUMERIC)
- `standard_ac_rooms_sold` (INTEGER)
- `standard_non_ac_rooms_sold` (INTEGER)
- `deluxe_rooms_sold` (INTEGER)
- `suite_rooms_sold` (INTEGER)
- `cash_payments` (NUMERIC)
- `upi_payments` (NUMERIC)
- `card_payments` (NUMERIC)
- `pending_payments` (NUMERIC)
- `restaurant_revenue` (NUMERIC)
- `other_service_revenue` (NUMERIC)
- `notes` (TEXT)
- `created_by` (UUID, references `auth.users(id)`)
- `created_at` / `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Constraint**: `unique_hotel_entry_date` (`hotel_id`, `entry_date`) ensures a single entry per day per tenant.

### Monthly Expenses (Expense Ledger)
Categorized operational expense record logs.
- `id` (UUID, Primary Key)
- `hotel_id` (UUID, references `hotels(id)`)
- `expense_month` (INTEGER, 1 to 12)
- `expense_year` (INTEGER)
- `category` (TEXT)
- `amount` (NUMERIC)
- `payment_status` (TEXT: 'Paid', 'Pending')
- `description` (TEXT)
- `created_by` (UUID, references `auth.users(id)`)

### Row-Level Security Policies
- Enabled on `profiles`, `daily_entries`, and `monthly_expenses`.
- Helper function `get_user_hotel_id()` fetches the authenticated user's profile hotel:
  ```sql
  CREATE OR REPLACE FUNCTION get_user_hotel_id()
  RETURNS UUID AS $$
      SELECT hotel_id FROM profiles WHERE id = auth.uid();
  $$ LANGUAGE sql SECURITY DEFINER;
  ```
- RLS Policies enforce `USING (hotel_id = get_user_hotel_id())` for select, insert, update, and delete actions.

---

## 3. Implemented Core System Features

### Authentication & Persistent Session Management
- Managed inside `SupabaseService` (`src/app/core/services/supabase.service.ts`).
- Employs Supabase's `auth` listener config with `persistSession: true` to prevent automatic login requests on browser reload.
- Auto-fetches profiles and linked hotel configurations upon initial load.

### Layout System (`layout.component`)
- Handles side navigation links and maps page routes to responsive header titles (`activeTitle`).
- Custom theme control toggles themes via a global service.
- Features a glowing premium **Floating Action Button (FAB)** pointing to the "Add Today's Data" modal.

### Dynamic "Add Today's Data" Modal
- Automatically reads the hotel's `room_config` JSON configuration database field.
- **Horizontal & Compact Form Layout**: Arranged in tidy horizontal grid rows with zero vertical scrolls.
- **Dynamic Capacity Input Fields**: Dynamically generates inputs corresponding strictly to categories defined in the hotel's `room_config` (e.g., "Standard room").
- **Automatic Calculations**: Computes the sum of all dynamic category entries and updates the read-only overall `rooms_sold` field.
- **Non-Mandatory Fields**: `total_guests` is configured as a non-mandatory, optional integer.
- **Eliminated Redundancies**: The redundant `total_rooms_available` count field is removed from display to maximize simplicity.

### Premium Design Aesthetics
- Modern cyberpunk/glassmorphism dark UI dashboard layout using premium font mappings (Hanken Grotesk).
- Translucent backdrop filters (`backdrop-blur-md`), dark backgrounds (`bg-white/5`), thin border highlights (`border-white/10`), and tailored neon primary glows (`var(--theme-glow)`).

---

## 4. Key References & Rules to Remember

1. **Database Mappings in Layout**:
   - `getDbColumn(roomType, index)` dynamically matches the UI room labels to database table columns:
     - Standard AC -> `standard_ac_rooms_sold`
     - Standard Non-AC -> `standard_non_ac_rooms_sold`
     - Deluxe -> `deluxe_rooms_sold`
     - Suite -> `suite_rooms_sold`
     - Fallback uses index modular match.
2. **Dynamic Forms**:
   - When generating form controls, clean up old dynamic fields so that only standard fields (`entry_date`, `rooms_sold`, `total_revenue`, `total_guests`, `notes`) remain, before adding controls matching `roomConfig` keys.
3. **Session Cache**:
   - Make sure `SupabaseService` has session-fetching setup correctly on start, checking `supabase.auth.getSession()` and binding to `onAuthStateChange`.

---

## 5. Premium Enterprise Design Guidelines

### Visual Experience & Theme Design
- Enforce custom-feeling, sophisticated, and executive-focused UI patterns. Avoid standard bootstrap-like styles.
- Utilize high-fidelity translucent surfaces (`backdrop-blur-md`), deep ambient glow states (`var(--theme-glow)`), and polished typography (e.g., Space Grotesk, Hanken Grotesk).
- Layouts must act as command centers, containing high-end executive dashboards and insight-driven visualizations.

### Component Styling & Interactions
- **KPI Cards**: Include trend indicators, micro-visualizations, smooth hover transitions, and interactive states.
- **Tables**: Implement sticky headers, advanced filtering, context actions, sorting, and interactive rows.
- **Forms & Modals**: Keep spacing generous yet compact, use elegant entrance animations, smart default states, and minimal vertical scroll.
- **Aesthetics Check**: Before completing any page or component, verify if it looks like a template or a CRUD app. If it does, refine immediately to meet flagship software standards.
