import { prisma } from '@/lib/prisma';
import { WarrantyView } from '@/components/settings/warranty-view';

export default async function WarrantiesPage() {
    // @ts-ignore
    const warranties = await prisma.warrantyTemplate.findMany({
        orderBy: { name: 'asc' }
    });

    return <WarrantyView warranties={warranties} />;
}
