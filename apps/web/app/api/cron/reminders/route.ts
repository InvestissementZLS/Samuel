import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { sendGenericEmail } from "@/lib/email";
import { addDays, startOfDay, endOfDay, format } from "date-fns";

export async function GET() {
    try {
        const tomorrow = addDays(new Date(), 1);
        const start = startOfDay(tomorrow);
        const end = endOfDay(tomorrow);

        const upcomingJobs = await prisma.job.findMany({
            where: {
                scheduledAt: {
                    gte: start,
                    lte: end,
                },
                status: 'SCHEDULED',
            },
            include: {
                property: {
                    include: {
                        client: true,
                    },
                },
            },
        });

        console.log(`[Cron] Found ${upcomingJobs.length} jobs for tomorrow (${format(tomorrow, 'yyyy-MM-dd')})`);

        for (const job of upcomingJobs) {
            const clientEmail = job.property.client.email;
            if (clientEmail) {
                await sendGenericEmail(
                    clientEmail,
                    `Reminder: Upcoming Appointment Tomorrow`,
                    `Dear ${job.property.client.name},\n\nThis is a reminder that you have a service appointment scheduled for tomorrow, ${format(job.scheduledAt, 'PP p')}.\n\nLocation: ${job.property.address}\n\nSee you soon,\nZLS Team`,
                    job.division
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sent reminders for ${upcomingJobs.length} jobs.`,
        });
    } catch (error) {
        console.error("Error sending reminders:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
