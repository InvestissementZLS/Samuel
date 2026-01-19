import { getActiveTreatments } from "@/app/actions/recurring-actions";
import { startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { RecurringView } from "@/components/recurring/recurring-view";

export default async function RecurringServicesPage() {
    const activeTreatments = await getActiveTreatments();

    // Mock "Annual Renewals" - In real app, query jobs from exactly 1 year ago (-11 to -13 months window)
    const lastYearStart = new Date();
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
    lastYearStart.setMonth(lastYearStart.getMonth() - 1);

    const lastYearEnd = new Date();
    lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);
    lastYearEnd.setMonth(lastYearEnd.getMonth() + 1);

    const renewalCandidates = await prisma.job.findMany({
        where: {
            scheduledAt: {
                gte: lastYearStart,
                lte: lastYearEnd
            },
            status: 'COMPLETED',
            products: {
                some: {
                    product: {
                        name: { contains: 'Extérieur', mode: 'insensitive' } // Filter for exterior treatments
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

    // -- Backlog & Safety Logic --
    const currentMonth = new Date().getMonth() + 1;

    // Find Deferred Jobs (Backlog) - Pending Jobs that are "Included" (have parent) and are for this season
    const backlogJobs = await prisma.job.findMany({
        where: {
            status: 'PENDING',
            parentJobId: { not: null },
            scheduledAt: { gte: startOfMonth(new Date()) }, // Future or now
            description: { contains: 'Included Service' }
        },
        include: { property: { include: { client: true } }, products: { include: { product: true } } },
        orderBy: { scheduledAt: 'asc' }
    });

    // Find Safety Alerts - Included Jobs that should have been done but date passed (or close to end of season)
    // Simplified: Pending tasks older than today? Or specifically late in season.
    // Let's grab Pending tasks that align with "Season End" logic if possible, or just overdue Pending.
    const safetyAlerts = await prisma.job.findMany({
        where: {
            status: 'PENDING',
            parentJobId: { not: null },
            scheduledAt: { lt: new Date() }, // Overdue
            description: { contains: 'Included Service' } // specific to deferred
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
