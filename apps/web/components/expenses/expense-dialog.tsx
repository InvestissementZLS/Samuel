"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { createExpense } from "@/app/actions/expense-actions";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExpenseDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES = [
    "Loyer / Rent",
    "Assurances / Insurance",
    "Essence / Gas",
    "Marketing",
    "Télécom / Internet",
    "Logiciels / Software",
    "Matériel / Equipment",
    "Véhicules / Vehicles",
    "Salaire / Payroll",
    "Autre / Other"
];

export function ExpenseDialog({ isOpen, onClose }: ExpenseDialogProps) {
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [date, setDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await createExpense({
                description,
                amount: parseFloat(amount),
                category,
                date,
                division: null // Global by default
            });
            toast.success("Dépense ajoutée");
            setDescription("");
            setAmount("");
            setDate(new Date());
            onClose();
        } catch (error) {
            toast.error("Erreur lors de l'ajout");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Ajouter une Dépense"
            description="Entrez les détails de la dépense (Facture, Reçu, etc.)"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Description</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ex: Loyer Janvier"
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">Montant ($)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">Catégorie</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                        >
                            {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Date</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal bg-background text-foreground",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Choisir une date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => d && setDate(d)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Enregistrement..." : "Ajouter"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
