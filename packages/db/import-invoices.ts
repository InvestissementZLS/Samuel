import { PrismaClient, InvoiceStatus, Division } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

function mapStatus(raw: string): InvoiceStatus {
    const s = raw.toLowerCase();
    if (s.includes("paid")) return InvoiceStatus.PAID;
    if (s.includes("sent")) return InvoiceStatus.SENT;
    if (s.includes("overdue")) return InvoiceStatus.OVERDUE;
    if (s.includes("partially")) return InvoiceStatus.PARTIALLY_PAID;
    if (s.includes("cancelled") || s.includes("void")) return InvoiceStatus.CANCELLED;
    return InvoiceStatus.DRAFT;
}

function parseDateStr(str: string) {
    if (!str) return new Date();
    const parts = str.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    }
    return new Date();
}

async function main() {
    const filePath = "c:/Users/samue/OneDrive/Desktop/Antigravity - Folder/tmp/invoices_all.json";
    if (!fs.existsSync(filePath)) {
        console.error("JSON file not found at " + filePath);
        process.exit(1);
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const rows = JSON.parse(rawData);

    console.log(`Loaded ${rows.length} invoices. Executing import...`);
    let added = 0;
    let skipped = 0;

    for (const row of rows) {
        const invNumber = row["Invoice #"]?.toString();
        const clientName = row["Customer"];
        const dateStr = row["Date"];
        let totalVal = row["Total"]?.toString().replace(/[^0-9.-]+/g, "") || "0";
        if (totalVal === "") totalVal = "0";
        const total = parseFloat(totalVal);
        const status = mapStatus(row["Status"]);

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
                    divisions: [Division.EXTERMINATION]
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
                amountPaid: status === InvoiceStatus.PAID ? total : 0,
                division: Division.EXTERMINATION,
                notes: row["Invoice Tags"]
            }
        });
        added++;
        if (added % 100 === 0) console.log(`Imported ${added} invoices...`);
    }

    console.log(`\nImport complete! Added: ${added}, Skipped: ${skipped}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
