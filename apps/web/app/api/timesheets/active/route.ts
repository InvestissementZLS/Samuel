import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
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
