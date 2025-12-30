import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { timesheetId, km, photo, lat, lng } = body;

        // Mock Photo Upload
        const photoId = `mock_end_photo_${Date.now()}`;

        const timesheet = await prisma.timesheetEntry.findUnique({
            where: { id: timesheetId },
        });

        if (!timesheet) {
            return NextResponse.json({ success: false, error: 'Timesheet not found' }, { status: 404 });
        }

        const endTime = new Date();
        const duration = Math.round((endTime.getTime() - timesheet.startTime.getTime()) / 1000 / 60); // Minutes

        await prisma.timesheetEntry.update({
            where: { id: timesheetId },
            data: {
                endTime,
                endKm: parseInt(km),
                endLat: lat,
                endLng: lng,
                endOdometerPhotoId: photoId,
                status: 'SUBMITTED',
                duration,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Punch Out Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to punch out' }, { status: 500 });
    }
}
