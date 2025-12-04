import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing job details actions...');
    try {
        // Setup: Create Client, Property, Job, Product
        const client = await prisma.client.create({
            data: { name: 'Test Client Job', email: 'test-job@example.com' },
        });
        const property = await prisma.property.create({
            data: { clientId: client.id, address: 'Job Details Lane', type: 'RESIDENTIAL' },
        });
        const job = await prisma.job.create({
            data: {
                propertyId: property.id,
                description: 'Test Job Details',
                scheduledAt: new Date(),
                status: 'PENDING',
            },
        });
        const product = await prisma.product.create({
            data: { name: 'Test Product', unit: 'liters', stock: 10 },
        });
        console.log('Setup complete. Job ID:', job.id);

        // 1. Update Status
        console.log('Updating status...');
        const updatedJob = await prisma.job.update({
            where: { id: job.id },
            data: { status: 'IN_PROGRESS' },
        });
        console.log('Status updated:', updatedJob.status);

        // 2. Add Note
        console.log('Adding note...');
        const note = await prisma.jobNote.create({
            data: { jobId: job.id, content: 'Test note content' },
        });
        console.log('Note added:', note.id);

        // 3. Add Photo
        console.log('Adding photo...');
        const photo = await prisma.jobPhoto.create({
            data: { jobId: job.id, url: 'http://example.com/photo.jpg', caption: 'Test caption' },
        });
        console.log('Photo added:', photo.id);

        // 4. Add Product Used
        console.log('Adding product used...');
        const usedProduct = await prisma.usedProduct.create({
            data: { jobId: job.id, productId: product.id, quantity: 2.5 },
        });
        console.log('Product used added:', usedProduct.quantity);

        // 5. Verify Fetch
        const fetchedJob = await prisma.job.findUnique({
            where: { id: job.id },
            include: { notes: true, photos: true, products: true },
        });
        console.log('Fetched Job:', {
            notes: fetchedJob?.notes.length,
            photos: fetchedJob?.photos.length,
            products: fetchedJob?.products.length,
        });

        // Cleanup
        await prisma.usedProduct.deleteMany({ where: { jobId: job.id } });
        await prisma.jobPhoto.deleteMany({ where: { jobId: job.id } });
        await prisma.jobNote.deleteMany({ where: { jobId: job.id } });
        await prisma.job.delete({ where: { id: job.id } });
        await prisma.property.delete({ where: { id: property.id } });
        await prisma.client.delete({ where: { id: client.id } });
        await prisma.product.delete({ where: { id: product.id } });
        console.log('Cleanup complete');

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
