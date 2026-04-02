const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const rootDir = process.argv[2];
const files = [
  'customers (1).xlsx',
  'items zls.xlsx',
  'estimate.xlsx',
  'invoice.xlsx'
];

const results = {};

for (const file of files) {
  const fullPath = path.join(rootDir, file);
  if (fs.existsSync(fullPath)) {
    try {
      const workbook = xlsx.readFile(fullPath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      // Convert to JSON
      const json = xlsx.utils.sheet_to_json(sheet, { defval: "" });
      
      results[file] = {
        totalRows: json.length,
        headers: json.length > 0 ? Object.keys(json[0]) : [],
        sampleFirstRow: json.length > 0 ? json[0] : null
      };
    } catch (e) {
      results[file] = { error: e.message };
    }
  } else {
    results[file] = { error: "File not found" };
  }
}

fs.writeFileSync('excel-structure.json', JSON.stringify(results, null, 2), 'utf8');
console.log("Written to excel-structure.json");
