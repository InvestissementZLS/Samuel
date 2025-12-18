import { prisma } from '@/lib/prisma';
import { TechnicianList } from '@/components/technicians/technician-list';
import { cookies } from "next/headers";

export default async function TechniciansPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("auth_token")?.value;

    let isAdmin = false;
    if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        isAdmin = user?.role === "ADMIN";
    }

    const technicians = await prisma.user.findMany({
        where: {
            role: 'TECHNICIAN',
            ...(isAdmin ? {} : { isActive: true }) // Only show active technicians if not admin
        },
        orderBy: { name: 'asc' },
    });

    return (
        <div className="p-8">
            <TechnicianList technicians={technicians} canCreate={isAdmin} />
        </div>
    );
}
