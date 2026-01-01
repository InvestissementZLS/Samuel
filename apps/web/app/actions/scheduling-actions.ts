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

// Helper: Calculate travel time in minutes based on distance
function calculateTravelTime(distanceKm: number): number {
    const BUFFER_MINUTES = 15;
    let speedKmH = 30; // Default City Speed

    if (distanceKm >= 10) {
        speedKmH = 70; // Highway/Mixed Speed for longer distances
    }

    // Time = (Distance / Speed) * 60 minutes
    const travelMinutes = (distanceKm / speedKmH) * 60;
    return Math.ceil(travelMinutes + BUFFER_MINUTES);
}

export async function findSmartSlots(
    productId: string,
    propertyId: string,
    startDateStr: string = new Date().toISOString()
) {
    try {
        if (!productId) throw new Error("Product ID is required");

        // 1. Get Service Details (Duration & Techs)
        // @ts-ignore
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) throw new Error(`Product not found: ${productId}`);

        // @ts-ignore
        const duration = product.durationMinutes || 60;
        // @ts-ignore
        const minTechs = product.minTechnicians || 1;

        // 2. Get Target Location (Optional)
        let targetProperty = null;
        if (propertyId && propertyId !== 'temp') {
            targetProperty = await prisma.property.findUnique({ where: { id: propertyId } });
        }

        // 3. Search Schedule for next 7 days
        const slots: SmartSlot[] = [];
        const technicians = await prisma.user.findMany({
            where: { role: 'TECHNICIAN', isActive: true }
        });
        console.log(`[SmartSlots] Found ${technicians.length} active technicians`, technicians.map(t => t.name));

        if (technicians.length === 0) {
            console.warn("[SmartSlots] No active technicians found.");
            return [{
                date: addDays(new Date(), 1),
                startTime: "N/A",
                technicianId: "notechs",
                technicianName: "No Technicians Found",
                score: 0,
                reason: "Please contact admin to add technicians."
            }];
        }

        const startDate = parseISO(startDateStr);
        const weekStart = startOfDay(startDate);
        const weekEnd = endOfDay(addDays(startDate, 6)); // 7 days total

        // BATCH FETCH: Get all jobs for the entire week in one query
        const allWeekJobs = await prisma.job.findMany({
            where: {
                scheduledAt: { gte: weekStart, lte: weekEnd },
                status: { notIn: ['CANCELLED'] }
            },
            include: { property: true, technicians: true },
            orderBy: { scheduledAt: 'asc' } // Important for finding prev/next jobs
        });

        console.log(`[SmartSlots] Fetched ${allWeekJobs.length} jobs for week range ${weekStart.toISOString()} - ${weekEnd.toISOString()}`);

        let debugStats = {
            techs: technicians.length,
            candidatesChecked: 0,
            rejectedPast: 0,
            rejectedConflict: 0,
            rejectedTravel: 0
        };

        // Iterate 7 days
        for (let i = 0; i < 7; i++) {
            const currentDate = addDays(startDate, i);
            const dayStart = startOfDay(currentDate);
            const dayEnd = endOfDay(currentDate);

            // Filter jobs for this specific day from the batch
            const existingJobs = allWeekJobs.filter(j =>
                new Date(j.scheduledAt) >= dayStart &&
                new Date(j.scheduledAt) <= dayEnd
            );

            // Simple Heuristic: Check available hours
            // Generate hourly slots from 8 AM to 6 PM (18:00) INCLUSIVE
            const candidates = [];
            for (let hour = 8; hour <= 18; hour++) {
                candidates.push({ time: `${hour.toString().padStart(2, '0')}:00`, hour });
            }

            for (const tech of technicians) {
                // Filter jobs assigned to this tech AND Sort them by time
                const techJobs = existingJobs
                    .filter(j => j.technicians.some(t => t.id === tech.id))
                    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

                for (const candidate of candidates) {
                    debugStats.candidatesChecked++;

                    // Create a candidate date that represents this hour in Montreal
                    const candidateDate = new Date(currentDate);

                    // Helper to determine offset (EST=5, EDT=4)
                    const getMontrealOffset = (d: Date) => {
                        const str = d.toLocaleString("en-US", { timeZone: "America/Montreal", timeZoneName: "short" });
                        return str.includes("EDT") ? 4 : 5;
                    };

                    const offset = getMontrealOffset(candidateDate);
                    candidateDate.setUTCHours(candidate.hour + offset, 0, 0, 0);
                    const candidateEnd = addMinutes(candidateDate, duration);

                    // --- TIMEZONE FIX: Ensure we check against Montreal Time ---
                    let isPast = false;
                    try {
                        const nowMontrealStr = new Date().toLocaleString("en-US", { timeZone: "America/Montreal" });
                        const nowMontreal = new Date(nowMontrealStr);
                        // Buffer: Don't allow booking within next 2 hours
                        const minBookingTime = addMinutes(nowMontreal, 120);

                        const candidateMontrealStr = candidateDate.toLocaleString("en-US", { timeZone: "America/Montreal" });
                        const candidateMontreal = new Date(candidateMontrealStr);

                        if (candidateMontreal < minBookingTime) {
                            isPast = true;
                        }
                    } catch (e) {
                        if (candidateDate < new Date()) isPast = true;
                    }

                    if (isPast) {
                        debugStats.rejectedPast++;
                        continue;
                    }
                    // -----------------------------------------------------------

                    // 1. HARD CONFLICT CHECK (Direct Overlap)
                    const hasDirectConflict = techJobs.some(job => {
                        const jobStart = new Date(job.scheduledAt);
                        // @ts-ignore
                        const jobEnd = job.scheduledEndAt || addMinutes(jobStart, 60);
                        return (candidateDate < jobEnd && candidateEnd > jobStart);
                    });

                    if (hasDirectConflict) {
                        debugStats.rejectedConflict++;
                        continue;
                    }

                    // 2. TRAVEL TIME CHECK (Smart Scheduling)
                    // Find Preceding Job (Ends before Candidate Start)
                    // Find Following Job (Starts after Candidate Start)
                    let travelViolation = false;
                    let minDistance = 9999;
                    let reason = "Available";
                    let score = 50;

                    // Locate Prev/Next jobs
                    // jobEnd <= candidateDate
                    const prevJob = techJobs.filter(j => {
                        const jobEnd = j.scheduledEndAt ? new Date(j.scheduledEndAt) : addMinutes(new Date(j.scheduledAt), 60);
                        return jobEnd <= candidateDate;
                    }).pop(); // Last one that ends before us

                    // jobStart >= candidateEnd
                    const nextJob = techJobs.find(j => new Date(j.scheduledAt) >= candidateEnd);

                    // Check Prev Job Travel
                    if (prevJob && prevJob.property && targetProperty) {
                        const dist = calculateDistance(
                            prevJob.property.latitude || 0,
                            prevJob.property.longitude || 0,
                            targetProperty.latitude || 0,
                            targetProperty.longitude || 0
                        );
                        const requiredTravel = calculateTravelTime(dist);
                        const jobEnd = prevJob.scheduledEndAt ? new Date(prevJob.scheduledEndAt) : addMinutes(new Date(prevJob.scheduledAt), 60);

                        // Earliest we can start is JobEnd + Travel
                        const earliestStart = addMinutes(jobEnd, requiredTravel);

                        if (earliestStart > candidateDate) {
                            travelViolation = true;
                            // console.log(`[SmartSlots] Rejected ${candidate.time}: PrevJob ends ${format(jobEnd, 'HH:mm')}, needs ${requiredTravel}m travel, earliest start ${format(earliestStart, 'HH:mm')}`);
                        }
                    }

                    // Check Next Job Travel
                    if (!travelViolation && nextJob && nextJob.property && targetProperty) {
                        const dist = calculateDistance(
                            targetProperty.latitude || 0,
                            targetProperty.longitude || 0,
                            nextJob.property.latitude || 0,
                            nextJob.property.longitude || 0
                        );
                        const requiredTravel = calculateTravelTime(dist);

                        // Latest we must finish is NextJobStart - Travel
                        const nextJobStart = new Date(nextJob.scheduledAt);
                        const latestFinish = addMinutes(nextJobStart, -requiredTravel);

                        if (candidateEnd > latestFinish) {
                            travelViolation = true;
                            // console.log(`[SmartSlots] Rejected ${candidate.time}: NextJob starts ${format(nextJobStart, 'HH:mm')}, needs ${requiredTravel}m travel, latest finish ${format(latestFinish, 'HH:mm')}`);
                        }
                    }

                    if (travelViolation) {
                        debugStats.rejectedTravel++;
                        continue;
                    }

                    // --- SCORING (Optimization) ---
                    if (techJobs.length === 0) {
                        minDistance = 0; // Empty day
                        score += 10;
                    } else if (targetProperty) {
                        // Calculate minimum distance to ANY job this day (General clustering)
                        // This helps prefer days where we are already in the area, even if not directly adjacent (though adjacent is handled by constraints now)
                        for (const job of techJobs) {
                            if (!job.property) continue;
                            const dist = calculateDistance(
                                targetProperty.latitude || 0,
                                targetProperty.longitude || 0,
                                job.property.latitude || 0,
                                job.property.longitude || 0
                            );
                            if (dist < minDistance) minDistance = dist;
                        }
                    } else {
                        minDistance = 9999; // Guest unknown
                    }

                    if (techJobs.length > 0) {
                        if (minDistance < 15) {
                            score += 40;
                            reason = "Optimized Route";
                        } else if (minDistance < 30) {
                            score += 20;
                            reason = "Nearby";
                        } else if (!targetProperty) {
                            score += 0;
                            reason = "";
                        } else {
                            score -= 10;
                            reason = "";
                        }
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

        console.log(`[SmartSlots] Success. Found ${slots.length} slots. Stats:`, debugStats);

        // DIAGNOSTIC FALLBACK
        if (slots.length === 0) {
            console.warn("[SmartSlots] No slots found. Debug stats:", debugStats);
            return [{
                date: addDays(new Date(), 1),
                startTime: "INFO",
                technicianId: "info",
                technicianName: "No Availability",
                score: 0,
                reason: "Fully Booked"
            }];
        }

        return slots.sort((a, b) => b.score - a.score);
    } catch (e: any) {
        console.error("[SmartSlots] CRITICAL FAILURE:", e);
        return [{
            date: addDays(new Date(), 1),
            startTime: "ERR",
            technicianId: "error",
            technicianName: "SYSTEM ERROR",
            score: 0,
            reason: `${e.message || "Unknown error"}`
        }];
    }
}
