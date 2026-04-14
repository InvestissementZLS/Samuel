import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAuth } from '@/lib/auth';
import { uploadToSupabase, buildOdometerPhotoPath } from '@/lib/supabase-storage';

export async function POST(req: NextRequest) {
    // 🔐 Auth required
    const currentUser = await validateAuth(req);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // B-06 + M-08 FIX: Accept multipart/form-data with the actual photo file
        // instead of a local URI string in JSON body
        const contentType = req.headers.get('content-type') || '';

        let userId: string;
        let km: string;
        let lat: number;
        let lng: number;
        let photoUrl: string | null = null;

        if (contentType.includes('multipart/form-data')) {
            // ✅ New path: mobile sends real photo as FormData
            const formData = await req.formData();

            userId = formData.get('userId') as string;
            km = formData.get('km') as string;
            lat = parseFloat(formData.get('lat') as string);
            lng = parseFloat(formData.get('lng') as string);

            const photoFile = formData.get('photo') as File | null;

            if (photoFile && photoFile.size > 0) {
                const photoBuffer = Buffer.from(await photoFile.arrayBuffer());
                const storagePath = buildOdometerPhotoPath(userId);

                const uploadResult = await uploadToSupabase(
                    'odometer-photos',
                    storagePath,
                    photoBuffer,
                    photoFile.type || 'image/jpeg'
                );

                if (uploadResult.success && uploadResult.url) {
                    photoUrl = uploadResult.url;
                    // Photo uploadée avec succès (log retiré en prod)
                } else {
                    // Upload failed — log but don't block punch-in
                    // Technician must not lose their workday over a photo upload failure
                    console.error('[PunchIn] Photo upload failed:', uploadResult.error);
                    photoUrl = `upload_failed_${Date.now()}`; // Store failure marker
                }
            }
        } else {
            // Legacy JSON path (backward compatibility during transition)
            const body = await req.json();
            userId = body.userId;
            km = body.km;
            lat = body.lat;
            lng = body.lng;
            // Legacy: photo was a local URI or mock — mark it clearly
            photoUrl = body.photo ? `legacy_uri_${Date.now()}` : null;
        }

        // Validate required fields
        if (!userId || !km) {
            return NextResponse.json({ error: 'userId and km are required' }, { status: 400 });
        }

        const kmValue = parseInt(km);
        if (isNaN(kmValue) || kmValue < 1 || kmValue > 9999999) {
            return NextResponse.json({ error: 'Kilométrage invalide (doit être entre 1 et 9 999 999 km)' }, { status: 400 });
        }

        // Check for existing open timesheet to prevent duplicates
        const existingOpen = await prisma.timesheetEntry.findFirst({
            where: { userId, status: 'OPEN' },
        });

        if (existingOpen) {
            return NextResponse.json({
                success: true,
                timesheetId: existingOpen.id,
                message: 'Already punched in — returning existing timesheet',
            });
        }

        const timesheet = await prisma.timesheetEntry.create({
            data: {
                userId,
                startTime: new Date(),
                startKm: kmValue,
                startLat: lat,
                startLng: lng,
                startOdometerPhotoId: photoUrl ?? 'no_photo',
                status: 'OPEN',
            },
        });

        return NextResponse.json({ success: true, timesheetId: timesheet.id });
    } catch (error) {
        console.error('Punch In Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to punch in' }, { status: 500 });
    }
}
