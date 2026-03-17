import { getActiveTreatments } from "@/app/actions/recurring-actions";
import { startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { RecurringView } from "@/components/recurring/recurring-view";
import { cookies } from "next/headers";
import { Division } from "@prisma/client";

export default async function RecurringServicesPage() {
    const cookieStore = await cookies();
    const divisionVal = cookieStore.get('division')?.value || 'EXTERMINATION';
    const division = divisionVal as Division;

    const activeTreatments = await getActiveTreatments();

    const lastYearStart = new Date();
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
    lastYearStart.setMonth(lastYearStart.getMonth() - 1);

    const lastYearEnd = new Date();
    lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);
    lastYearEnd.setMonth(lastYearEnd.getMonth() + 1);

    const renewalCandidates = await prisma.job.findMany({
        where: {
            division,
            scheduledAt: {
                gte: lastYearStart,
                lte: lastYearEnd
            },
            status: 'COMPLETED',
            products: {
                some: {
                    product: {
                        name: { contains: 'Extérieur', mode: 'insensitive' }
                    }
                }
            }
        },
        include: {
            property: { include: { client: true } },
            products: { include: { product: true } }
        },
        take: 10
    });

    const backlogJobs = await prisma.job.findMany({
        where: {
            division,
            status: 'PENDING',
            parentJobId: { not: null },
            scheduledAt: { gte: startOfMonth(new Date()) },
            description: { contains: 'Included Service' }
        },
        include: { property: { include: { client: true } }, products: { include: { product: true } } },
        orderBy: { scheduledAt: 'asc' }
    });

    const safetyAlerts = await prisma.job.findMany({
        where: {
            division,
            status: 'PENDING',
            parentJobId: { not: null },
            scheduledAt: { lt: new Date() },
            description: { contains: 'Included Service' }
        },
        include: { property: { include: { client: true } }, products: { include: { product: true } } }
    });

    return (
        <RecurringView
            activeTreatments={activeTreatments}
            renewalCandidates={renewalCandidates}
            backlogJobs={backlogJobs}
            safetyAlerts={safetyAlerts}
        />
    );
}
