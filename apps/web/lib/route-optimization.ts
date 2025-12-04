import { Job, Property } from "@prisma/client";

// Mock base coordinates (e.g., city center)
const BASE_LAT = 45.5017;
const BASE_LNG = -73.5673;

interface Coordinates {
    latitude: number;
    longitude: number;
}

// Haversine formula to calculate distance between two points in km
function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}

// Mock geocoding service
// In a real app, this would call Google Maps or Mapbox API
export async function geocodeAddress(address: string): Promise<Coordinates> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate random coordinates within ~10km of base
    // This ensures "optimization" actually does something visible (clustering)
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;

    return {
        latitude: BASE_LAT + latOffset,
        longitude: BASE_LNG + lngOffset,
    };
}

type JobWithProperty = Job & { property: Property };

export function optimizeRoute(jobs: JobWithProperty[]): JobWithProperty[] {
    if (jobs.length <= 1) return jobs;

    const optimizedJobs: JobWithProperty[] = [];
    const unvisitedJobs = [...jobs];

    // Start with the earliest scheduled job as the "anchor" or the first one in the list
    // Ideally, we'd start from the technician's home or office
    // For this MVP, we'll just pick the first job in the original list as the starting point
    // OR we could find the job closest to the base point.

    // Let's sort by original time first to find the earliest one
    unvisitedJobs.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    let currentJob = unvisitedJobs.shift()!;
    optimizedJobs.push(currentJob);

    while (unvisitedJobs.length > 0) {
        let nearestJobIndex = -1;
        let minDistance = Infinity;

        const currentLat = currentJob.property.latitude || BASE_LAT;
        const currentLng = currentJob.property.longitude || BASE_LNG;

        for (let i = 0; i < unvisitedJobs.length; i++) {
            const job = unvisitedJobs[i];
            const jobLat = job.property.latitude || BASE_LAT;
            const jobLng = job.property.longitude || BASE_LNG;

            const distance = calculateDistance(currentLat, currentLng, jobLat, jobLng);

            if (distance < minDistance) {
                minDistance = distance;
                nearestJobIndex = i;
            }
        }

        if (nearestJobIndex !== -1) {
            currentJob = unvisitedJobs.splice(nearestJobIndex, 1)[0];
            optimizedJobs.push(currentJob);
        } else {
            // Should not happen if unvisited > 0
            break;
        }
    }

    return optimizedJobs;
}
