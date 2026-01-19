
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { updateJobStatus } = require('./apps/web/app/actions/job-tracking-actions');

async function testAutomation() {
    console.log("--- Starting Automation Test ---");

    // 1. Find a technician/admin for salesRep and supervisor
    const user = await prisma.user.findFirst({ where: { email: 'samuel.leveille.forex@gmail.com' } });
    if (!user) throw new Error("User not found");

    // 2. Create a Client and Property
    const client = await prisma.client.create({
        data: { name: "Test Automation Client", email: "test@example.com" }
    });

    const property = await prisma.property.create({
        data: { clientId: client.id, address: "123 Automation St" }
    });

    // 3. Create a Quote (REQUIRED for Sales Commission)
    const quote = await prisma.quote.create({
        data: {
            clientId: client.id,
            propertyId: property.id,
            salesRepId: user.id,
            status: 'ACCEPTED',
            total: 500,
            number: "Q-TEST-001"
        }
    });

    // 4. Create a Job linked to that Quote
    const job = await prisma.job.create({
        data: {
            propertyId: property.id,
            quoteId: quote.id,
            salesRepId: user.id,
            supervisorId: user.id,
            status: 'SCHEDULED', // Starting state
            scheduledAt: new Date(),
            netSellingPrice: 500,
            totalProfit: 200, // Important for commission amount calculation
            division: 'EXTERMINATION'
        }
    });

    console.log(`Created Job ${job.id} linked to Quote ${quote.id}`);

    // 5. Trigger Completion
    console.log("Triggering COMPLETED status...");
    await updateJobStatus(job.id, 'COMPLETED');

    // 6. Verification
    console.log("\n--- Verification Results ---");

    const updatedJob = await prisma.job.findUnique({
        where: { id: job.id },
        include: {
            invoices: true,
            commissions: { include: { user: true } }
        }
    });

    console.log("Job Status:", updatedJob.status);
    console.log("Invoices Found:", updatedJob.invoices.length);
    if (updatedJob.invoices[0]) {
        console.log("Invoice Status:", updatedJob.invoices[0].status);
        console.log("Invoice Number:", updatedJob.invoices[0].number);
    }

    console.log("Commissions Created:", updatedJob.commissions.length);
    updatedJob.commissions.forEach(c => {
        console.log(`- ${c.role}: $${c.amount} to ${c.user.email} (Status: ${c.status})`);
    });

    // Cleanup
    // await prisma.commission.deleteMany({ where: { jobId: job.id } });
    // await prisma.invoice.deleteMany({ where: { jobId: job.id } });
    // await prisma.job.delete({ where: { id: job.id } });
    // ...
}

testAutomation()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
