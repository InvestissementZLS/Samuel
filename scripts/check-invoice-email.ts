
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const invoiceNumber = 'ENT-2026-5031';
    console.log(`Checking email for Invoice ${invoiceNumber}...`);

    const invoice = await prisma.invoice.findFirst({
        where: { number: invoiceNumber },
        include: { client: true }
    });

    if (!invoice) {
        console.error('Invoice not found!');
        return;
    }

    if (!invoice.client) {
        console.error('No client linked to this invoice!');
        return;
    }

    console.log(`Client Name: ${invoice.client.name}`);
    console.log(`Client Email: ${invoice.client.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
