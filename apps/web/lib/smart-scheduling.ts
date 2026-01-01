import { prisma } from "@/lib/prisma";
import { Job, User } from "@prisma/client";
import { addMinutes, format, parse, startOfDay, endOfDay, isWithinInterval } from "date-fns";

// Basic Haversine (Duplicated from mobile, should potentially share but monorepo structure makes it cleaner to just copy for now or put in packages/utils)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

interface SlotScore {
    time: Date;
    technicianId: string;
    technicianName: string;
    score: number; // Lower is better (km detour)
    reason: string;
}

export async function getSmartSlots(
    date: Date,
    latitude: number,
    longitude: number,
    durationMinutes: number = 60
) {
    const start = startOfDay(date);
    const end = endOfDay(date);

    // 1. Fetch Technicians
    const technicians = await prisma.user.findMany({
        where: { role: 'TECHNICIAN', isActive: true },
        include: {
            jobs: {
                where: {
                    scheduledAt: { gte: start, lte: end },
                    status: { not: 'CANCELLED' }
                },
                include: { property: true },
                orderBy: { scheduledAt: 'asc' }
            }
        }
    });

    const suggestions: SlotScore[] = [];

    // 2. Analyze each technician's day
    for (const tech of technicians) {
        // Simple Logic: Try to fit before first job, between jobs, or after last job.

        // A. Start of Day (e.g., 8:00 AM)
        // Assume tech starts at specific depot or home. optimizing for "First Job" closeness?
        // Let's assume an 8 AM start slot is always a candidate if free.
        const workStart = parse("08:00", "HH:mm", date);

        // Check availability for 8 AM
        if (isSlotFree(tech.jobs, workStart, durationMinutes)) {
            // Score: Distance to first actual job? Or just 0 if empty day?
            let score = 0;
            if (tech.jobs.length > 0) {
                // Distance to the current first job
                const firstJob = tech.jobs[0];
                if (firstJob.property.latitude && firstJob.property.longitude) {
                    score = calculateDistance(latitude, longitude, firstJob.property.latitude, firstJob.property.longitude);
                }
            }
            suggestions.push({
                time: workStart,
                technicianId: tech.id,
                technicianName: tech.name || "Technician",
                score,
                reason: tech.jobs.length === 0 ? "Empty Day" : "Before First Job"
            });
        }

        // B. Gaps Between Jobs
        for (let i = 0; i < tech.jobs.length - 1; i++) {
            const currentJob = tech.jobs[i];
            const nextJob = tech.jobs[i + 1];

            // End of current
            const currentEnd = addMinutes(currentJob.scheduledAt, currentJob.actualDurationMinutes || 60); // Use planned duration?

            // Start of next
            const nextStart = nextJob.scheduledAt;

            // Gap?
            const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / 60000;

            if (gapMinutes >= durationMinutes + 30) { // +30 buffer for travel
                // Candidate Time: Current End + 15 mins
                const candidateTime = addMinutes(currentEnd, 15);

                // Score: Detour cost
                // Current -> New -> Next   vs   Current -> Next
                if (currentJob.property.latitude && currentJob.property.longitude &&
                    nextJob.property.latitude && nextJob.property.longitude) {

                    const d1 = calculateDistance(currentJob.property.latitude, currentJob.property.longitude, latitude, longitude);
                    const d2 = calculateDistance(latitude, longitude, nextJob.property.latitude, nextJob.property.longitude);
                    const dDirect = calculateDistance(currentJob.property.latitude, currentJob.property.longitude, nextJob.property.latitude, nextJob.property.longitude);

                    const detour = (d1 + d2) - dDirect;

                    suggestions.push({
                        time: candidateTime,
                        technicianId: tech.id,
                        technicianName: tech.name || "Technician",
                        score: detour,
                        reason: `Between ${format(currentJob.scheduledAt, 'HH:mm')} and ${format(nextJob.scheduledAt, 'HH:mm')}`
                    });
                }
            }
        }

        // C. After Last Job
        if (tech.jobs.length > 0) {
            const lastJob = tech.jobs[tech.jobs.length - 1];
            const lastEnd = addMinutes(lastJob.scheduledAt, lastJob.actualDurationMinutes || 60);

            // Check if before work end (e.g. 17:00)
            const workEnd = parse("17:00", "HH:mm", date);

            if (lastEnd < workEnd && isSlotFree(tech.jobs, lastEnd, durationMinutes)) { // Technically simplified check
                let score = 0;
                if (lastJob.property.latitude && lastJob.property.longitude) {
                    score = calculateDistance(lastJob.property.latitude, lastJob.property.longitude, latitude, longitude);
                }

                suggestions.push({
                    time: addMinutes(lastEnd, 15), // Buffer
                    technicianId: tech.id,
                    technicianName: tech.name || "Technician",
                    score, // Distance from last job
                    reason: "After Last Job"
                });
            }
        }
    }

    // Sort by Score (Ascending - lowest detour/distance is best)
    return suggestions.sort((a, b) => a.score - b.score);
}

function isSlotFree(jobs: any[], start: Date, duration: number) {
    const end = addMinutes(start, duration);
    // Simple overlap check
    for (const job of jobs) {
        const jobStart = job.scheduledAt;
        const jobEnd = addMinutes(jobStart, job.actualDurationMinutes || 60);

        // Check intersection
        if (start < jobEnd && end > jobStart) {
            return false;
        }
    }
    return true;
}
