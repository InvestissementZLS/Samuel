
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fixing invoice ENT-2026-0002...');

    // Find the invoice (using loose search in case number changed or I misremembered)
    const invoice = await prisma.invoice.findFirst({
        where: { division: 'RENOVATION' },
        orderBy: { createdAt: 'desc' },
        include: { items: true, job: true }
    });

    if (!invoice) {
        console.error('No Invoice found!');
        return;
    }

    console.log(`Found Invoice ${invoice.number} (ID: ${invoice.id})`);

    // 1. Remove "Converted from Quote..." from Job Description if present
    // Note: changing job description also changes invoice notes since we link them? 
    // Wait, my previous script COPIED job description to invoice notes. So I must update Invoice Notes directly.

    let newNotes = invoice.notes || "";
    const unwantedPrefix = /^Converted from Quote #[^\.]+\.\s*/;

    if (unwantedPrefix.test(newNotes)) {
        console.log('Detected unwanted prefix in notes. Removing...');
        newNotes = newNotes.replace(unwantedPrefix, "");
    }

    // Also check if Job description needs cleaning (for future reference)
    if (invoice.job && unwantedPrefix.test(invoice.job.description || "")) {
        await prisma.job.update({
            where: { id: invoice.jobId! },
            data: { description: (invoice.job.description || "").replace(unwantedPrefix, "") }
        });
        console.log('Cleaned Job description.');
    }

    // 2. Update Number to ENT-2026-5031 (or appropriate year)
    const year = new Date().getFullYear();
    const newNumber = `ENT-${year}-5031`;

    console.log(`Updating Number to ${newNumber} and Notes...`);

    try {
        await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                number: newNumber,
                notes: newNotes
            }
        });
        console.log('Invoice updated successfully.');
    } catch (e) {
        console.error('Error updating invoice (maybe number 5031 already exists?):', e);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
