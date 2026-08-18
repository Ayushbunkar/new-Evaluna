-- Generated SQL to import customers from Contacts.csv
-- First, ensure we have a branch and staff record

-- Get or create the main branch
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

-- Get or create staff user (for user_uid)
DO $$
DECLARE
    v_staff_id INTEGER;
    v_user_uid VARCHAR(255);
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

    -- Get the user_uid from staff (assuming staff.id maps to a user or we use staff code)
    SELECT 'admin' INTO v_user_uid; -- Using 'admin' as the user_uid for simplicity
END $$;

-- Now insert customers from Contacts.csv
-- Note: Replace the VALUES below with the actual data from your CSV
INSERT INTO customers (
    branch_id, customer_code, name, email, phone, address, village,
    latitude, longitude, user_uid, status, gst_number, pan_number,
    credit_limit, credit_used, credit_hold, store_credit, payment_terms,
    customer_type, loyalty_tier, loyalty_points, tier_override,
    total_spent, lifetime_value, marketing_opt_in, created_at, updated_at,
    deleted_at, is_deleted
) VALUES