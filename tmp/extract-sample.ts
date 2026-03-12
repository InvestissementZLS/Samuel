import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = "c:/Users/samue/OneDrive/Desktop/ApexLead/Extermination ZLS/invoice.xlsx";
const outPath = "./invoice_sample.json";

if (fs.existsSync(filePath)) {
  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  
  const sample = {
    keys: Object.keys(data[0] || {}),
    rows: data.slice(0, 2)
  };
  fs.writeFileSync(outPath, JSON.stringify(sample, null, 2), "utf-8");
  console.log("Wrote sample to " + outPath);
} else {
  console.log(`File not found: ${filePath}`);
}
