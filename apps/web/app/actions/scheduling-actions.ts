'use server';

import { prisma } from '@/lib/prisma';
import { addMinutes, startOfDay, endOfDay, addDays, format, isSameDay, parseISO } from 'date-fns';

// Simple implementation of Haversine formula for distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999; // Infinite distance if coords missing
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

export interface SmartSlot {
    date: Date;
    startTime: string; // HH:mm
    technicianId: string;
    technicianName: string;
    score: number; // 0-100 (100 is best)
    reason: string; // "Only 2km travel"
}

export async function findSmartSlots(
    productId: string,
    propertyId: string,
    startDateStr: string = new Date().toISOString()
) {
    // 1. Get Service Details (Duration & Techs)
    // @ts-ignore
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");

    // @ts-ignore
    const duration = product.durationMinutes || 60;
    // @ts-ignore
    const minTechs = product.minTechnicians || 1;

    // 2. Get Target Location
    const targetProperty = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!targetProperty) throw new Error("Property not found");

    // 3. Search Schedule for next 7 days
    const slots: SmartSlot[] = [];
    const technicians = await prisma.user.findMany({
        where: { role: 'TECHNICIAN', isActive: true }
    });

    const startDate = parseISO(startDateStr);

    // Iterate 7 days
    for (let i = 0; i < 7; i++) {
        const currentDate = addDays(startDate, i);
        const dayStart = startOfDay(currentDate);
        const dayEnd = endOfDay(currentDate);

        // Fetch existing jobs for this day
        const existingJobs = await prisma.job.findMany({
            where: {
                scheduledAt: { gte: dayStart, lte: dayEnd },
                status: { notIn: ['CANCELLED', 'REJECTED'] }
            },
            include: { property: true, technicians: true }
        });

        // Simple Heuristic: Check Morning (8AM) and Afternoon (1PM) slots
        // Real implementation would calculate exact gaps between jobs
        const candidates = [
            { time: "08:00", hour: 8 },
            { time: "10:00", hour: 10 },
            { time: "13:00", hour: 13 },
            { time: "15:00", hour: 15 }
        ];

        for (const tech of technicians) {
            // Filter jobs assigned to this tech
            const techJobs = existingJobs.filter(j => j.technicians.some(t => t.id === tech.id));

            for (const candidate of candidates) {
                // Check conflicts (Very basic overlap check)
                const candidateDate = new Date(currentDate);
                candidateDate.setHours(candidate.hour, 0, 0, 0);
                const candidateEnd = addMinutes(candidateDate, duration);

                const hasConflict = techJobs.some(job => {
                    const jobStart = new Date(job.scheduledAt);
                    // @ts-ignore
                    const jobEnd = job.scheduledEndAt || addMinutes(jobStart, 60);
                    return (candidateDate < jobEnd && candidateEnd > jobStart);
                });

                if (hasConflict) continue;

                // Optimization: Distance to other jobs this day
                let minDistance = 9999;
                let nearbyJobCount = 0;

                if (techJobs.length === 0) {
                    // Empty day - Neutral score
                    minDistance = 0; // No travel constraint
                } else {
                    for (const job of techJobs) {
                        const dist = calculateDistance(
                            targetProperty.latitude || 0,
                            targetProperty.longitude || 0,
                            job.property.latitude || 0,
                            job.property.longitude || 0
                        );
                        if (dist < minDistance) minDistance = dist;
                        if (dist < 10) nearbyJobCount++; // Jobs within 10km
                    }
                }

                // Scoring Logic
                let score = 50; // Base
                let reason = "Available";

                if (techJobs.length > 0) {
                    if (minDistance < 5) {
                        score += 40;
                        reason = `Excellent Efficiency! Only ${minDistance.toFixed(1)}km from another job.`;
                    } else if (minDistance < 15) {
                        score += 20;
                        reason = `Good Efficiency (${minDistance.toFixed(1)}km detour).`;
                    } else {
                        score -= 10;
                        reason = `Far from other jobs (${minDistance.toFixed(1)}km).`;
                    }
                } else {
                    score += 10;
                    reason = "Technician's first job of the day.";
                }

                slots.push({
                    date: candidateDate,
                    startTime: candidate.time,
                    technicianId: tech.id,
                    // @ts-ignore
                    technicianName: tech.name,
                    score,
                    reason
                });
            }
        }
    }

    // Sort by Score desc
    return slots.sort((a, b) => b.score - a.score).slice(0, 5); // Return top 5
}
