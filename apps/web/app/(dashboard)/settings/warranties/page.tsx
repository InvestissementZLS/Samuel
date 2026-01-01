import { prisma } from '@/lib/prisma';
import { WarrantySettings } from '@/components/settings/warranty-settings';

export default async function WarrantiesPage() {
    // @ts-ignore
    const warranties = await prisma.warrantyTemplate.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Warranty Templates</h1>
            <p className="text-gray-500 mb-8">Manage reusable warranty templates for your services.</p>

            <WarrantySettings initialWarranties={warranties} />
        </div>
    );
}
