import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { timesheetId, locations } = body; // locations: { latitude, longitude, timestamp, speed, heading, accuracy }[]

        if (!timesheetId || !locations || !Array.isArray(locations)) {
            return NextResponse.json({ success: false, error: 'Invalid data' }, { status: 400 });
        }

        await prisma.gPSBreadcrumb.createMany({
            data: locations.map((loc: any) => ({
                timesheetId,
                latitude: loc.latitude,
                longitude: loc.longitude,
                speed: loc.speed,
                heading: loc.heading,
                accuracy: loc.accuracy,
                timestamp: new Date(loc.timestamp), // Convert timestamp to Date
            })),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Tracking Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to record location' }, { status: 500 });
    }
}
