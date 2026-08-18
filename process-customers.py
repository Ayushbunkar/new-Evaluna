#!/usr/bin/env python3
"""
Process Contacts.csv and generate SQL INSERT statements for customers table
"""
import csv
import re
import sys

def clean_string(s):
    """Clean and escape string for SQL"""
    if s is None:
        return None
    # Remove quotes and extra whitespace
    s = str(s).strip().strip('"').strip()
    # Escape single quotes for SQL
    s = s.replace("'", "''")
    return s

def clean_phone(phone):
    """Clean phone number"""
    if phone is None:
        return None
    # Remove quotes, spaces, and slashes
    phone = str(phone).strip().strip('"')
    phone = re.sub(r'[\s\/]', '', phone)
    # Limit to 20 characters
    if len(phone) > 20:
        phone = phone[:20]
    return phone if phone else None

def generate_customer_code(name):
    """Generate a customer code from name"""
    if name is None:
        return "UNKNOWN_0000"
    # Keep only alphanumeric and convert to uppercase
    clean = re.sub(r'[^a-zA-Z0-9]', '', str(name)).upper()
    if not clean:
        clean = "CUSTOMER"
    # Add random suffix
    import random
    suffix = random.randint(0, 9999)
    return f"{clean}_{suffix:04d}"

def generate_email(name):
    """Generate email from name"""
    if name is None:
        return "unknown@example.com"
    # Clean name for email
    clean = re.sub(r'[^a-zA-Z0-9]', '', str(name)).lower()
    if not clean:
        clean = "user"
    return f"{clean}@example.com"

def main():
    input_file = 'Contacts.csv'
    output_file = 'customers_insert.sql'

    print(f"Processing {input_file}...")

    customers = []
    skipped = 0

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)  # Skip header

            for row_num, row in enumerate(reader, start=2):
                if len(row) < 3:
                    print(f"Warning: Row {row_num} has insufficient columns, skipping")
                    skipped += 1
                    continue

                name, phone, village = row[0], row[1], row[2]

                # Clean inputs
                name = clean_string(name)
                phone = clean_phone(phone)
                village = clean_string(village)

                # Skip if any required field is empty
                if not name or not phone or not village:
                    print(f"Warning: Row {row_num} has empty required field, skipping")
                    skipped += 1
                    continue

                # Generate derived fields
                customer_code = generate_customer_code(name)
                email = generate_email(name)
                address = f"{village}, India"

                customers.append({
                    'branch_id': 1,
                    'customer_code': customer_code,
                    'name': name,
                    'email': email,
                    'phone': phone,
                    'address': address,
                    'village': village,
                    'latitude': None,
                    'longitude': None,
                    'user_uid': 'admin',
                    'status': 'active',
                    'gst_number': None,
                    'pan_number': None,
                    'credit_limit': '0.00',
                    'credit_used': '0.00',
                    'credit_hold': False,
                    'store_credit': '0.00',
                    'payment_terms': 30,
                    'customer_type': 'retail',
                    'loyalty_tier': 'bronze',
                    'loyalty_points': 0,
                    'tier_override': False,
                    'total_spent': '0.00',
                    'lifetime_value': '0.00',
                    'marketing_opt_in': True
                })

    except FileNotFoundError:
        print(f"Error: {input_file} not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error processing CSV: {e}")
        sys.exit(1)

    print(f"Processed {len(customers)} customers, skipped {skipped} rows")

    # Generate SQL
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- Generated SQL INSERT statements for customers table\n")
        f.write("-- Source: Contacts.csv\n")
        f.write("-- Generated on: " + str(__import__('datetime').datetime.now()) + "\n\n")

        f.write("SET client_encoding = 'UTF8';\n")
        f.write("BEGIN;\n\n")

        # Insert customers in batches to avoid too long queries
        batch_size = 50
        for i in range(0, len(customers), batch_size):
            batch = customers[i:i+batch_size]

            f.write(f"-- Batch {i//batch_size + 1} ({len(batch)} customers)\n")
            f.write("INSERT INTO customers (\n")
            f.write("    branch_id, customer_code, name, email, phone, address, village,\n")
            f.write("    latitude, longitude, user_uid, status, gst_number, pan_number,\n")
            f.write("    credit_limit, credit_used, credit_hold, store_credit, payment_terms,\n")
            f.write("    customer_type, loyalty_tier, loyalty_points, tier_override,\n")
            f.write("    total_spent, lifetime_value, marketing_opt_in, created_at, updated_at,\n")
            f.write("    deleted_at, is_deleted\n")
            f.write(") VALUES\n")

            values = []
            for cust in batch:
                # Format values for SQL
                def format_val(val):
                    if val is None:
                        return 'NULL'
                    elif isinstance(val, bool):
                        return 'true' if val else 'false'
                    elif isinstance(val, str):
                        return f"'{val}'"
                    else:
                        return str(val)

                value_tuple = f"({format_val(cust['branch_id'])}, {format_val(cust['customer_code'])}, {format_val(cust['name'])}, {format_val(cust['email'])}, {format_val(cust['phone'])}, {format_val(cust['address'])}, {format_val(cust['village'])}, {format_val(cust['latitude'])}, {format_val(cust['longitude'])}, {format_val(cust['user_uid'])}, {format_val(cust['status'])}, {format_val(cust['gst_number'])}, {format_val(cust['pan_number'])}, {format_val(cust['credit_limit'])}, {format_val(cust['credit_used'])}, {format_val(cust['credit_hold'])}, {format_val(cust['store_credit'])}, {format_val(cust['payment_terms'])}, {format_val(cust['customer_type'])}, {format_val(cust['loyalty_tier'])}, {format_val(cust['loyalty_points'])}, {format_val(cust['tier_override'])}, {format_val(cust['total_spent'])}, {format_val(cust['lifetime_value'])}, {format_val(cust['marketing_opt_in'])}, NOW(), NOW(), NULL, false)"
                values.append(value_tuple)

            f.write(",\n".join(values))
            f.write(";\n\n")

        f.write("COMMIT;\n")
        f.write("\n-- Insert complete. Total customers imported: " + str(len(customers)) + "\n")

    print(f"SQL statements written to {output_file}")

    # Also create a simple verification query
    with open('verify_import.sql', 'w', encoding='utf-8') as f:
        f.write("-- Verification query for imported customers\n")
        f.write("SELECT COUNT(*) as total_customers FROM customers;\n")
        f.write("SELECT name, phone, village FROM customers ORDER BY created_at DESC LIMIT 10;\n")

if __name__ == '__main__':
    main()