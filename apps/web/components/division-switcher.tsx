"use client";

import { useDivision } from "@/components/providers/division-provider";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

const divisions = [
    {
        value: "EXTERMINATION",
        label: "Extermination ZLS",
        short: "EXO"
    },
    {
        value: "ENTREPRISES",
        label: "Les Entreprises ZLS",
        short: "ENT"
    },
    {
        value: "RENOVATION",
        label: "Rénovation Esthéban",
        short: "RENO"
    },
];

export function DivisionSwitcher() {
    const { division, setDivision } = useDivision();
    const { user, loading, checkPermission } = useCurrentUser();
    const [open, setOpen] = useState(false);

    // If loading, assume restricted or just show current to prevent flashing secrets
    // If user is present, filter divisions based on their permissions



    const allowedDivisions = divisions.filter(d =>
        // @ts-ignore
        checkPermission(d.value).hasDivisionAccess
    );

    const selectedDivision = divisions.find((d) => d.value === division);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-gray-900 border-gray-700 text-white hover:bg-gray-800 hover:text-white"
                >
                    <span className="truncate">{selectedDivision?.label}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-gray-900 border-gray-700 text-white">
                <div className="flex flex-col p-1">
                    {allowedDivisions.map((d) => (
                        <button
                            key={d.value}
                            onClick={() => {
                                setDivision(d.value as "EXTERMINATION" | "ENTREPRISES" | "RENOVATION");
                                setOpen(false);
                            }}
                            className={cn(
                                "flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-800 cursor-pointer text-left",
                                division === d.value ? "bg-gray-800" : ""
                            )}
                        >
                            <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    division === d.value ? "opacity-100" : "opacity-0"
                                )}
                            />
                            {d.label}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
