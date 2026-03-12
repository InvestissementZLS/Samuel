import * as XLSX from 'xlsx';
import * as fs from 'fs';

const csvPath = "c:/Users/samue/OneDrive/Desktop/ApexLead/Extermination ZLS/Liste_de_prix_ZLS.csv";
const xlsxPath = "c:/Users/samue/OneDrive/Desktop/ApexLead/Extermination ZLS/items zls.xlsx";

function cleanPrice(p: any): number {
    if (typeof p === 'number') return p;
    if (!p) return 0;
    const s = String(p).replace(/[^0-9.]/g, '');
    return parseFloat(s) || 0;
}

async function run() {
    const servicesMap = new Map();

    // 1. Process CSV (Standard Price List)
    if (fs.existsSync(csvPath)) {
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').filter(l => l.trim());
        const header = lines.shift();
        lines.forEach(line => {
             // Simple CSV split (not robust for commas in quotes but good enough for this file seen)
             const [name, desc, price, warranty] = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
             if (!name) return;
             const cleanedName = name.replace(/"/g, '').trim();
             servicesMap.set(cleanedName, {
                 name: cleanedName,
                 description: desc?.replace(/"/g, '').trim(),
                 price: cleanPrice(price),
                 warrantyInfo: warranty?.replace(/"/g, '').trim(),
                 type: 'SERVICE',
                 division: 'EXTERMINATION'
             });
        });
    }

    // 2. Process XLSX (Internal Items)
    if (fs.existsSync(xlsxPath)) {
        const workbook = XLSX.readFile(xlsxPath);
        const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        data.forEach(item => {
            const name = item.Name?.trim();
            if (!name) return;
            
            // If already in map, maybe update description if XLSX is richer
            const existing = servicesMap.get(name);
            if (existing) {
                if (item.Description && (!existing.description || item.Description.length > existing.description.length)) {
                    existing.description = item.Description.trim();
                }
                // Prefer XLSX cost if CSV was 0? (Though CSV price is usually Retail)
                if (existing.price === 0 && item.Cost) {
                    existing.price = cleanPrice(item.Cost);
                }
            } else {
                // New item from XLSX
                servicesMap.set(name, {
                    name,
                    description: item.Description?.trim() || "",
                    price: cleanPrice(item.Cost), // Assuming Cost is the base price if no retail price found
                    type: 'SERVICE',
                    division: 'EXTERMINATION'
                });
            }
        });
    }

    const finalServices = Array.from(servicesMap.values()).filter(s => s.name !== "Service");
    console.log(JSON.stringify(finalServices, null, 2));
}

run();
