import { prisma } from './lib/prisma';
import ts from "typescript";

async function main() {
    console.log("Fetching invoices using exact application prisma logic...");
    const invoices = await prisma.invoice.findMany({
        select: {
            id: true,
            number: true,
            total: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log(invoices);
    
    // Check specific invoice 8623.13
    const spec = await prisma.invoice.findMany({
        where: { total: 8623.13 },
        select: {
            id: true,
            number: true,
            total: true,
            createdAt: true,
        }
    });
    console.log("Specific invoice:");
    console.log(spec);
}

main().catch(console.error).finally(() => prisma.$disconnect());
