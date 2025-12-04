import { prisma } from '@/lib/prisma';
import { TechnicianList } from '@/components/technicians/technician-list';

export default async function TechniciansPage() {
    const technicians = await prisma.user.findMany({
        where: { role: 'TECHNICIAN' },
        orderBy: { name: 'asc' },
    });

    return (
        <div className="p-8">
            <TechnicianList technicians={technicians} />
        </div>
    );
}
