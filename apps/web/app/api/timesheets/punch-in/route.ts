import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, km, photo, lat, lng } = body;

        console.log("Punch In Request:", { userId, km, lat, lng }); // Log for debugging

        // TODO: Upload photo to storage (e.g. Supabase Storage/Vercel Blob) and get ID/URL.
        // For now, storing as string if it's a URL, or mock ID if base64 (avoid storing huge strings in DB columns if ideally photos)
        // Adjust based on storage strategy. Assuming photo is a Base64 string from Expo for now, 
        // normally we'd upload this. Let's act like we save it elsewhere or just store a placeholder 
        // if we haven't set up blob storage yet. 
        // IMPORTANT: Storing Base64 in Postgres text column is bad practice for large images.
        // We will assume 'photo' is a reference or we upload it here.

        // Mock Photo ID for now to proceed without Blob setup overhead effectively blocking logic
        const photoId = `mock_photo_${Date.now()}`;

        const timesheet = await prisma.timesheetEntry.create({
            data: {
                userId,
                startTime: new Date(),
                startKm: parseInt(km),
                startLat: lat,
                startLng: lng,
                startOdometerPhotoId: photoId, // In real app, upload `photo` base64 to bucket, get URL/ID
                status: 'OPEN',
            },
        });

        return NextResponse.json({ success: true, timesheetId: timesheet.id });
    } catch (error) {
        console.error('Punch In Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to punch in' }, { status: 500 });
    }
}
