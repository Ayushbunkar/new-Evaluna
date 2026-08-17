const fs = require('fs');

console.log('Testing CSV import...');

const csvContent = fs.readFileSync('Contacts.csv', 'utf8');
const lines = csvContent.split('\n');
const headers = lines[0].split(',');
const results = [];

// Parse CSV manually
for (let i = 1; i < lines.length; i++) {
  if (lines[i].trim() === '') continue;

  const values = lines[i].split(',');
  if (values.length >= 3) {
    results.push({
      name: values[0].trim(),
      phone: values[1].trim(),
      village: values[2].trim()
    });
  }
}

console.log(`Successfully parsed ${results.length} contacts`);
console.log('Sample data:');
console.log(results.slice(0, 5));

// Group by village to show statistics
const villageStats = {};
results.forEach(customer => {
  if (customer.village) {
    villageStats[customer.village] = (villageStats[customer.village] || 0) + 1;
  }
});

console.log('\nVillage distribution (top 10):');
Object.entries(villageStats)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([village, count]) => {
    console.log(`${village}: ${count} customers`);
  });

console.log(`\nTotal unique villages: ${Object.keys(villageStats).length}`);
console.log('Import script is ready to use!');
console.log('Run: node scripts/import-contacts.js (after configuring database)');