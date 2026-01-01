import { Metadata } from "next";
import { CalendarView } from "@/components/calendar/calendar-view";
import { serialize } from '@/lib/serialization';
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Calendar | Field Service App",
    description: "Schedule and manage jobs",
};

export default async function CalendarPage() {
    const [jobs, clients, technicians] = await Promise.all([
        prisma.job.findMany({
            include: {
                property: {
                    include: {
                        client: true,
                    },
                },
                technicians: true,
                invoices: true,
                activities: {
                    include: {
                        user: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
            },
        }),
        prisma.client.findMany({
            include: {
                properties: true,
            },
            orderBy: {
                name: 'asc',
            },
        }),
        prisma.user.findMany({
            where: {
                role: 'TECHNICIAN',
                isActive: true,
            },
            orderBy: {
                name: 'asc',
            },
        }),
    ]);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
            </div>
            <div className="h-full flex-1 flex-col space-y-8 flex">
                <CalendarView jobs={serialize(jobs)} clients={serialize(clients)} technicians={serialize(technicians)} />
            </div>
        </div>
    );
}
