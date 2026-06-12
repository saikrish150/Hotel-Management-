-- =========================================================================
-- RK RESIDENCY MULTI-TENANT SaaS DATABASE SCHEMA
-- Target design supporting multiple hotels, isolated users, and transaction logs
-- =========================================================================

-- 1. Hotels Table (The Tenant Entity)
CREATE TABLE hotels (
    id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    contact_phone TEXT,
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended')),
    room_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Profiles Table (Extended user details linked to auth.users and a specific hotel)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Staff')),
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Daily Entries Table (Isolated room sales ledger)
CREATE TABLE daily_entries (
    id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE NOT NULL,
    entry_date DATE NOT NULL,
    total_rooms_available INTEGER NOT NULL,
    rooms_sold INTEGER NOT NULL,
    vacant_rooms INTEGER NOT NULL,
    total_guests INTEGER NOT NULL,
    total_revenue NUMERIC NOT NULL,
    standard_ac_rooms_sold INTEGER NOT NULL,
    standard_non_ac_rooms_sold INTEGER NOT NULL,
    deluxe_rooms_sold INTEGER NOT NULL,
    suite_rooms_sold INTEGER NOT NULL,
    cash_payments NUMERIC NOT NULL,
    upi_payments NUMERIC NOT NULL,
    card_payments NUMERIC NOT NULL,
    pending_payments NUMERIC NOT NULL,
    restaurant_revenue NUMERIC NOT NULL,
    other_service_revenue NUMERIC NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Uniqueness constraint scoped PER hotel (allows separate hotels to log entries on same date)
    CONSTRAINT unique_hotel_entry_date UNIQUE (hotel_id, entry_date)
);

-- 4. Monthly Expenses Table (Isolated expense ledger)
CREATE TABLE monthly_expenses (
    id UUID DEFAULT GEN_RANDOM_UUID() PRIMARY KEY,
    hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE NOT NULL,
    expense_month INTEGER NOT NULL CHECK (expense_month BETWEEN 1 AND 12),
    expense_year INTEGER NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('Paid', 'Pending')),
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =========================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES FOR SAAS DATA ISOLATION
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_expenses ENABLE ROW LEVEL SECURITY;

-- Helper security-definer function to retrieve current user's hotel link
CREATE OR REPLACE FUNCTION get_user_hotel_id()
RETURNS UUID AS $$
    SELECT hotel_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Users can access profiles in their hotel" 
ON profiles FOR ALL 
USING (hotel_id = get_user_hotel_id())
WITH CHECK (hotel_id = get_user_hotel_id());

-- Daily Entries Policies
CREATE POLICY "Users can access daily entries in their hotel" 
ON daily_entries FOR ALL 
USING (hotel_id = get_user_hotel_id())
WITH CHECK (hotel_id = get_user_hotel_id());

-- Monthly Expenses Policies
CREATE POLICY "Users can access expenses in their hotel" 
ON monthly_expenses FOR ALL 
USING (hotel_id = get_user_hotel_id())
WITH CHECK (hotel_id = get_user_hotel_id());
