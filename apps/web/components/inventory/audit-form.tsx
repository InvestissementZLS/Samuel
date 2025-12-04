'use client';

import { useState, useEffect } from 'react';
import { getAllProducts, submitAudit } from '@/app/actions/inventory-actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface AuditFormProps {
    technicianId: string;
}

export function AuditForm({ technicianId }: AuditFormProps) {
    const [products, setProducts] = useState<any[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        const prods = await getAllProducts();
        setProducts(prods);
        // Initialize counts with 0 or fetch current inventory if we wanted to pre-fill (usually blind audit is better)
    };

    const handleCountChange = (productId: string, value: string) => {
        const num = parseInt(value) || 0;
        setCounts(prev => ({ ...prev, [productId]: num }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm("Submit inventory audit? This cannot be undone.")) return;

        setLoading(true);
        try {
            const items = Object.entries(counts).map(([productId, actualQuantity]) => ({
                productId,
                actualQuantity
            }));

            // Include 0 for products not entered? Or only submit what was entered?
            // Let's submit 0 for anything not entered to be safe, assuming full audit.
            const allItems = products.map(p => ({
                productId: p.id,
                actualQuantity: counts[p.id] || 0
            }));

            const res = await submitAudit(technicianId, allItems);

            if (res.success) {
                toast.success("Audit submitted successfully");
                router.push('/inventory'); // Redirect to dashboard or home
            } else {
                toast.error("Failed to submit audit");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Weekly Inventory Audit</h2>
            <p className="text-sm text-gray-500 mb-6">Please enter the actual quantity on hand for each item.</p>

            <div className="space-y-4">
                {products.map(product => (
                    <div key={product.id} className="flex items-center justify-between border-b pb-2">
                        <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-gray-500">{product.type} - {product.unit}</div>
                        </div>
                        <input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="w-24 p-2 border rounded text-right"
                            value={counts[product.id] === undefined ? '' : counts[product.id]}
                            onChange={(e) => handleCountChange(product.id, e.target.value)}
                        />
                    </div>
                ))}
            </div>

            <div className="pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Submitting..." : "Submit Audit"}
                </button>
            </div>
        </form>
    );
}
