import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';

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
    const parts = str.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    }
    return new Date();
}

export async function GET() {
    const filePath = "c:/Users/samue/OneDrive/Desktop/Antigravity - Folder/tmp/invoices_all.json";

    try {
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ success: false, error: 'JSON file not found' }, { status: 404 });
        }

        const rawData = fs.readFileSync(filePath, 'utf-8');
        const rows = JSON.parse(rawData);

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
        }

        return NextResponse.json({ success: true, added, skipped });
    } catch (error: any) {
        console.error("IMPORT ERROR:");
        console.error(error);
        return new Response(JSON.stringify({ success: false, error: error.message, stack: error.stack }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
