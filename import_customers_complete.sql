-- =============================================
-- Evaluna ERP - Customer Import Script
-- Imports customer data from Contacts.csv
-- =============================================

-- Set encoding and start transaction
SET client_encoding = 'UTF8';
BEGIN;

-- =============================================
-- 1. Ensure Branch Exists
-- =============================================
DO $$
DECLARE
    v_branch_id INTEGER;
BEGIN
    -- Try to get existing branch
    SELECT id INTO v_branch_id FROM branches LIMIT 1;

    IF NOT FOUND THEN
        -- Create main branch if none exists
        INSERT INTO branches (name, code, address, is_headquarters, created_at, updated_at)
        VALUES ('Main Warehouse', 'MAIN', 'Central Location', true, NOW(), NOW())
        RETURNING id INTO v_branch_id;
        RAISE NOTICE 'Created branch with ID: %', v_branch_id;
    ELSE
        RAISE NOTICE 'Using existing branch with ID: %', v_branch_id;
    END IF;
END $$;

-- =============================================
-- 2. Ensure Staff/User Exists (for user_uid)
-- =============================================
DO $$
DECLARE
    v_staff_id INTEGER;
BEGIN
    -- Try to get existing staff
    SELECT id INTO v_staff_id FROM staff LIMIT 1;

    IF NOT FOUND THEN
        -- Create admin staff if none exists
        INSERT INTO staff (branch_id, staff_code, name, email, phone, role, join_date, salary, status, created_at, updated_at)
        VALUES (
            (SELECT id FROM branches LIMIT 1),
            'ADMIN001',
            'System Administrator',
            'admin@evaluna.com',
            '+91 9999999999',
            'admin',
            '2023-01-01',
            '50000',
            'active',
            NOW(),
            NOW()
        )
        RETURNING id INTO v_staff_id;
        RAISE NOTICE 'Created staff with ID: %', v_staff_id;
    ELSE
        RAISE NOTICE 'Using existing staff with ID: %', v_staff_id;
    END IF;
END $$;

-- =============================================
-- 3. Import Customers from Contacts.csv
-- =============================================
-- Note: The actual INSERT statements are in the generated section below
-- We use the branch and staff ensured above

-- Include all customer INSERT statements from the generated file
\ir customers_insert.sql

-- =============================================
-- 4. Verification
-- =============================================
DO $$
DECLARE
    v_customer_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_customer_count FROM customers;
    RAISE NOTICE 'Import complete. Total customers in database: %', v_customer_count;
END $$;

COMMIT;

-- =============================================
-- 5. Sample Verification Queries
-- =============================================
-- Uncomment and run these to verify the import:

-- SELECT COUNT(*) as total_customers FROM customers;
--
-- SELECT name, phone, village
-- FROM customers
-- ORDER BY created_at DESC
-- LIMIT 10;
--
-- SELECT DISTINCT village, COUNT(*) as customer_count
-- FROM customers
-- GROUP BY village
-- ORDER BY customer_count DESC
-- LIMIT 10;