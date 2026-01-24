
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating latest invoice notes...');

    // Find the latest Renovation invoice
    const invoice = await prisma.invoice.findFirst({
        where: { division: 'RENOVATION' },
        orderBy: { createdAt: 'desc' },
        include: { job: true, items: { include: { product: true } } }
    });

    if (!invoice) {
        console.error('No Reno invoice found!');
        return;
    }

    if (!invoice.job) {
        console.error(`Invoice ${invoice.number} has no linked job!`);
        return;
    }

    console.log(`Found Invoice ${invoice.number} linked to Job ${invoice.job.id}`);

    const jobDescription = invoice.job.description || "";
    const warrantyNotes = invoice.items.map(i => i.product.warrantyInfo).filter(w => !!w).join("\n\n");

    const newNotes = [jobDescription, warrantyNotes].filter(Boolean).join("\n\n");

    console.log('New Notes:', newNotes);

    await prisma.invoice.update({
        where: { id: invoice.id },
        data: { notes: newNotes } // Field is 'notes' in Prisma schema? Wait.
        // Schema check: line 285 'notes String?'. Yes.
        // But in invoice-pdf.tsx it access 'invoice.note' (singular) on line 246?
        // "invoice.note && ..."
        // Let's check schema again. Schema says 'notes' (plural) on line 285.
        // Does the PDF component expect 'note' or 'notes'?
        // Layout check:
        // Line 246: {invoice.note && ...}
        // Line 249: <Text ...>{invoice.note}</Text>
        // The Type definition in PDF component: invoice: Invoice ...
        // Invoice generated type has 'notes'.
        // If the component uses 'invoice.note', it might be a typo in the component!
        // 'invoice' is the Prisma model. It has 'notes'. 'note' would be undefined.
        // Wait, let's look at invoice-pdf.tsx again.
    });

    console.log('Invoice updated.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
