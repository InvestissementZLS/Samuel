import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');

        // Validate cron secret if present, matching Vercel's standard
        if (
            process.env.CRON_SECRET &&
            authHeader !== `Bearer ${process.env.CRON_SECRET}`
        ) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Ping the database with a trivial query to keep it active
        await prisma.$queryRaw`SELECT 1`;

        return NextResponse.json({ success: true, message: 'Database pinged successfully to prevent standby mode' });
    } catch (error) {
        console.error('Error pinging database:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to ping database' },
            { status: 500 }
        );
    }
}
