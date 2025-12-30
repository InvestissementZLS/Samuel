"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { updateJob } from "@/app/actions/jobs";
import { toast } from "sonner";

interface JobScheduleEditProps {
    jobId: string;
    initialScheduledAt: Date;
    initialScheduledEndAt?: Date | null;
}

export function JobScheduleEdit({
    jobId,
    initialScheduledAt,
    initialScheduledEndAt,
}: JobScheduleEditProps) {
    const [date, setDate] = useState<Date | undefined>(new Date(initialScheduledAt));
    const [startTime, setStartTime] = useState(format(new Date(initialScheduledAt), "HH:mm"));
    const [endTime, setEndTime] = useState(
        initialScheduledEndAt ? format(new Date(initialScheduledEndAt), "HH:mm") : ""
    );
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!date) {
            toast.error("Please select a date");
            return;
        }
        if (!startTime) {
            toast.error("Please select a start time");
            return;
        }

        setIsLoading(true);
        try {
            // Combine date and time
            const dateStr = format(date, "yyyy-MM-dd");
            const startDateTime = new Date(`${dateStr}T${startTime}:00`);

            let endDateTime: Date | undefined = undefined;
            if (endTime) {
                endDateTime = new Date(`${dateStr}T${endTime}:00`);
            }

            await updateJob(jobId, {
                scheduledAt: startDateTime,
                scheduledEndAt: endDateTime,
            });

            toast.success("Schedule updated");
            setIsOpen(false);
        } catch (error) {
            toast.error("Failed to update schedule");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="group relative">
            <div className="flex items-start justify-between">
                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase">Date & Time</label>
                    <p className="text-gray-900 font-medium">
                        {format(new Date(initialScheduledAt), 'PPP')}
                    </p>
                    <p className="text-gray-900">
                        {format(new Date(initialScheduledAt), 'p')}
                        {initialScheduledEndAt && ` - ${format(new Date(initialScheduledEndAt), 'p')}`}
                    </p>
                </div>

                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Pencil className="h-4 w-4 text-gray-500" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="space-y-4">
                            <h4 className="font-medium leading-none">Edit Schedule</h4>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date</label>
                                <div className="border rounded-md p-2">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Start Time</label>
                                    <Input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">End Time</label>
                                    <Input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button className="w-full" onClick={handleSave} disabled={isLoading}>
                                {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
