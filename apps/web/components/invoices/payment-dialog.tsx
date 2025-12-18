"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { recordTransaction } from "@/app/actions/transaction-actions";
import { PaymentMethod, TransactionType } from "@prisma/client";
import { format } from "date-fns";

interface PaymentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceId: string;
    total: number;
    amountPaid: number;
    type: TransactionType; // PAYMENT or REFUND
}

export function PaymentDialog({ isOpen, onClose, invoiceId, total, amountPaid, type }: PaymentDialogProps) {
    const [amount, setAmount] = useState<number>(0);
    const [method, setMethod] = useState<PaymentMethod>("CARD"); // Default
    const [note, setNote] = useState("");
    const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [loading, setLoading] = useState(false);

    // Initial amount suggestion
    // If Payment: suggest remaining balance
    // If Refund: suggest total paid so far (max refundable)
    const suggestedAmount = type === 'PAYMENT' ? (total - amountPaid) : amountPaid;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await recordTransaction({
                invoiceId,
                amount,
                method,
                type,
                note,
                date: new Date(date)
            });
            toast.success(`${type === 'PAYMENT' ? 'Payment' : 'Refund'} recorded successfully`);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Failed to record transaction");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={type === 'PAYMENT' ? "Register Payment" : "Issue Refund"}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Amount ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={amount || suggestedAmount} // rudimentary controlled input
                        onChange={(e) => setAmount(parseFloat(e.target.value))}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        {type === 'PAYMENT'
                            ? `Balance Due: $${(total - amountPaid).toFixed(2)}`
                            : `Max Refundable: $${amountPaid.toFixed(2)}`}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Method</label>
                    <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                    >
                        <option value="CARD">Credit/Debit Card</option>
                        <option value="CASH">Cash</option>
                        <option value="TRANSFER">Bank Transfer</option>
                        <option value="CHECK">Check</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Note (Optional)</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        rows={3}
                        placeholder="Transaction ID, Check #, etc."
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={onClose} disabled={loading} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading} className={type === 'REFUND' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}>
                        {loading ? "Processing..." : (type === 'PAYMENT' ? "Register Payment" : "Issue Refund")}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
