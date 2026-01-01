
import { prisma } from './apps/web/lib/prisma';
import { addMinutes, startOfDay, endOfDay, addDays, format, isSameDay, parseISO } from 'date-fns';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export async function findSmartSlotsDebug(
    productId: string,
    propertyId: string,
    startDateStr: string = new Date().toISOString()
) {
    try {
        console.log(`[Debug] Checking slots for Product: ${productId}`);

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) throw new Error("Product not found");

        // @ts-ignore
        const duration = product.durationMinutes || 60;

        console.log(`[Debug] Duration: ${duration} mins`);

        let targetProperty = null;
        if (propertyId && propertyId !== 'temp') {
            targetProperty = await prisma.property.findUnique({ where: { id: propertyId } });
        }

        const slots: any[] = [];
        const technicians = await prisma.user.findMany({
            where: { role: 'TECHNICIAN', isActive: true }
        });
        console.log(`[Debug] Active Technicians: ${technicians.length} (${technicians.map(t => t.name).join(', ')})`);

        const startDate = parseISO(startDateStr);

        for (let i = 0; i < 7; i++) {
            const currentDate = addDays(startDate, i);
            const dayStart = startOfDay(currentDate);
            const dayEnd = endOfDay(currentDate);

            console.log(`[Debug] Checking Day ${i}: ${format(currentDate, 'yyyy-MM-dd')}`);

            const existingJobs = await prisma.job.findMany({
                where: {
                    scheduledAt: { gte: dayStart, lte: dayEnd },
                    status: { notIn: ['CANCELLED'] }
                },
                include: { property: true, technicians: true }
            });

            console.log(`   Detailed Jobs found: ${existingJobs.length}`);

            const candidates = [];
            for (let hour = 8; hour < 18; hour++) {
                candidates.push({ time: `${hour.toString().padStart(2, '0')}:00`, hour });
            }

            for (const tech of technicians) {
                const techJobs = existingJobs.filter(j => j.technicians.some(t => t.id === tech.id));

                for (const candidate of candidates) {
                    const candidateDate = new Date(currentDate);
                    candidateDate.setHours(candidate.hour, 0, 0, 0);

                    let isPast = false;
                    try {
                        const nowMontrealStr = new Date().toLocaleString("en-US", { timeZone: "America/Montreal" });
                        const nowMontreal = new Date(nowMontrealStr);

                        if (isSameDay(candidateDate, nowMontreal)) {
                            const currentHourMontreal = nowMontreal.getHours();
                            if (candidate.hour <= currentHourMontreal) isPast = true;
                        } else if (candidateDate < startOfDay(nowMontreal)) {
                            isPast = true;
                        }
                    } catch (e) {
                        const now = new Date();
                        if (candidateDate < now) isPast = true;
                    }

                    if (isPast) {
                        continue;
                    }

                    const candidateEnd = addMinutes(candidateDate, duration);

                    const hasConflict = techJobs.some(job => {
                        const jobStart = new Date(job.scheduledAt);
                        const jobEnd = (job as any).scheduledEndAt || addMinutes(jobStart, 60);
                        return (candidateDate < jobEnd && candidateEnd > jobStart);
                    });

                    if (hasConflict) {
                        continue;
                    }

                    slots.push({
                        date: candidateDate,
                        startTime: candidate.time,
                        technicianName: tech.name,
                        score: 50,
                        reason: "Available"
                    });
                }
            }
        }

        return slots;
    } catch (e: any) {
        console.error("DEBUG ERROR:", e);
        return [];
    }
}

async function main() {
    console.log("--- Starting Slot Check ---");
    const product = await prisma.product.findFirst({ where: { type: 'SERVICE' } });
    if (!product) {
        console.error("No service found!");
        return;
    }
    const slots = await findSmartSlotsDebug(product.id, 'temp');
    console.log(`\nTOTAL VALID SLOTS FOUND: ${slots.length}`);
    if (slots.length > 0) {
        console.log("Sample:", slots[0]);
    } else {
        console.log("Why 0? Check 'Active Technicians' count or Timezone logic.");
    }
}

main();
