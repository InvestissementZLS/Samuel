'use client';

import { useState, useEffect } from 'react';
import { getAllProducts, transferStock } from '@/app/actions/inventory-actions';
import { Modal } from "@/components/ui/modal";
import { getTechnicians } from '@/app/actions/technician-actions';
import { toast } from 'sonner';

interface StockTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function StockTransferModal({ isOpen, onClose, onSuccess }: StockTransferModalProps) {
    const [products, setProducts] = useState<any[]>([]);
    const [technicians, setTechnicians] = useState<any[]>([]);

    const [productId, setProductId] = useState('');
    const [fromId, setFromId] = useState<string>('WAREHOUSE'); // 'WAREHOUSE' or userId
    const [toId, setToId] = useState<string>(''); // 'WAREHOUSE' or userId
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        const [prods, techs] = await Promise.all([
            getAllProducts(),
            getTechnicians()
        ]);
        setProducts(prods);
        setTechnicians(techs);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (fromId === toId) {
            toast.error("Source and destination cannot be the same");
            return;
        }

        setLoading(true);
        try {
            const fromUserId = fromId === 'WAREHOUSE' ? null : fromId;
            const toUserId = toId === 'WAREHOUSE' ? null : toId;

            const res = await transferStock(productId, fromUserId, toUserId, quantity);

            if (res.success) {
                toast.success("Stock transferred successfully");
                onSuccess();
                onClose();
                // Reset form
                setProductId('');
                setQuantity(1);
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Transfer failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Transfer Stock"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-foreground">Product</label>
                    <select
                        required
                        className="mt-1 block w-full rounded-md border p-2 bg-background text-foreground"
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                    >
                        <option value="">Select Product</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground">From</label>
                        <select
                            className="mt-1 block w-full rounded-md border p-2 bg-background text-foreground"
                            value={fromId}
                            onChange={(e) => setFromId(e.target.value)}
                        >
                            <option value="WAREHOUSE">Warehouse</option>
                            {technicians.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground">To</label>
                        <select
                            required
                            className="mt-1 block w-full rounded-md border p-2 bg-background text-foreground"
                            value={toId}
                            onChange={(e) => setToId(e.target.value)}
                        >
                            <option value="">Select Destination</option>
                            <option value="WAREHOUSE">Warehouse</option>
                            {technicians.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground">Quantity</label>
                    <input
                        type="number"
                        min="1"
                        required
                        className="mt-1 block w-full rounded-md border p-2 bg-background text-foreground"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-foreground border rounded-md hover:bg-muted"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? 'Transferring...' : 'Transfer'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
