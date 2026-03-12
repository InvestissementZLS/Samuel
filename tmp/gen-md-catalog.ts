import * as fs from 'fs';

const buffer = fs.readFileSync('c:/Users/samue/OneDrive/Desktop/Antigravity - Folder/tmp/final_catalog.json');
let content = '';
if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    content = buffer.toString('utf16le');
} else {
    content = buffer.toString('utf8');
}
const catalog = JSON.parse(content.replace(/^\uFEFF/, ''));

function cleanHex(str: string) {
    // Basic cleanup for characters that might have been mangled
    return str
        .replace(/├®/g, 'é')
        .replace(/┬á/g, ' ')
        .replace(/ÔÇÖ/g, "'")
        .replace(/┬«/g, '®')
        .replace(/├¿/g, 'è')
        .replace(/├á/g, 'à')
        .replace(/Ôö£┬«/g, 'é')
        .replace(/Ôö£Ôòùt/g, 'ût')
        .replace(/Ôö£┬¼/g, 'ê')
        .replace(/Ôö£├í/g, 'à')
        .replace(/├ö├ç├┤/g, '-')
        .replace(/├ö├ç├û/g, "'")
        .replace(/Ôö¼┬½/g, '®')
        .replace(/Ôö¼┬ó/g, '½')
        .trim();
}

let md = "# Catalogue des Services - Extermination ZLS\n\nVoici la compilation nettoyée de vos services. J'ai regroupé les doublons et filtré les équipements.\n\n";

const groups: any = {};
catalog.forEach((s: any) => {
    if (!groups[s.category]) groups[s.category] = [];
    groups[s.category].push(s);
});

for (const [cat, services] of Object.entries(groups)) {
    md += `## ${cat}\n\n`;
    md += "| Service | Description | Prix | Garantie |\n";
    md += "| :--- | :--- | :--- | :--- |\n";
    (services as any[]).forEach(s => {
        const name = cleanHex(s.name);
        const desc = cleanHex(s.description || "").slice(0, 150) + (s.description?.length > 150 ? "..." : "");
        const price = s.price > 0 ? `${s.price}$` : "Sur devis";
        const warranty = s.warrantyInfo || "N/A";
        md += `| **${name}** | ${desc} | ${price} | ${warranty} |\n`;
    });
    md += "\n";
}

fs.writeFileSync('c:/Users/samue/OneDrive/Desktop/Antigravity - Folder/tmp/service_catalog_review.md', md);
console.log("Markdown review generated at tmp/service_catalog_review.md");
