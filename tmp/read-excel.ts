import * as XLSX from 'xlsx';
import * as fs from 'fs';

const files = [
  "c:/Users/samue/OneDrive/Desktop/ApexLead/Extermination ZLS/items zls.xlsx",
  "c:/Users/samue/OneDrive/Desktop/ApexLead/Extermination ZLS/Tableau_devis_soumission.xlsx",
  "c:/Users/samue/OneDrive/Desktop/ApexLead/Extermination ZLS/estimate.xlsx"
];

files.forEach(file => {
  if (fs.existsSync(file)) {
      console.log(`--- Reading ${file} ---`);
      const workbook = XLSX.readFile(file);
      workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet);
          console.log(`Sheet: ${sheetName}`);
          console.log(JSON.stringify(data.slice(0, 20), null, 2));
      });
  } else {
      console.log(`File not found: ${file}`);
  }
});
