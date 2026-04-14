import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
    // 🔐 B-04 FIX: Technician punch status (location timing) must be authenticated
    const currentUser = await validateAuth(req);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    try {
        const activeTimesheet = await prisma.timesheetEntry.findFirst({
            where: {
                userId,
                status: 'OPEN',
            },
            orderBy: {
                startTime: 'desc',
            },
        });

        return NextResponse.json({ success: true, timesheet: activeTimesheet });
    } catch (error) {
        console.error('Check Active Timesheet Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to check active timesheet' }, { status: 500 });
    }
}
