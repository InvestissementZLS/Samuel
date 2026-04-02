import { PrismaClient, Division, ProductType, QuoteStatus, InvoiceStatus } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();
const ROOT_DIR = path.resolve(__dirname, '../../');

function parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    // Excel might pass a number for date (serial)
    if (typeof dateStr === 'number') {
        return new Date(Math.round((dateStr - 25569) * 86400 * 1000));
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
}

function parseCurrency(str: any): number {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
}

function mapQuoteStatus(status: string): QuoteStatus {
    const s = (status || "").toLowerCase();
    if (s.includes('accept')) return 'ACCEPTED';
    if (s.includes('reject')) return 'REJECTED';
    if (s.includes('sent') || s.includes('pending')) return 'SENT';
    return 'DRAFT';
}

function mapInvoiceStatus(status: string): InvoiceStatus {
    const s = (status || "").toLowerCase();
    if (s.includes('paid')) return 'PAID';
    if (s.includes('partially')) return 'PARTIALLY_PAID';
    if (s.includes('overdue')) return 'OVERDUE';
    if (s.includes('sent')) return 'SENT';
    if (s.includes('cancel')) return 'CANCELLED';
    return 'DRAFT';
}

async function main() {
    console.log("🚀 Starting Data Import Process...");

    // 1. Setup Generic Product for Legacy Quotes/Invoices
    let genericProduct = await prisma.product.findFirst({
        where: { name: "Service Importé", division: "EXTERMINATION" }
    });
    if (!genericProduct) {
        genericProduct = await prisma.product.create({
            data: {
                name: "Service Importé",
                description: "Service importé de l'ancien système",
                price: 0,
                unit: "unité",
                type: "SERVICE",
                division: "EXTERMINATION"
            }
        });
        console.log("✅ Created Generic Product for Legacy Items");
    }

    console.log(`✅ Skipping Customers...`);

    // Refresh Client map for Quotes/Invoices lookup
    const allClients = await prisma.client.findMany({ select: { id: true, name: true }});
    const clientMap = new Map(allClients.map(c => [c.name.toLowerCase(), c.id]));

    console.log(`✅ Skipping Products...`);

    // --- IMPORT ESTIMATES (QUOTES) ---
    const estimateFile = path.join(ROOT_DIR, 'estimate.xlsx');
    console.log(`\n📂 Reading Estimates: ${estimateFile}`);
    const estimateSheet = xlsx.utils.sheet_to_json(xlsx.readFile(estimateFile).Sheets[xlsx.readFile(estimateFile).SheetNames[0]], { defval: "" });
    let quotesCreated = 0;

    for (const row of estimateSheet as any[]) {
        const quoteNum = String(row['Estimate']);
        if (!quoteNum) continue;

        const customerName = (row['Customer'] || "").trim().toLowerCase();
        const clientId = clientMap.get(customerName);
        if (!clientId) continue; // Skip if client not found

        const existingQuote = await prisma.quote.findFirst({ where: { poNumber: quoteNum, clientId } });
        if (!existingQuote) {
            const total = parseCurrency(row['Total']);
            const status = mapQuoteStatus(row['Status']);
            const date = parseDate(row['Date']);

            await prisma.quote.create({
                data: {
                    poNumber: quoteNum,
                    clientId,
                    division: "EXTERMINATION",
                    status,
                    total,
                    tax: 0,
                    createdAt: date,
                    updatedAt: date,
                    description: "Ancienne soumission #" + quoteNum,
                    items: {
                        create: [{
                            productId: genericProduct.id,
                            description: "Extermination - Service importé",
                            quantity: 1,
                            price: total,
                        }]
                    }
                }
            });
            quotesCreated++;
        }
    }
    console.log(`✅ Estimates (Quotes): ${quotesCreated} created.`);

    // --- IMPORT INVOICES ---
    const invoiceFile = path.join(ROOT_DIR, 'invoice.xlsx');
    console.log(`\n📂 Reading Invoices: ${invoiceFile}`);
    const invoiceSheet = xlsx.utils.sheet_to_json(xlsx.readFile(invoiceFile).Sheets[xlsx.readFile(invoiceFile).SheetNames[0]], { defval: "" });
    let invoicesCreated = 0;

    for (const row of invoiceSheet as any[]) {
        const invNum = String(row['Invoice #']);
        if (!invNum) continue;

        const customerName = (row['Customer'] || "").trim().toLowerCase();
        const clientId = clientMap.get(customerName);
        if (!clientId) continue;

        const existingInv = await prisma.invoice.findFirst({ where: { number: invNum } });
        if (!existingInv) {
            const total = parseCurrency(row['Total']);
            const status = mapInvoiceStatus(row['Status']);
            const date = parseDate(row['Date']);
            const terms = row['Payment Terms'] || "";

            await prisma.invoice.create({
                data: {
                    number: invNum,
                    clientId,
                    division: "EXTERMINATION",
                    status,
                    total,
                    tax: 0,
                    terms,
                    issuedDate: date,
                    createdAt: date,
                    updatedAt: date,
                    items: {
                        create: [{
                            productId: genericProduct.id,
                            description: "Extermination - Service facturé importé",
                            quantity: 1,
                            price: total,
                        }]
                    }
                }
            });
            invoicesCreated++;
        }
    }
    console.log(`✅ Invoices: ${invoicesCreated} created.`);
    
    console.log("\n🎉 IMPORT PROCESS COMPLETED!");
}

main()
  .catch(e => {
    console.error("❌ Fatal Error during import:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
