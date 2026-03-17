import { Metadata } from "next";
import { CalendarView } from "@/components/calendar/calendar-view";
import { serialize } from '@/lib/serialization';
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { Division } from "@prisma/client";

export const metadata: Metadata = {
    title: "Calendar | Field Service App",
    description: "Schedule and manage jobs",
};

export default async function CalendarPage() {
    // Read division from cookie (set by division switcher)
    const cookieStore = await cookies();
    const rawDivision = cookieStore.get('division')?.value || 'EXTERMINATION';
    const division = rawDivision as Division;

    let jobs = [], clients = [], technicians = [];
    try {
        [jobs, clients, technicians] = await Promise.all([
            prisma.job.findMany({
                where: { division },
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
                where: { divisions: { has: division } },
                include: {
                    properties: true,
                },
                orderBy: {
                    name: 'asc',
                },
            }),
            prisma.user.findMany({
                where: {
                    role: { in: ['TECHNICIAN', 'ADMIN', 'OFFICE'] },
                    isActive: true,
                },
                orderBy: {
                    name: 'asc',
                },
            }),
        ]);
    } catch (error: any) {
        console.error("Calendar Page Error:", error);
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-700">Calendar Unavailable</h1>
                <p className="text-gray-500 mt-2">Unable to load calendar data. Please try refreshing.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 h-full">
            <CalendarView jobs={serialize(jobs)} clients={serialize(clients)} technicians={serialize(technicians)} />
        </div>
    );
}
