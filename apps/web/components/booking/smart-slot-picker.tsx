"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, Leaf, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Slot {
    time: string; // ISO string
    score: number;
    reason: string;
}

interface SmartSlotPickerProps {
    date: Date;
    latitude: number;
    longitude: number;
    onSelectSlot: (date: Date) => void;
    selectedSlot?: Date;
}

export function SmartSlotPicker({ date, latitude, longitude, onSelectSlot, selectedSlot }: SmartSlotPickerProps) {
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSlots = async () => {
            setLoading(true);
            setError(null);
            try {
                const query = new URLSearchParams({
                    date: date.toISOString(),
                    lat: latitude.toString(),
                    lng: longitude.toString(),
                    duration: "60" // Default
                });

                const res = await fetch(`/api/availability/smart?${query}`);
                if (!res.ok) throw new Error("Failed to load eco-slots");
                const data = await res.json();
                setSlots(data);
            } catch (err) {
                console.error(err);
                setError("Could not load smart availability.");
            } finally {
                setLoading(false);
            }
        };

        if (date && latitude && longitude) {
            fetchSlots();
        }
    }, [date, latitude, longitude]);

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }

    if (error) {
        return <div className="text-sm text-red-500 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</div>;
    }

    if (slots.length === 0) {
        return <div className="text-sm text-muted-foreground p-2">No specific smart slots found for this day. Regular booking applies.</div>;
    }

    // Determine "Best" threshold (e.g. top 3 or score < 5km)
    // Actually the slots are sorted by score. The first few are "Green".

    return (
        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
            {slots.map((slot, idx) => {
                const slotDate = new Date(slot.time);
                const isEco = idx < 3 && slot.score < 15; // Arbitrary "Good" threshold: Top 3 AND < 15km detour
                const isSelected = selectedSlot?.getTime() === slotDate.getTime();

                return (
                    <Button
                        key={slot.time}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                            "h-auto py-2 flex flex-col items-start gap-1 relative",
                            isEco && !isSelected && "border-green-500 bg-green-50/50 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/20"
                        )}
                        onClick={() => onSelectSlot(slotDate)}
                    >
                        <div className="flex w-full justify-between items-center">
                            <span className="font-semibold">{format(slotDate, "h:mm a")}</span>
                            {isEco && <Leaf className="h-3 w-3 text-green-600 dark:text-green-400" />}
                        </div>
                        {isEco && (
                            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                                Eco-Friendly Spot 🌿
                            </span>
                        )}
                    </Button>
                );
            })}
        </div>
    );
}
