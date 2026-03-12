import * as fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('c:/Users/samue/OneDrive/Desktop/Antigravity - Folder/tmp/cleaned_services_utf8.json', 'utf8').replace(/^\uFEFF/, ''));

const CATEGORIES = {
    SOURIS: ["souris", "mouse", "mulot", "rongeur", "rat"],
    FOURMIS: ["fourmis", "ants", "pharaon", "charpenti"],
    GUEPES: ["guêpes", "wasp", "frelon", "nid"],
    PUNAISES: ["punaises de lit", "bed bug", "aprehend"],
    ARAIGNEES: ["araignées", "spider"],
    CAPTURE: ["capture", "écureuil", "raton", "marmotte", "mouffette", "squirrel", "raccoon"],
    CALFEUTRAGE: ["calfeutrage", "blocage", "scellement", "colmatage"],
    COQUERELLES: ["coquerelle", "blatte", "cockroach"]
};

function getCategory(name: string) {
    const n = name.toLowerCase();
    for (const [cat, keywords] of Object.entries(CATEGORIES)) {
        if (keywords.some(k => n.includes(k))) return cat;
    }
    return "AUTRE";
}

// Cleaning logic
const processed = rawData
    .filter(s => {
        const n = s.name.toLowerCase();
        // Exclude specific client mentions or clearly non-service items
        if (n.includes("brozak") || n.includes("san leone") || n.includes("pizza")) return false;
        if (n.includes("station") || n.includes("case") || n.includes("dosage")) return false;
        if (n === "autre" || n === "test" || n === "dossier") return false;
        return true;
    })
    .map(s => {
        // Clean descriptions of weird encoding issues seen in previous step
        let desc = s.description || "";
        desc = desc.replace(/[├®┬áÔÇÖ┬«├¿├á]/g, (match: string) => {
            const map: any = { '├®': 'é', '┬á': ' ', 'ÔÇÖ': "'", '┬«': '®', '├¿': 'è', '├á': 'à' };
            return map[match] || match;
        });
        
        return {
            ...s,
            category: getCategory(s.name),
            description: desc.trim()
        };
    });

// Deduplicate by name first, keep richer description/price
const uniqueMap = new Map();
processed.forEach(s => {
    const existing = uniqueMap.get(s.name);
    if (!existing || (s.description.length > existing.description.length) || (existing.price === 0 && s.price > 0)) {
        uniqueMap.set(s.name, s);
    }
});

const finalCatalog = Array.from(uniqueMap.values())
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

console.log(JSON.stringify(finalCatalog, null, 2));
