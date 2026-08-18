-- Verification query for imported customers
SELECT COUNT(*) as total_customers FROM customers;
SELECT name, phone, village FROM customers ORDER BY created_at DESC LIMIT 10;
