// Basic Haversine Distance
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

const deg2rad = (deg: number) => deg * (Math.PI / 180);

export interface LocationPoint {
    id: string;
    latitude?: number | null;
    longitude?: number | null;
    [key: string]: any; // Allow other properties
}

// "Nearest Neighbor" Sorting (Greedy)
export const optimizeRoute = (startLat: number, startLng: number, jobs: LocationPoint[]) => {
    const unvisited = [...jobs];
    const sorted: LocationPoint[] = [];

    let currentLat = startLat;
    let currentLng = startLng;

    while (unvisited.length > 0) {
        let nearestIndex = -1;
        let minDist = Infinity;

        for (let i = 0; i < unvisited.length; i++) {
            const job = unvisited[i];
            // Skip jobs with missing coordinates (push them to end or keep as is? Let's process valid ones first)
            // Accessing nested property safely? The type definition says LocationPoint has keys. 
            // In our Job object, coords are in job.property.latitude
            const lat = job.property?.latitude;
            const lng = job.property?.longitude;

            if (!lat || !lng) {
                continue;
            }

            const dist = calculateDistance(
                currentLat,
                currentLng,
                lat,
                lng
            );

            if (dist < minDist) {
                minDist = dist;
                nearestIndex = i;
            }
        }

        // Processing
        if (nearestIndex !== -1) {
            const nearestJob = unvisited[nearestIndex];
            sorted.push(nearestJob);
            // Move "current" to this job's location
            currentLat = nearestJob.property.latitude!;
            currentLng = nearestJob.property.longitude!;
            unvisited.splice(nearestIndex, 1);
        } else {
            // Remaining jobs have no coords, just append them
            sorted.push(...unvisited);
            break;
        }
    }

    return sorted;
};
