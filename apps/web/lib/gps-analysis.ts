import { differenceInMinutes } from 'date-fns';

interface GPSPoint {
    latitude: number;
    longitude: number;
    timestamp: Date;
    accuracy?: number | null;
}

interface AnalysisResult {
    lateStart?: {
        detected: boolean;
        durationMinutes: number;
        message: string;
    };
    latePunchOut?: {
        detected: boolean;
        realArrivalTime: Date;
        delayMinutes: number;
        message: string;
    };
    unscheduledStops?: {
        detected: boolean;
        stops: {
            startTime: Date;
            durationMinutes: number;
            location: { lat: number; lng: number };
        }[];
    };
}

// Distance Threshold in meters (e.g., 200m radius considered "same location")
const THRESHOLD_METERS = 200;
// Time Threshold in minutes (e.g., 20m idle trigger)
const IDLE_THRESHOLD_MINUTES = 20;

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d * 1000; // Distance in meters
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

export function analyzeTechnicianMovement(
    startTime: Date,
    endTime: Date | null,
    startLocation: { lat: number, lng: number } | null,
    endLocation: { lat: number, lng: number } | null,
    breadcrumbs: GPSPoint[]
): AnalysisResult {
    const result: AnalysisResult = {};

    if (!breadcrumbs || breadcrumbs.length === 0) return result;

    // --- 1. Detect Late Start (Idle at start location) ---
    // If user has recorded points > 20m from start time, and is still within X meters of start location.
    if (startLocation) {
        // Find the latest point that is still "near" start
        let lastPointNearStart = null;

        for (const point of breadcrumbs) {
            const dist = getDistanceFromLatLonInM(startLocation.lat, startLocation.lng, point.latitude, point.longitude);
            if (dist <= THRESHOLD_METERS) {
                lastPointNearStart = point;
            } else {
                // He moved away
                break;
            }
        }

        if (lastPointNearStart) {
            const idleTime = differenceInMinutes(new Date(lastPointNearStart.timestamp), new Date(startTime));
            if (idleTime >= IDLE_THRESHOLD_MINUTES) {
                result.lateStart = {
                    detected: true,
                    durationMinutes: idleTime,
                    message: `Technician remained at start location for ${idleTime} mins after punching in.`
                };
            }
        }
    }

    // --- 2. Detect Late Punch Out (Arrived long before punching out) ---
    if (endTime && endLocation) {
        // We look backwards from the end. 
        // We want to find the "Arrival Time".
        // Arrival Time = The timestamp of the FIRST point in the continuous sequence of points near the destination.

        // Filter points before endTime
        const sortedPoints = [...breadcrumbs]
            .filter(p => new Date(p.timestamp) <= new Date(endTime))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Descending (newest first)

        let arrivalPoint = null;

        // Iterate backwards (from punch out time)
        for (const point of sortedPoints) {
            const dist = getDistanceFromLatLonInM(endLocation.lat, endLocation.lng, point.latitude, point.longitude);
            if (dist <= THRESHOLD_METERS) {
                // This point is near the destination. It might be the arrival point.
                arrivalPoint = point;
            } else {
                // We found a point NOT near the destination. So the previous one was the 'Arrival' boundary.
                break;
            }
        }

        if (arrivalPoint) {
            const delay = differenceInMinutes(new Date(endTime), new Date(arrivalPoint.timestamp));
            if (delay >= IDLE_THRESHOLD_MINUTES) {
                result.latePunchOut = {
                    detected: true,
                    realArrivalTime: arrivalPoint.timestamp,
                    delayMinutes: delay,
                    message: `Technician arrived at destination ${delay} mins before punching out.`
                };
            }
        }
    }

    return result;
}
