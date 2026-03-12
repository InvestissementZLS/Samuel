import * as XLSX from 'xlsx';
import { prisma } from './lib/prisma';
import ts from "typescript";

function mapStatus(raw: string): string {
    const s = raw.toLowerCase();
    if (s.includes("paid")) return "PAID";
    if (s.includes("sent")) return "SENT";
    if (s.includes("overdue")) return "OVERDUE";
    if (s.includes("partially")) return "PARTIALLY_PAID";
    if (s.includes("cancelled") || s.includes("void")) return "CANCELLED";
    return "DRAFT";
}

function parseDateStr(str: string) {
    if (!str) return new Date();
    // Format is MM/DD/YYYY
    const parts = str.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    }
    return new Date();
}

const filePath = "c:/Users/samue/OneDrive/Desktop/ApexLead/Extermination ZLS/invoice.xlsx";

async function main() {
    console.log(`--- Reading ${filePath} ---`);
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "" });

    console.log(`Loaded ${rows.length} invoices from Excel. Executing import...`);
    let added = 0;
    let skipped = 0;

    for (const row of rows) {
        const invNumber = row["Invoice #"]?.toString();
        const clientName = row["Customer"];
        const dateStr = row["Date"];
        let totalVal = row["Total"]?.toString().replace(/[^0-9.-]+/g, "") || "0";
        if (totalVal === "") totalVal = "0";
        const total = parseFloat(totalVal);
        const status = mapStatus(row["Status"]) as any;

        if (!clientName || !invNumber) {
            skipped++;
            continue;
        }

        let client = await prisma.client.findFirst({
            where: { name: clientName }
        });

        if (!client) {
            client = await prisma.client.create({
                data: {
                    name: clientName,
                    divisions: ["EXTERMINATION"] as any
                }
            });
        }

        const exists = await prisma.invoice.findFirst({
            where: { number: invNumber }
        });

        if (exists) {
            skipped++;
            continue;
        }

        const issuedAndCreatedAt = parseDateStr(dateStr);

        await prisma.invoice.create({
            data: {
                number: invNumber,
                client: { connect: { id: client.id } },
                total,
                status,
                description: row["Job"],
                createdAt: issuedAndCreatedAt,
                issuedDate: issuedAndCreatedAt,
                amountPaid: status === "PAID" ? total : 0,
                division: "EXTERMINATION" as any,
                notes: row["Invoice Tags"]
            }
        });
        added++;
        if (added % 100 === 0) console.log(`Imported ${added} invoices...`);
    }

    console.log(`\nImport complete! Added: ${added}, Skipped: ${skipped}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
