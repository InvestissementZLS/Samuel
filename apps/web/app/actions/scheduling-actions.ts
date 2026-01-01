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

        // If no property found (e.g. Guest Booking), we just skip distance optimization
        // if (!targetProperty) throw new Error("Property not found"); // REMOVED STRICT CHECK

        // 3. Search Schedule for next 7 days
        const slots: SmartSlot[] = [];
        const technicians = await prisma.user.findMany({
            where: { role: 'TECHNICIAN', isActive: true }
        });
        console.log(`[SmartSlots] Found ${technicians.length} active technicians`, technicians.map(t => t.name));

        if (technicians.length === 0) {
            console.warn("[SmartSlots] No active technicians found.");
            // Return a unified 'empty' response or throw specific error
            // For the UI to handle gracefully:
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
            include: { property: true, technicians: true }
        });

        console.log(`[SmartSlots] Fetched ${allWeekJobs.length} jobs for week range ${weekStart.toISOString()} - ${weekEnd.toISOString()}`);

        let debugStats = {
            techs: technicians.length,
            candidatesChecked: 0,
            rejectedPast: 0,
            rejectedConflict: 0
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

            // ... candidates loop ...

            // Simple Heuristic: Check Morning (8AM) and Afternoon (1PM) slots
            // Generate hourly slots from 8 AM to 6 PM (18:00) INCLUSIVE
            const candidates = [];
            for (let hour = 8; hour <= 18; hour++) {
                candidates.push({ time: `${hour.toString().padStart(2, '0')}:00`, hour });
            }

            for (const tech of technicians) {
                // Filter jobs assigned to this tech
                const techJobs = existingJobs.filter(j => j.technicians.some(t => t.id === tech.id));

                for (const candidate of candidates) {
                    debugStats.candidatesChecked++;
                    // Check conflicts (Very basic overlap check)
                    const candidateDate = new Date(currentDate);
                    // EST is UTC-5 (Winter). So 8 AM EST = 13:00 UTC.
                    // We use setUTCHours to force the correct absolute timestamp.
                    candidateDate.setUTCHours(candidate.hour + 5, 0, 0, 0);

                    // --- TIMEZONE FIX: Ensure we check against Montreal Time ---
                    let isPast = false;
                    try {
                        // Get current time in Montreal
                        const nowMontrealStr = new Date().toLocaleString("en-US", { timeZone: "America/Montreal" });
                        const nowMontreal = new Date(nowMontrealStr);

                        // Compare candidate (which is now correctly 8 AM EST / 13 PM UTC)
                        // But wait, 'candidateDate' object is UTC.
                        // We need to compare "Wall Clock" time.

                        // Convert candidate UTC timestamp to Montreal Wall Clock Date
                        const candidateMontrealStr = candidateDate.toLocaleString("en-US", { timeZone: "America/Montreal" });
                        const candidateMontreal = new Date(candidateMontrealStr);

                        if (candidateMontreal < nowMontreal) {
                            isPast = true;
                        }
                    } catch (e) {
                        // Fallback to simple server time check
                        if (candidateDate < new Date()) isPast = true;
                    }

                    if (isPast) {
                        debugStats.rejectedPast++;
                        continue;
                    }
                    // -----------------------------------------------------------

                    const candidateEnd = addMinutes(candidateDate, duration);

                    const hasConflict = techJobs.some(job => {
                        const jobStart = new Date(job.scheduledAt);
                        // @ts-ignore
                        const jobEnd = job.scheduledEndAt || addMinutes(jobStart, 60);
                        return (candidateDate < jobEnd && candidateEnd > jobStart);
                    });

                    if (hasConflict) {
                        debugStats.rejectedConflict++;
                        continue;
                    }

                    // Optimization: Distance to other jobs this day
                    let minDistance = 9999;
                    let nearbyJobCount = 0;

                    if (techJobs.length === 0) {
                        // Empty day - Neutral score
                        minDistance = 0; // No travel constraint
                    } else if (targetProperty) {
                        for (const job of techJobs) {
                            // Defensive Check: If job has no property (data integrity issue), skip distance calculation or treat as far
                            if (!job.property) {
                                continue;
                            }

                            const dist = calculateDistance(
                                targetProperty.latitude || 0,
                                targetProperty.longitude || 0,
                                job.property.latitude || 0,
                                job.property.longitude || 0
                            );
                            if (dist < minDistance) minDistance = dist;
                            if (dist < 10) nearbyJobCount++; // Jobs within 10km
                        }
                    } else {
                        // Guest Booking (No location known) - Just assume neutral distance
                        minDistance = 9999;
                    }

                    // Scoring Logic
                    let score = 50; // Base
                    let reason = "Available";

                    if (techJobs.length > 0) {
                        if (minDistance < 5) {
                            score += 40;
                            reason = "Optimized";
                        } else if (minDistance < 15) {
                            score += 20;
                            reason = "Efficient";
                        } else if (!targetProperty) {
                            score += 0; // Neutral for guests
                            reason = "";
                        } else {
                            score -= 10;
                            reason = "";
                        }
                    } else {
                        score += 10;
                        reason = "";
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

        console.log(`[SmartSlots] Success. Found ${slots.length} total slots.`);

        // DIAGNOSTIC FALLBACK
        if (slots.length === 0) {
            console.warn("[SmartSlots] No slots found. Debug stats:", debugStats);
            // Informative Slot (Not an error, just info)
            return [{
                date: addDays(new Date(), 1), // Tomorrow
                startTime: "INFO",
                technicianId: "info",
                technicianName: "No Availability",
                score: 0,
                reason: `Fully Booked (Checked ${debugStats.candidatesChecked} slots)`
            }];
        }

        // Sort by Score desc
        return slots.sort((a, b) => b.score - a.score); // Return all valid slots
    } catch (e: any) {
        console.error("[SmartSlots] CRITICAL FAILURE:", e);
        throw new Error(`Scheduling System Error: ${e.message}`);
    }
}
