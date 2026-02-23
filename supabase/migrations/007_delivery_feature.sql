-- =====================================================
-- Migration 007: Delivery Feature
-- Adds delivery support to the sales system
-- =====================================================

-- 1. Add delivery columns to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'dine_in'
  CHECK (order_type IN ('dine_in', 'delivery', 'takeaway'));

ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_phone TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_requested_time TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_status TEXT
  CHECK (delivery_status IS NULL OR delivery_status IN ('pending_pickup', 'in_transit', 'delivered'));
ALTER TABLE sales ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES auth.users(id);

-- 2. Add 'driver' role to restaurant_members
-- Drop old constraint and recreate with driver role
ALTER TABLE restaurant_members
  DROP CONSTRAINT IF EXISTS restaurant_members_role_check;

ALTER TABLE restaurant_members
  ADD CONSTRAINT restaurant_members_role_check
    CHECK (role IN ('owner', 'admin', 'manager', 'staff', 'driver'));

-- 3. RLS policies for drivers
-- Drivers can view their assigned deliveries
CREATE POLICY IF NOT EXISTS "drivers_view_assigned_deliveries"
  ON sales FOR SELECT
  USING (assigned_driver_id = auth.uid());

-- Drivers can update status of their assigned deliveries
CREATE POLICY IF NOT EXISTS "drivers_update_delivery_status"
  ON sales FOR UPDATE
  USING (assigned_driver_id = auth.uid())
  WITH CHECK (
    assigned_driver_id = auth.uid()
    AND delivery_status IN ('in_transit', 'delivered')
  );

-- 4. Index for delivery queries (performance)
CREATE INDEX IF NOT EXISTS idx_sales_order_type ON sales(order_type);
CREATE INDEX IF NOT EXISTS idx_sales_delivery_status ON sales(delivery_status);
CREATE INDEX IF NOT EXISTS idx_sales_assigned_driver ON sales(assigned_driver_id);
