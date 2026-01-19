"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface UnitCostCalculatorProps {
    unit: string;
    onApply: (cost: number) => void;
}

export function UnitCostCalculator({ unit, onApply }: UnitCostCalculatorProps) {
    const [containerPrice, setContainerPrice] = useState<string>("");
    const [containerVolume, setContainerVolume] = useState<string>("");
    const [isOpen, setIsOpen] = useState(false);

    const price = parseFloat(containerPrice);
    const volume = parseFloat(containerVolume);
    const calculatedCost = (price && volume) ? (price / volume) : 0;

    const handleApply = () => {
        if (calculatedCost > 0) {
            onApply(Number(calculatedCost.toFixed(4)));
            setIsOpen(false);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 px-2 text-xs text-indigo-400 hover:text-indigo-300">
                    <Calculator className="w-3 h-3 mr-1" />
                    Calculate
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 bg-[#1e1e1e] border-gray-700 p-4 shadow-xl">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-white text-sm">Unit Cost Calculator</h4>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Container Price ($)</label>
                            <input
                                type="number"
                                value={containerPrice}
                                onChange={(e) => setContainerPrice(e.target.value)}
                                placeholder="e.g. 50.00"
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-gray-600"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Container Volume ({unit || 'units'})</label>
                            <input
                                type="number"
                                value={containerVolume}
                                onChange={(e) => setContainerVolume(e.target.value)}
                                placeholder="e.g. 500"
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-gray-600"
                            />
                        </div>

                        <div className="bg-gray-900/50 p-3 rounded border border-gray-800 flex justify-between items-center">
                            <span className="text-xs text-gray-500">Result ({unit}):</span>
                            <span className="text-sm font-mono text-emerald-400 font-medium">
                                ${calculatedCost > 0 ? calculatedCost.toFixed(4) : "0.0000"}
                            </span>
                        </div>

                        <Button
                            onClick={handleApply}
                            disabled={calculatedCost <= 0}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs"
                        >
                            Apply Cost
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
