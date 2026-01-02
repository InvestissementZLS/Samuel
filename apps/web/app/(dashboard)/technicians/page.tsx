
import { prisma } from '@/lib/prisma';
import { TechnicianList } from '@/components/technicians/technician-list';
import { cookies } from "next/headers";
import { dictionary } from "@/lib/i18n/dictionary";
export default async function TechniciansPage() {
    const cookieStore = cookies();
    const lang = cookieStore.get("NEXT_LOCALE")?.value || "en";
    const t = dictionary[lang as keyof typeof dictionary] || dictionary.en;
    const userId = cookieStore.get("auth_token")?.value;

    let isAdmin = false;
    if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        isAdmin = user?.role === "ADMIN";
    }

    const technicians = await prisma.user.findMany({
        where: {
            role: { in: ['TECHNICIAN', 'OFFICE', 'ADMIN'] },
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
