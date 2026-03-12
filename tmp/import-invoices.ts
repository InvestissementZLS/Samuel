import * as XLSX from 'xlsx';
import { PrismaClient, InvoiceStatus, Division } from '@prisma/client';

const prisma = new PrismaClient();
const filePath = "c:/Users/samue/OneDrive/Desktop/ApexLead/Extermination ZLS/invoice.xlsx";

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
    // Format is MM/DD/YYYY
    const parts = str.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    }
    return new Date();
}

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
        const total = parseFloat(row["Total"]?.toString().replace(/[^0-9.-]+/g, "") || "0");
        const status = mapStatus(row["Status"]);

        if (!clientName || !invNumber) {
            skipped++;
            continue;
        }

        // 1. Fetch Client
        let client = await prisma.client.findFirst({
            where: { name: clientName }
        });

        if (!client) {
            // Create client if not found
            client = await prisma.client.create({
                data: {
                    name: clientName,
                    divisions: [Division.EXTERMINATION]
                }
            });
        }

        // 2. Check if invoice already exists
        const exists = await prisma.invoice.findFirst({
            where: { number: invNumber }
        });

        if (exists) {
            skipped++;
            continue;
        }

        const issuedAndCreatedAt = parseDateStr(dateStr);

        // 3. Create Invoice
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

    console.log(`\nImport complete!`);
    console.log(`Added: ${added}`);
    console.log(`Skipped (missing data or already exists): ${skipped}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
