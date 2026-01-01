import { NextRequest, NextResponse } from "next/server";
import { getSmartSlots } from "@/lib/smart-scheduling";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get("date");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const duration = searchParams.get("duration") || "60";

    if (!dateStr || !lat || !lng) {
        return NextResponse.json({ error: "Missing parameters: date, lat, lng" }, { status: 400 });
    }

    try {
        const date = new Date(dateStr);
        const slots = await getSmartSlots(
            date,
            parseFloat(lat),
            parseFloat(lng),
            parseInt(duration)
        );

        return NextResponse.json(slots);
    } catch (error) {
        console.error("Smart Slots Error", error);
        return NextResponse.json({ error: "Failed to calculate slots" }, { status: 500 });
    }
}
