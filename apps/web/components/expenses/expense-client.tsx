"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { deleteExpense } from "@/app/actions/expense-actions";
import { Expense } from "@prisma/client";
import { format } from "date-fns";
import { toast } from "sonner";

interface ExpenseClientProps {
    initialExpenses: Expense[];
}

export function ExpenseClient({ initialExpenses }: ExpenseClientProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Note: In a real Next.js app with Server Actions, 
    // the page refreshes automatically on action success via revalidatePath.
    // So we don't strictly need local state for the list if we trust the server refresh.
    // However, optimistically updating or just relying on the server is fine.
    // Since we passed initialExpenses as prop, they won't update automatically on client side 
    // without a router refresh or a new fetch. 
    // revalidatePath in the action triggers a server re-render of the page component, 
    // which sends new props to this client component. So it works!

    const handleDelete = async (id: string) => {
        if (confirm("Êtes-vous sûr de vouloir supprimer cette dépense ?")) {
            await deleteExpense(id);
            toast.success("Supprimé");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => setIsDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une Dépense
                </Button>
            </div>

            <div className="bg-[#1e1e1e] rounded-xl border border-gray-800 overflow-hidden shadow-lg">
                <table className="w-full text-left">
                    <thead className="bg-[#252525] text-gray-400 text-xs uppercase font-medium">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Catégorie</th>
                            <th className="px-6 py-4 text-right">Montant</th>
                            <th className="px-6 py-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {initialExpenses.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    Aucune dépense ce mois-ci.
                                </td>
                            </tr>
                        ) : (
                            initialExpenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-gray-800/50 transition-colors group">
                                    <td className="px-6 py-4 text-gray-300 text-sm">
                                        {format(new Date(expense.date), "dd MMM yyyy")}
                                    </td>
                                    <td className="px-6 py-4 text-white font-medium">
                                        {expense.description}
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-sm">
                                        <span className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-300">
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-white">
                                        ${expense.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(expense.id)}
                                            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <ExpenseDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
            />
        </div>
    );
}
