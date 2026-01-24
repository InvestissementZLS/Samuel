
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start creating demo data...');

    // 1. Create Client
    const client = await prisma.client.create({
        data: {
            name: 'Katie Kepron',
            email: 'atiekepronfitness@gmail.com',
            phone: '(438) 822-4091',
            billingAddress: '143 59e Avenue, Saint-Hippolyte, QC, J8A1N9',
            language: 'FR',
            divisions: ['RENOVATION']
        }
    });

    console.log('Client created:', client.id);

    // 2. Create Products
    const removal = await prisma.product.create({
        data: {
            name: 'Insulation removal',
            description: 'Removal of existing insulation (including vacuum extraction, bagging, transportation, and disposal fees)',
            unit: 'sq. ft.',
            price: 0.95,
            division: 'RENOVATION',
            type: 'SERVICE'
        }
    });

    const replacement = await prisma.product.create({
        data: {
            name: 'Insulation replacement',
            description: 'Installation of blown-in cellulose insulation in the attic',
            unit: 'sq. ft.',
            price: 3.50,
            division: 'RENOVATION',
            type: 'SERVICE',
            warrantyInfo: 'Limited lifetime manufacturer’s warranty on the cellulose insulation'
        }
    });

    console.log('Products created');

    // 3. Create Quote
    const quote = await prisma.quote.create({
        data: {
            clientId: client.id,
            division: 'RENOVATION',
            number: 'Q-DEMO-001',
            issuedDate: new Date(),
            dueDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            description: `- Removal of existing insulation (including vacuum extraction, bagging, transportation, and disposal fees)
- Attic and soffit decontamination (cleaning and application of treatment products)
- Inspection of the polyethylene vapor barrier (installation of a new vapor barrier if required)
- Installation of blown-in cellulose insulation in the attic (approximately 2,000 sq. ft. of surface area)
- Drywall repair at two locations in the house
- Quality control inspection`,
            items: {
                create: [
                    {
                        productId: removal.id,
                        quantity: 2000,
                        price: 0.95,
                        taxRate: 0.14975, // Standard QC tax
                    },
                    {
                        productId: replacement.id,
                        quantity: 2000,
                        price: 3.50,
                        taxRate: 0.14975
                    }
                ]
            },
            // subtotal removed
            tax: 1332.78, // Approx
            total: 10232.78,
            status: 'DRAFT'
        }
    });

    console.log('Quote created:', quote.id);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
