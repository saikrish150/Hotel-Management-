-- =========================================================================
-- RK RESIDENCY MULTI-TENANT SaaS DATABASE SCHEMA
-- Target design supporting multiple hotels, isolated users, and transaction logs
-- =========================================================================

-- 1. Hotels Table (The Tenant Entity)
CREATE TABLE IF NOT EXISTS hotels (
    id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    contact_phone TEXT,
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended')),
    room_config JSONB DEFAULT '{}'::jsonb,
    column_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Profiles Table (Extended user details linked to auth.users and a specific hotel)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Staff')),
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Daily Entries Table (Isolated room sales ledger)
CREATE TABLE IF NOT EXISTS daily_entries (
    id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE NOT NULL,
    entry_date DATE NOT NULL,
    total_rooms_available INTEGER NOT NULL DEFAULT 0 CHECK (total_rooms_available >= 0),
    rooms_sold INTEGER NOT NULL DEFAULT 0 CHECK (rooms_sold >= 0),
    vacant_rooms INTEGER NOT NULL DEFAULT 0 CHECK (vacant_rooms >= 0),
    total_guests INTEGER NOT NULL DEFAULT 0 CHECK (total_guests >= 0),
    total_revenue NUMERIC NOT NULL DEFAULT 0 CHECK (total_revenue >= 0),
    standard_ac_rooms_sold INTEGER NOT NULL DEFAULT 0 CHECK (standard_ac_rooms_sold >= 0),
    standard_non_ac_rooms_sold INTEGER NOT NULL DEFAULT 0 CHECK (standard_non_ac_rooms_sold >= 0),
    deluxe_rooms_sold INTEGER NOT NULL DEFAULT 0 CHECK (deluxe_rooms_sold >= 0),
    suite_rooms_sold INTEGER NOT NULL DEFAULT 0 CHECK (suite_rooms_sold >= 0),
    cash_payments NUMERIC NOT NULL DEFAULT 0,
    upi_payments NUMERIC NOT NULL DEFAULT 0,
    card_payments NUMERIC NOT NULL DEFAULT 0,
    pending_payments NUMERIC NOT NULL DEFAULT 0,
    restaurant_revenue NUMERIC NOT NULL DEFAULT 0,
    other_service_revenue NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Uniqueness constraint scoped PER hotel (allows separate hotels to log entries on same date)
    CONSTRAINT unique_hotel_entry_date UNIQUE (hotel_id, entry_date)
);

-- 4. Monthly Expenses Table (Isolated expense ledger)
CREATE TABLE IF NOT EXISTS monthly_expenses (
    id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE NOT NULL,
    expense_month INTEGER NOT NULL CHECK (expense_month BETWEEN 1 AND 12),
    expense_year INTEGER NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('Paid', 'Pending')),
    description TEXT,
    receipts TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 5. Room Bookings Table (Isolated room occupancy/reservation log)
CREATE TABLE IF NOT EXISTS room_bookings (
    id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE NOT NULL,
    guest_name TEXT NOT NULL,
    phone_number TEXT,
    id_number TEXT,
    room_number TEXT NOT NULL,
    room_category TEXT,
    booking_source TEXT,
    address TEXT,
    check_in TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_checkout TIMESTAMP WITH TIME ZONE,
    number_of_days INTEGER DEFAULT 1,
    number_of_people INTEGER DEFAULT 1,
    amount_paid NUMERIC DEFAULT 0 CHECK (amount_paid >= 0),
    status TEXT NOT NULL DEFAULT 'Expected' CHECK (status IN ('Expected', 'Checked In', 'Checked Out', 'Cancelled')),
    receipts TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Date logical validation constraint
    CONSTRAINT check_stay_dates CHECK (check_out > check_in)
);

-- 6. Audit Logs Table (Tracks all database mutations for security & auditing)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    target_table TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =========================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES FOR SAAS DATA ISOLATION & RBAC
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper security-definer function to retrieve current user's hotel link
CREATE OR REPLACE FUNCTION get_user_hotel_id()
RETURNS UUID AS $$
    SELECT hotel_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper security-definer function to retrieve current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Drop existing policies if they exist to prevent 42710 (duplicate object) errors
DROP POLICY IF EXISTS "Users can access their own hotel details" ON public.hotels;
DROP POLICY IF EXISTS "Users can access profiles in their hotel" ON public.profiles;
DROP POLICY IF EXISTS "Users can access daily entries in their hotel" ON public.daily_entries;
DROP POLICY IF EXISTS "Users can access expenses in their hotel" ON public.monthly_expenses;
DROP POLICY IF EXISTS "Users can access room bookings in their hotel" ON public.room_bookings;
DROP POLICY IF EXISTS "Users can view audit logs in their hotel" ON public.audit_logs;

DROP POLICY IF EXISTS "View hotel details" ON public.hotels;
DROP POLICY IF EXISTS "Manage hotel details" ON public.hotels;
DROP POLICY IF EXISTS "View hotel profiles" ON public.profiles;
DROP POLICY IF EXISTS "Manage hotel profiles" ON public.profiles;
DROP POLICY IF EXISTS "View daily entries" ON public.daily_entries;
DROP POLICY IF EXISTS "Manage daily entries" ON public.daily_entries;
DROP POLICY IF EXISTS "View expenses" ON public.monthly_expenses;
DROP POLICY IF EXISTS "Manage expenses" ON public.monthly_expenses;
DROP POLICY IF EXISTS "View bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Create bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Update bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Delete bookings" ON public.room_bookings;

-- Hotels Policies
CREATE POLICY "View hotel details" ON public.hotels FOR SELECT TO authenticated USING (id = get_user_hotel_id());
CREATE POLICY "Manage hotel details" ON public.hotels FOR ALL TO authenticated USING (id = get_user_hotel_id() AND get_user_role() = 'Admin');

-- Profiles Policies
CREATE POLICY "View hotel profiles" ON public.profiles FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id());
CREATE POLICY "Manage hotel profiles" ON public.profiles FOR ALL TO authenticated USING (hotel_id = get_user_hotel_id() AND get_user_role() = 'Admin');

-- Daily Entries Policies
CREATE POLICY "View daily entries" ON public.daily_entries FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id());
CREATE POLICY "Manage daily entries" ON public.daily_entries FOR ALL TO authenticated USING (hotel_id = get_user_hotel_id() AND get_user_role() IN ('Admin', 'Manager'));

-- Monthly Expenses Policies
CREATE POLICY "View expenses" ON public.monthly_expenses FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id());
CREATE POLICY "Manage expenses" ON public.monthly_expenses FOR ALL TO authenticated USING (hotel_id = get_user_hotel_id() AND get_user_role() IN ('Admin', 'Manager'));

-- Room Bookings Policies
CREATE POLICY "View bookings" ON public.room_bookings FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id());
CREATE POLICY "Create bookings" ON public.room_bookings FOR INSERT TO authenticated WITH CHECK (hotel_id = get_user_hotel_id());
CREATE POLICY "Update bookings" ON public.room_bookings FOR UPDATE TO authenticated USING (hotel_id = get_user_hotel_id()) WITH CHECK (hotel_id = get_user_hotel_id());
CREATE POLICY "Delete bookings" ON public.room_bookings FOR DELETE TO authenticated USING (hotel_id = get_user_hotel_id() AND get_user_role() IN ('Admin', 'Manager'));

-- Audit Logs Policies
CREATE POLICY "View audit logs in their hotel" ON public.audit_logs FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id());

-- =========================================================================
-- TIMESTAMPS TRIGGERS
-- =========================================================================

-- Common function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers to avoid duplication
DROP TRIGGER IF EXISTS update_hotels_updated_at ON public.hotels;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_daily_entries_updated_at ON public.daily_entries;
DROP TRIGGER IF EXISTS update_monthly_expenses_updated_at ON public.monthly_expenses;
DROP TRIGGER IF EXISTS update_room_bookings_updated_at ON public.room_bookings;

-- Recreate triggers
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_entries_updated_at BEFORE UPDATE ON public.daily_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_expenses_updated_at BEFORE UPDATE ON public.monthly_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_room_bookings_updated_at BEFORE UPDATE ON public.room_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- AUTOMATIC AUDIT LOGGING SYSTEM (TRIGGERS)
-- =========================================================================

CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_hotel_id UUID;
    v_user_id UUID;
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
BEGIN
    v_user_id := auth.uid();
    
    IF (TG_OP = 'DELETE') THEN
        v_hotel_id := OLD.hotel_id;
        v_old_data := to_jsonb(OLD);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_hotel_id := NEW.hotel_id;
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
    ELSE
        v_hotel_id := NEW.hotel_id;
        v_new_data := to_jsonb(NEW);
    END IF;

    INSERT INTO public.audit_logs (
        hotel_id,
        user_id,
        action,
        target_table,
        record_id,
        old_data,
        new_data
    ) VALUES (
        v_hotel_id,
        v_user_id,
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id 
            ELSE NEW.id 
        END,
        v_old_data,
        v_new_data
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_room_bookings_trigger ON public.room_bookings;
DROP TRIGGER IF EXISTS audit_monthly_expenses_trigger ON public.monthly_expenses;
DROP TRIGGER IF EXISTS audit_daily_entries_trigger ON public.daily_entries;

CREATE TRIGGER audit_room_bookings_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.room_bookings
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_monthly_expenses_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.monthly_expenses
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_daily_entries_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.daily_entries
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- =========================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_hotel_id ON public.profiles(hotel_id);
CREATE INDEX IF NOT EXISTS idx_daily_entries_hotel_id ON public.daily_entries(hotel_id);
CREATE INDEX IF NOT EXISTS idx_daily_entries_date ON public.daily_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_monthly_expenses_hotel_id ON public.monthly_expenses(hotel_id);
CREATE INDEX IF NOT EXISTS idx_monthly_expenses_date ON public.monthly_expenses(expense_year, expense_month);
CREATE INDEX IF NOT EXISTS idx_room_bookings_hotel_id ON public.room_bookings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_room_bookings_check_in ON public.room_bookings(check_in);
CREATE INDEX IF NOT EXISTS idx_room_bookings_check_out ON public.room_bookings(check_out);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hotel_id ON public.audit_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_table, record_id);


-- =========================================================================
-- MIGRATION UPGRADE SCRIPT FOR EXISTING LIVE DATABASES
-- Copy and execute the following SQL block in your Supabase SQL editor to upgrade:
-- =========================================================================
/*
-- 1. ADD VALIDATION CONSTRAINTS (Ignoring duplicates if already added)
ALTER TABLE public.room_bookings ADD CONSTRAINT check_stay_dates CHECK (check_out > check_in);
ALTER TABLE public.room_bookings ADD CONSTRAINT check_amount_paid_positive CHECK (amount_paid >= 0);
ALTER TABLE public.monthly_expenses ADD CONSTRAINT check_expense_amount_positive CHECK (amount >= 0);
ALTER TABLE public.daily_entries ADD CONSTRAINT check_total_rooms_available_positive CHECK (total_rooms_available >= 0);
ALTER TABLE public.daily_entries ADD CONSTRAINT check_rooms_sold_positive CHECK (rooms_sold >= 0);
ALTER TABLE public.daily_entries ADD CONSTRAINT check_vacant_rooms_positive CHECK (vacant_rooms >= 0);
ALTER TABLE public.daily_entries ADD CONSTRAINT check_total_guests_positive CHECK (total_guests >= 0);
ALTER TABLE public.daily_entries ADD CONSTRAINT check_total_revenue_positive CHECK (total_revenue >= 0);

-- 2. CREATE AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    target_table TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_logs_hotel_id ON public.audit_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_table, record_id);

-- 3. CREATE/REPLACE HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. UPDATE POLICIES FOR ROLE ACCESS
DROP POLICY IF EXISTS "Users can access their own hotel details" ON public.hotels;
DROP POLICY IF EXISTS "Users can access profiles in their hotel" ON public.profiles;
DROP POLICY IF EXISTS "Users can access daily entries in their hotel" ON public.daily_entries;
DROP POLICY IF EXISTS "Users can access expenses in their hotel" ON public.monthly_expenses;
DROP POLICY IF EXISTS "Users can access room bookings in their hotel" ON public.room_bookings;
DROP POLICY IF EXISTS "Users can view audit logs in their hotel" ON public.audit_logs;

DROP POLICY IF EXISTS "View hotel details" ON public.hotels;
DROP POLICY IF EXISTS "Manage hotel details" ON public.hotels;
DROP POLICY IF EXISTS "View hotel profiles" ON public.profiles;
DROP POLICY IF EXISTS "Manage hotel profiles" ON public.profiles;
DROP POLICY IF EXISTS "View daily entries" ON public.daily_entries;
DROP POLICY IF EXISTS "Manage daily entries" ON public.daily_entries;
DROP POLICY IF EXISTS "View expenses" ON public.monthly_expenses;
DROP POLICY IF EXISTS "Manage expenses" ON public.monthly_expenses;
DROP POLICY IF EXISTS "View bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Create bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Update bookings" ON public.room_bookings;
DROP POLICY IF EXISTS "Delete bookings" ON public.room_bookings;

CREATE POLICY "View hotel details" ON public.hotels FOR SELECT TO authenticated USING (id = get_user_hotel_id());
CREATE POLICY "Manage hotel details" ON public.hotels FOR ALL TO authenticated USING (id = get_user_hotel_id() AND get_user_role() = 'Admin');

CREATE POLICY "View hotel profiles" ON public.profiles FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id());
CREATE POLICY "Manage hotel profiles" ON public.profiles FOR ALL TO authenticated USING (hotel_id = get_user_hotel_id() AND get_user_role() = 'Admin');

CREATE POLICY "View daily entries" ON public.daily_entries FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id());
CREATE POLICY "Manage daily entries" ON public.daily_entries FOR ALL TO authenticated USING (hotel_id = get_user_hotel_id() AND get_user_role() IN ('Admin', 'Manager'));

CREATE POLICY "View expenses" ON public.monthly_expenses FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id());
CREATE POLICY "Manage expenses" ON public.monthly_expenses FOR ALL TO authenticated USING (hotel_id = get_user_hotel_id() AND get_user_role() IN ('Admin', 'Manager'));

CREATE POLICY "View bookings" ON public.room_bookings FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id());
CREATE POLICY "Create bookings" ON public.room_bookings FOR INSERT TO authenticated WITH CHECK (hotel_id = get_user_hotel_id());
CREATE POLICY "Update bookings" ON public.room_bookings FOR UPDATE TO authenticated USING (hotel_id = get_user_hotel_id()) WITH CHECK (hotel_id = get_user_hotel_id());
CREATE POLICY "Delete bookings" ON public.room_bookings FOR DELETE TO authenticated USING (hotel_id = get_user_hotel_id() AND get_user_role() IN ('Admin', 'Manager'));

CREATE POLICY "View audit logs in their hotel" ON public.audit_logs FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id());

-- 5. REGISTER TRIGGERS FOR AUDIT LOGGING
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_hotel_id UUID;
    v_user_id UUID;
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
BEGIN
    v_user_id := auth.uid();
    IF (TG_OP = 'DELETE') THEN
        v_hotel_id := OLD.hotel_id;
        v_old_data := to_jsonb(OLD);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_hotel_id := NEW.hotel_id;
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
    ELSE
        v_hotel_id := NEW.hotel_id;
        v_new_data := to_jsonb(NEW);
    END IF;

    INSERT INTO public.audit_logs (
        hotel_id,
        user_id,
        action,
        target_table,
        record_id,
        old_data,
        new_data
    ) VALUES (
        v_hotel_id,
        v_user_id,
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id 
            ELSE NEW.id 
        END,
        v_old_data,
        v_new_data
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_room_bookings_trigger ON public.room_bookings;
DROP TRIGGER IF EXISTS audit_monthly_expenses_trigger ON public.monthly_expenses;
DROP TRIGGER IF EXISTS audit_daily_entries_trigger ON public.daily_entries;

CREATE TRIGGER audit_room_bookings_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.room_bookings
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_monthly_expenses_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.monthly_expenses
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_daily_entries_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.daily_entries
FOR EACH ROW EXECUTE FUNCTION process_audit_log();
*/
