```
import { NextResponse } from 'next/server';
// import { findSmartSlots } from '@/app/actions/scheduling-actions';
// import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // Force dynamic (no cached static build)

export async function GET() {
    return NextResponse.json({ status: "Alive", message: "Deployment Success" });
    /*
    try {
        // Find first service
        const service = await prisma.product.findFirst({ where: { type: 'SERVICE' } });
        if (!service) return NextResponse.json({ error: "No SERVICE product found in DB" }, { status: 404 });

        // Run Logic
        const slots = await findSmartSlots(service.id, 'temp');

        return NextResponse.json({
            status: "Success",
            service: service.name,
            count: slots.length,
            slots: slots
        });
    } catch (e: any) {
        return NextResponse.json({
            status: "Error",
            message: e.message,
            stack: e.stack
        }, { status: 500 });
    }
    */
}

```
