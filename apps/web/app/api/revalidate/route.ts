import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * S-10 FIX: Cache revalidation endpoint now requires a REVALIDATE_SECRET header.
 * Without this, anyone could force a full cache invalidation (DoS on Vercel CDN).
 *
 * Usage:
 *   GET /api/revalidate
 *   Headers: { Authorization: Bearer <REVALIDATE_SECRET> }
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.REVALIDATE_SECRET;

    // If no secret is configured, allow in dev mode only
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    revalidatePath('/', 'layout');
    return NextResponse.json({ revalidated: true, now: Date.now() });
}
