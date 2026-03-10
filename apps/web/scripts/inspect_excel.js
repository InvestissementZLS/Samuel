const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const dir = 'C:/Users/samue/Videos/CSV Exterminationzls';
const files = ['customers (1).xlsx', 'estimate.xlsx', 'invoice.xlsx'];
const result = {};

files.forEach(fileName => {
    try {
        const filePath = path.join(dir, fileName);
        const workbook = XLSX.readFile(filePath);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        result[fileName] = {
            headers: data[0] || [],
            sampleRow: data[1] || []
        };
    } catch (e) {
        console.error(`Error reading ${fileName}:`, e.message);
    }
});

fs.writeFileSync(path.join(__dirname, 'analysis.json'), JSON.stringify(result, null, 2));
console.log('Saved to analysis.json');
