'use client';

import { useState, useEffect } from 'react';
import { getStockableProducts, transferStock } from '@/app/actions/inventory-actions';
import { Modal } from "@/components/ui/modal";
import { getTechnicians } from '@/app/actions/technician-actions';
import { toast } from 'sonner';

interface StockTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface StockableProduct {
    id: string;
    name: string;
    unit: string;
    type: 'CONSUMABLE' | 'EQUIPMENT';
}

export function StockTransferModal({ isOpen, onClose, onSuccess }: StockTransferModalProps) {
    const [products, setProducts] = useState<StockableProduct[]>([]);
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
            getStockableProducts(),
            getTechnicians()
        ]);
        setProducts(prods as StockableProduct[]);
        setTechnicians(techs);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (fromId === toId) {
            toast.error("La source et la destination ne peuvent pas être identiques");
            return;
        }

        setLoading(true);
        try {
            const fromUserId = fromId === 'WAREHOUSE' ? null : fromId;
            const toUserId = toId === 'WAREHOUSE' ? null : toId;

            const res = await transferStock(fromUserId, toUserId, [{ productId, quantity }]);

            if (res.success) {
                toast.success("Stock transféré avec succès");
                onSuccess();
                onClose();
                // Reset form
                setProductId('');
                setQuantity(1);
            } else {
                toast.error(res.error || "Échec du transfert");
            }
        } catch (error) {
            console.error(error);
            toast.error("Échec du transfert");
        } finally {
            setLoading(false);
        }
    };

    const consumables = products.filter(p => p.type === 'CONSUMABLE');
    const equipment   = products.filter(p => p.type === 'EQUIPMENT');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Transfert de Stock"
        >
            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Product selector — grouped by type */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                        Produit / Équipement
                    </label>
                    <select
                        required
                        className="mt-1 block w-full rounded-md border p-2 bg-background text-foreground"
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                    >
                        <option value="">— Sélectionner un article —</option>

                        {consumables.length > 0 && (
                            <optgroup label="🧪 Consommables">
                                {consumables.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.unit})
                                    </option>
                                ))}
                            </optgroup>
                        )}

                        {equipment.length > 0 && (
                            <optgroup label="🔧 Équipements & Outils">
                                {equipment.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.unit})
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>

                    {products.length === 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                            Aucun article en stock disponible.
                        </p>
                    )}
                </div>

                {/* From / To */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground">De</label>
                        <select
                            className="mt-1 block w-full rounded-md border p-2 bg-background text-foreground"
                            value={fromId}
                            onChange={(e) => setFromId(e.target.value)}
                        >
                            <option value="WAREHOUSE">🏭 Entrepôt</option>
                            {technicians.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground">Vers</label>
                        <select
                            required
                            className="mt-1 block w-full rounded-md border p-2 bg-background text-foreground"
                            value={toId}
                            onChange={(e) => setToId(e.target.value)}
                        >
                            <option value="">— Sélectionner —</option>
                            <option value="WAREHOUSE">🏭 Entrepôt</option>
                            {technicians.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Quantity */}
                <div>
                    <label className="block text-sm font-medium text-foreground">Quantité</label>
                    <input
                        type="number"
                        min="1"
                        required
                        className="mt-1 block w-full rounded-md border p-2 bg-background text-foreground"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-foreground border rounded-md hover:bg-muted"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? 'Transfert en cours...' : 'Transférer'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
