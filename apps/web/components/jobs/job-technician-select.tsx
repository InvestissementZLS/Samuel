"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import { updateJobTechnicians } from "@/app/actions/job-details-actions";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface JobTechnicianSelectProps {
    jobId: string;
    assignedTechnicians: User[];
    allTechnicians: User[];
}

export function JobTechnicianSelect({ jobId, assignedTechnicians, allTechnicians }: JobTechnicianSelectProps) {
    const [open, setOpen] = useState(false);
    const [selectedTechIds, setSelectedTechIds] = useState<string[]>(
        assignedTechnicians.map((t) => t.id)
    );
    const [loading, setLoading] = useState(false);

    const handleSelect = async (techId: string) => {
        setLoading(true);
        let newTechIds: string[];
        if (selectedTechIds.includes(techId)) {
            newTechIds = selectedTechIds.filter((id) => id !== techId);
        } else {
            newTechIds = [...selectedTechIds, techId];
        }

        // Optimistic update
        setSelectedTechIds(newTechIds);

        try {
            await updateJobTechnicians(jobId, newTechIds);
            toast.success("Technicians updated");
        } catch (error) {
            console.error("Failed to update technicians:", error);
            toast.error("Failed to update technicians");
            // Revert
            setSelectedTechIds(assignedTechnicians.map((t) => t.id));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={loading}
                >
                    {selectedTechIds.length > 0
                        ? `${selectedTechIds.length} technician(s)`
                        : "Select technicians..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search technician..." />
                    <CommandEmpty>No technician found.</CommandEmpty>
                    <CommandGroup>
                        {allTechnicians.map((tech) => (
                            <CommandItem
                                key={tech.id}
                                value={tech.name || tech.email}
                                onSelect={() => handleSelect(tech.id)}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedTechIds.includes(tech.id)
                                            ? "opacity-100"
                                            : "opacity-0"
                                    )}
                                />
                                {tech.name || tech.email}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
