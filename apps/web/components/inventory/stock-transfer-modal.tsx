'use client';

import { useState, useEffect } from 'react';
import { getAllProducts, transferStock } from '@/app/actions/inventory-actions';
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Transfer Stock</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Product</label>
                        <select
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900"
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
                            <label className="block text-sm font-medium text-gray-700">From</label>
                            <select
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900"
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
                            <label className="block text-sm font-medium text-gray-700">To</label>
                            <select
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-gray-900"
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
                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input
                            type="number"
                            min="1"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value))}
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Transferring...' : 'Transfer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
