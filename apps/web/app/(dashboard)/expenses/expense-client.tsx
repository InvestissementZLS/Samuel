'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Calendar, Tag, RefreshCw, Check, X, User, Image as ImageIcon } from 'lucide-react';
import { deleteExpense, updateExpenseStatus } from '@/app/actions/expense-actions';
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
            setExpenses(expenses.filter((e: any) => e.id !== id));
            toast.success("Dépense supprimée");
        } catch (error) {
            toast.error("Erreur lors de la suppression");
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
        try {
            await updateExpenseStatus(id, newStatus as any);
            setExpenses(expenses.map((e: any) => e.id === id ? { ...e, status: newStatus } : e));
            toast.success(`Dépense ${newStatus === 'APPROVED' ? 'approuvée' : 'rejetée'}`);
        } catch (error) {
            toast.error("Erreur lors de la mise à jour du statut");
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
                                            {expense.status === 'PENDING' && <Badge variant="outline" className="text-xs text-yellow-600 bg-yellow-50 border-yellow-200">En attente</Badge>}
                                            {expense.status === 'APPROVED' && <Badge variant="outline" className="text-xs text-green-600 bg-green-50 border-green-200">Approuvée</Badge>}
                                            {expense.status === 'REJECTED' && <Badge variant="outline" className="text-xs text-red-600 bg-red-50 border-red-200">Rejetée</Badge>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 mt-1">
                                            {expense.user && (
                                                <span className="text-sm text-gray-600 flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    {expense.user.name || expense.user.email}
                                                </span>
                                            )}
                                            {expense.receiptUrl && (
                                                <a href={expense.receiptUrl} target="_blank" rel="noreferrer" className="text-sm flex items-center gap-1 text-blue-600 hover:underline">
                                                    <ImageIcon className="h-3 w-3" /> Reçu
                                                </a>
                                            )}
                                            <Badge variant="secondary" className="text-xs font-normal text-gray-600 bg-gray-100">
                                                {getCategoryLabel(expense.accountingCode || expense.category || '')}
                                            </Badge>
                                            <span className="text-sm text-gray-500 flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(expense.date), 'dd MMM yyyy', { locale: fr })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mt-3 sm:mt-0">
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900 text-lg">
                                                ${parseFloat(expense.amount).toFixed(2)}
                                            </div>
                                            <div className="text-xs text-gray-500 uppercase tracking-wide">
                                                {expense.paymentMethod?.replace('_', ' ')}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {expense.status === 'PENDING' && (
                                                <>
                                                    <Button size="icon" variant="outline" className="h-8 w-8 text-green-600 border-green-200 bg-green-50 hover:bg-green-100" onClick={() => handleStatusUpdate(expense.id, 'APPROVED')} title="Approuver"><Check className="h-4 w-4" /></Button>
                                                    <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 border-red-200 bg-red-50 hover:bg-red-100" onClick={() => handleStatusUpdate(expense.id, 'REJECTED')} title="Rejeter"><X className="h-4 w-4" /></Button>
                                                </>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(expense.id)}
                                                className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
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
