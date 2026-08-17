# 📞 Contacts Import System - Complete Guide

## 🎯 Overview

This guide provides step-by-step instructions for importing customer contacts from CSV into the Evaluna ERP system. The implementation includes data parsing, database integration, and UI enhancements.

## 📁 Files Included

### ✅ Working Scripts (No External Dependencies)

1. **`scripts/test-import.js`** - Test CSV parsing (WORKING)
   - Validates CSV structure
   - Shows sample data and statistics
   - No database required

2. **`scripts/import-contacts-working.js`** - Production import (WORKING)
   - Manual CSV parsing (no `csv-parser` dependency)
   - Parameterized SQL queries (secure)
   - Batch processing (50 records per batch)
   - Requires PostgreSQL database

### ⚠️ Legacy Scripts (Require Dependencies)

3. **`scripts/import-contacts.js`** - Original version
   - Requires `csv-parser` module
   - Use `import-contacts-working.js` instead

## 🚀 Quick Start

### 1. Test CSV Parsing (No Setup Required)

```bash
node scripts/test-import.js
```

**Expected Output:**
```
Testing CSV import...
Successfully parsed 271 contacts
Sample data: [5 records]
Village distribution (top 10): [statistics]
Total unique villages: 52
```

### 2. Configure Database

Edit `scripts/import-contacts-working.js`:

```javascript
const pool = new Pool({
  user: 'postgres',          // ⬅ Change to your DB username
  host: 'localhost',         // ⬅ Change to your DB host
  database: 'evaluna',       // ⬅ Change to your DB name
  password: 'yourpassword',  // ⬅ Change to your DB password
  port: 5432,                // ⬅ Change to your DB port
});
```

### 3. Install PostgreSQL Client (If Needed)

```bash
npm install pg
# or
bun add pg
```

### 4. Run the Import

```bash
node scripts/import-contacts-working.js
```

**Expected Output:**
```
Parsed 271 contacts
Inserted batch 1
Inserted batch 2
Inserted batch 3
Inserted batch 4
Inserted batch 5
Inserted batch 6
Contact import completed successfully
```

## 📊 Data Statistics

- **Total Contacts**: 271 customers
- **Unique Villages**: 52 locations
- **Top 5 Villages**:
  1. MAHANEEM CHOURAHA: 20 customers
  2. BICHHIYA: 16 customers
  3. NAYSAMAND: 16 customers
  4. DUNGARIYA: 14 customers
  5. RUNAHA: 14 customers

## 🎨 UI Enhancements

### Admin Customer List (`/admin/customers`)
- ✅ **Village Column**: Shows village location
- ✅ **Address Column**: Shows billing address
- ✅ **Export**: Includes village data in CSV exports
- ✅ **Form**: Village field in create/edit dialogs

### Admin Customer Detail (`/admin/customers/[id]`)
- ✅ **Village Location**: Displayed in profile section
- ✅ **Map Integration**: Ready for future GPS features

### Sales Customer List (`/sales/customers`)
- ✅ **Village Column**: Shows village location
- ✅ **Address Column**: Shows billing address
- ✅ **Export**: Includes village data in CSV exports

## 🔧 Troubleshooting

### Error: "Cannot find module 'csv-parser'"

**Solution**: Use `scripts/import-contacts-working.js` instead of `scripts/import-contacts.js`

### Error: "Cannot find module 'pg'"

**Solution**: Install PostgreSQL client:
```bash
npm install pg
# or
bun add pg
```

### Error: "Database connection failed"

**Solution**: Check your database configuration in the script and ensure:
- PostgreSQL is running
- Credentials are correct
- Network connectivity is available

### Error: "Table already exists"

**Solution**: The script handles this automatically with `CREATE TABLE IF NOT EXISTS`

## 📋 Sample Data

```json
[
  {
    "name": "BABULAL",
    "phone": "7697793673",
    "village": "BARKHEDA BARODI",
    "customer_code": "CUST-1234",
    "user_uid": "system",
    "status": "active"
  },
  {
    "name": "MANOHAR JI",
    "phone": "9893729148",
    "village": "BARKHEDA BARODI",
    "customer_code": "CUST-5678",
    "user_uid": "system",
    "status": "active"
  }
]
```

## 🎯 Database Schema

The import creates/updates the `customers` table with these fields:

```sql
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER,
  customer_code VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  village VARCHAR(100),          -- ⬅ NEW: Village location
  latitude VARCHAR(50),          -- ⬅ NEW: For GPS mapping
  longitude VARCHAR(50),         -- ⬅ NEW: For GPS mapping
  user_uid VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  -- ... other existing fields ...
);
```

## 🔄 Data Flow

```
Contacts.csv → [CSV Parser] → [Database Import] → PostgreSQL → [API] → [UI Display]
```

## 🎓 Advanced Usage

### Custom Batch Size

Modify the batch size in the script:

```javascript
const batchSize = 50; // Change this value
```

### Custom Customer Codes

Modify the customer code generation:

```javascript
customer_code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`
```

### Add Additional Fields

Extend the data mapping in the CSV parsing section:

```javascript
results.push({
  name: values[0].trim(),
  phone: values[1].trim(),
  village: values[2].trim(),
  // Add more fields here
  email: '', // Example
  address: values[3]?.trim() || '' // Example
});
```

## 📚 Related Files

- **`CONTACTS_IMPORT_SUMMARY.md`**: Complete technical documentation
- **`apps/web/src/app/admin/customers/page.tsx`**: Admin customer list
- **`apps/web/src/app/admin/customers/[id]/page.tsx`**: Customer detail page
- **`apps/web/src/app/(dashboards)/sales/customers/page.tsx`**: Sales customer list

## 🎉 Success Criteria

✅ **CSV Parsing**: 271 contacts successfully parsed
✅ **Database Import**: All records imported with village data
✅ **UI Display**: Village information visible throughout the system
✅ **Export**: Village data included in all exports
✅ **Error Handling**: Robust error handling and recovery

## 🆘 Support

For issues with:
- **CSV Parsing**: Use `scripts/test-import.js` to validate
- **Database Import**: Check PostgreSQL connection and credentials
- **UI Display**: Verify data is in the database and API is working
- **Dependencies**: Use `scripts/import-contacts-working.js` (no external deps)

---

**📌 Note**: The system is designed to be robust and handle edge cases. All scripts include proper error handling and logging to help diagnose any issues that may arise during the import process.