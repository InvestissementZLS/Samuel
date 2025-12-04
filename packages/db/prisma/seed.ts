import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    const client = await prisma.client.create({
        data: {
            name: 'Mme. Tremblay',
            email: 'tremblay@example.com',
            phone: '514-555-0199',
            billingAddress: '123 Rue Principale, Montréal, QC',
            properties: {
                create: {
                    address: '123 Rue Principale, Montréal, QC',
                    type: 'RESIDENTIAL',
                    accessInfo: 'Code porte: 1234',
                },
            },
        },
    });

    console.log('Created client:', client.name);

    const client2 = await prisma.client.create({
        data: {
            name: 'Restaurant Le Gourmet',
            email: 'contact@legourmet.ca',
            phone: '418-555-0123',
            billingAddress: '456 Boul. René-Lévesque, Québec, QC',
            properties: {
                create: {
                    address: '456 Boul. René-Lévesque, Québec, QC',
                    type: 'COMMERCIAL',
                    accessInfo: 'Entrée arrière',
                },
            },
        },
    });

    console.log('Created client:', client2.name);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
