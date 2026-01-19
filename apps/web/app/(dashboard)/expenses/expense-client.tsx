'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Calendar, Tag, RefreshCw } from 'lucide-react';
import { deleteExpense } from '@/app/actions/expense-actions';
import { toast } from 'sonner';
import { ExpenseDialog } from './expense-dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EXPENSE_CATEGORIES } from '@/lib/constants/expense-constants';

interface ExpenseClientProps {
    initialExpenses: any[];
}

export function ExpenseClient({ initialExpenses }: ExpenseClientProps) {
    const [expenses, setExpenses] = useState(initialExpenses);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleDelete = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer cette dépense ?")) return;

        try {
            await deleteExpense(id);
            setExpenses(expenses.filter(e => e.id !== id));
            toast.success("Dépense supprimée");
        } catch (error) {
            toast.error("Erreur lors de la suppression");
        }
    };

    const getCategoryLabel = (code: string) => {
        const cat = EXPENSE_CATEGORIES.find(c => c.code === code);
        return cat ? cat.label : code || "Autre";
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une Dépense
                </Button>
            </div>

            <Card className="border-gray-200">
                <CardContent className="p-0">
                    {expenses.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            Aucune dépense enregistrée pour cette période.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {expenses.map((expense) => (
                                <div key={expense.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                                    <div className="space-y-1.5">
                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                            {expense.description}
                                            {expense.frequency && expense.frequency !== 'ONCE' && (
                                                <Badge variant="outline" className="text-xs font-normal bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                                                    <RefreshCw className="h-3 w-3" />
                                                    {expense.frequency}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className="text-xs font-normal text-gray-600 bg-gray-100">
                                                {getCategoryLabel(expense.accountingCode || '')}
                                            </Badge>
                                            <span className="text-sm text-gray-500 flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(expense.date), 'dd MMM yyyy', { locale: fr })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900 text-lg">
                                                ${expense.amount.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-gray-500 uppercase tracking-wide">
                                                {expense.paymentMethod?.replace('_', ' ')}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(expense.id)}
                                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <ExpenseDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSuccess={(newExpense) => {
                    setExpenses([newExpense, ...expenses]);
                    setIsDialogOpen(false);
                }}
            />
        </div>
    );
}
