import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = "c:/Users/samue/OneDrive/Desktop/ApexLead/Extermination ZLS/invoice.xlsx";
const outPath = "./invoices_all.json";

if (fs.existsSync(filePath)) {
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8");
  console.log("Wrote " + data.length + " invoices to " + outPath);
} else {
  console.log(`File not found: ${filePath}`);
}
