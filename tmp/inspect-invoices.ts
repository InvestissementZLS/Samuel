import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = "c:/Users/samue/OneDrive/Desktop/ApexLead/Extermination ZLS/invoice.xlsx";

if (fs.existsSync(filePath)) {
  console.log(`--- Reading ${filePath} ---`);
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  console.log(`First row keys:`, Object.keys(data[0] || {}));
  console.log(`First 2 rows:`, JSON.stringify(data.slice(0, 2), null, 2));
} else {
  console.log(`File not found: ${filePath}`);
}
