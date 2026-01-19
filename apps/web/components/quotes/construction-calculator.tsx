"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Calculator, Ruler, TrendingUp } from "lucide-react";

interface ConstructionCalculatorProps {
    isOpen: boolean;
    onClose: () => void;
    division: "EXTERMINATION" | "ENTREPRISES";
    onConfirm: (item: { description: string; price: number; quantity: number; cost: number }) => void;
}

type ServiceType = "CALFEUTRAGE" | "BLOCAGE" | "ISOLATION" | "DECONTAMINATION";

const RATES = {
    CALFEUTRAGE: { basePrice: 8, unit: "lin.ft", label: "Calfeutrage / Caulking" },
    BLOCAGE: { basePrice: 15, unit: "lin.ft", label: "Blocage / Blocking" },
    ISOLATION: { basePrice: 5, unit: "sq.ft", label: "Isolation / Insulation" },
    DECONTAMINATION: { basePrice: 8, unit: "sq.ft", label: "Décontamination" },
};

const DIFFICULTY_MULTIPLIERS = {
    LOW: { value: 1.0, label: "Simple (Sol/Accès facile)" },
    MEDIUM: { value: 1.3, label: "Moyen (Escabeau/Obstacles)" },
    HIGH: { value: 1.6, label: "Difficile (Grande échelle/Confiné)" },
    EXTREME: { value: 2.0, label: "Extrême (Nacelle/Conditions Dangereuses)" },
};

export function ConstructionCalculator({ isOpen, onClose, division, onConfirm }: ConstructionCalculatorProps) {
    const [serviceType, setServiceType] = useState<ServiceType>("CALFEUTRAGE");
    const [measurement, setMeasurement] = useState<number>(0);
    const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTY_MULTIPLIERS>("LOW");
    const [calculatedPrice, setCalculatedPrice] = useState(0);

    // Filter services based on division
    const availableServices: ServiceType[] = division === "EXTERMINATION"
        ? ["CALFEUTRAGE", "BLOCAGE"]
        : ["CALFEUTRAGE", "ISOLATION", "DECONTAMINATION"];

    // Reset service type if not available when switching divisions
    useEffect(() => {
        if (!availableServices.includes(serviceType)) {
            setServiceType(availableServices[0]);
        }
    }, [division]);

    // Auto-calculate on change
    useEffect(() => {
        const rate = RATES[serviceType];
        const multiplier = DIFFICULTY_MULTIPLIERS[difficulty].value;
        const price = Math.round(measurement * rate.basePrice * multiplier);
        setCalculatedPrice(price);
    }, [serviceType, measurement, difficulty]);

    const handleConfirm = () => {
        const rate = RATES[serviceType];
        const multiplier = DIFFICULTY_MULTIPLIERS[difficulty].value;

        // Description format: "Calfeutrage - 50 lin.ft (Difficile)"
        const description = `${rate.label} - ${measurement} ${rate.unit} (${DIFFICULTY_MULTIPLIERS[difficulty].label})`;

        // We set Unit Price as the total calculated price / quantity (which we'll distinct as 1 service unit, or we can use measurement)
        // Usually accurate to put Quantity = Measurement, Price = Rate * Multiplier

        onConfirm({
            description: rate.label + (difficulty !== 'LOW' ? ` (${DIFFICULTY_MULTIPLIERS[difficulty].label})` : ''),
            quantity: measurement,
            price: Number((rate.basePrice * multiplier).toFixed(2)),
            cost: 0 // Labor/Material internal cost logic is separate for now
        });

        // Reset and close
        setMeasurement(0);
        setDifficulty("LOW");
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Calculateur Chantier (${division === 'EXTERMINATION' ? 'Extermination' : 'Entreprises'})`}
        >
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">Type de Travail / Type of Work</label>
                    <div className="grid grid-cols-2 gap-2">
                        {availableServices.map((s) => (
                            <button
                                key={s}
                                onClick={() => setServiceType(s)}
                                className={`p-3 rounded-md border text-sm font-medium transition-colors ${serviceType === s
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "bg-background text-foreground border-input hover:bg-accent"
                                    }`}
                            >
                                {RATES[s].label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground flex items-center gap-2">
                            <Ruler className="w-4 h-4" />
                            Mesure ({RATES[serviceType].unit})
                        </label>
                        <input
                            type="number"
                            value={measurement}
                            onChange={(e) => setMeasurement(Number(e.target.value))}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                            placeholder="0"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Difficulté / Accès
                        </label>
                        <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value as any)}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                        >
                            {Object.entries(DIFFICULTY_MULTIPLIERS).map(([key, data]) => (
                                <option key={key} value={key}>
                                    {data.label} (x{data.value})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="bg-muted p-4 rounded-lg flex justify-between items-center border border-border">
                    <div>
                        <p className="text-xs text-muted-foreground">Prix Suggéré / Suggested Price</p>
                        <p className="text-xs text-muted-foreground italic">
                            {measurement} {RATES[serviceType].unit} x ${RATES[serviceType].basePrice} x {DIFFICULTY_MULTIPLIERS[difficulty].value}
                        </p>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        ${calculatedPrice.toFixed(2)}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button onClick={handleConfirm} disabled={measurement <= 0}>
                        <Calculator className="w-4 h-4 mr-2" />
                        Ajouter à la Soumission
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
