'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { createExpense } from '@/app/actions/expense-actions';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { EXPENSE_CATEGORIES, RECURRENCE_OPTIONS } from '@/lib/constants/expense-constants';

interface ExpenseDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (expense: any) => void;
}

export function ExpenseDialog({ isOpen, onClose, onSuccess }: ExpenseDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Form States
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryCode, setCategoryCode] = useState(EXPENSE_CATEGORIES[0].code);
    const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
    const [frequency, setFrequency] = useState('ONCE');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const selectedCat = EXPENSE_CATEGORIES.find(c => c.code === categoryCode);

            const formData = new FormData();
            formData.append('description', description);
            formData.append('amount', amount);
            formData.append('date', date);
            formData.append('category', selectedCat?.name || 'Autre');
            formData.append('accountingCode', categoryCode);
            formData.append('paymentMethod', paymentMethod);
            formData.append('frequency', frequency);

            const result = await createExpense(formData);

            if (result.success) {
                toast.success("Dépense ajoutée !");
                onSuccess(result.expense);
                // Reset defaults
                setDescription('');
                setAmount('');
                setCategoryCode(EXPENSE_CATEGORIES[0].code);
                setFrequency('ONCE');
            } else {
                toast.error("Erreur: " + result.error);
            }
        } catch (error) {
            toast.error("Erreur inattendue");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Ajouter une Dépense"
            maxWidth="max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                        required
                        type="text"
                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ex: Essence Ford F150..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Montant ($)</label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            required
                            type="date"
                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie Comptable (T2125)</label>
                    <select
                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={categoryCode}
                        onChange={e => setCategoryCode(e.target.value)}
                    >
                        {EXPENSE_CATEGORIES.map(cat => (
                            <option key={cat.code} value={cat.code}>
                                {cat.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Paiement</label>
                        <select
                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={paymentMethod}
                            onChange={e => setPaymentMethod(e.target.value)}
                        >
                            <option value="CREDIT_CARD">Carte Crédit</option>
                            <option value="DEBIT_CARD">Débit</option>
                            <option value="CASH">Comptant</option>
                            <option value="TRANSFER">Virement</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Récurrence</label>
                        <select
                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={frequency}
                            onChange={e => setFrequency(e.target.value)}
                        >
                            {RECURRENCE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Annuler</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Enregistrer'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
