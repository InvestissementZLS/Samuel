'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { addBillableService } from '@/app/actions/job-billing-actions';
import { Product } from '@prisma/client';
import { Check, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface BillableServiceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    availableServices: Product[];
}

export function BillableServiceDialog({ isOpen, onClose, jobId, availableServices }: BillableServiceDialogProps) {
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleSubmit = async () => {
        if (!selectedProduct) {
            toast.error("Please select a service");
            return;
        }
        if (quantity <= 0) {
            toast.error("Quantity must be positive");
            return;
        }

        setLoading(true);
        try {
            const res = await addBillableService(jobId, selectedProduct, quantity);
            if (res.success) {
                toast.success("Service added to invoice");
                onClose();
                setSelectedProduct('');
                setQuantity(1);
            } else {
                toast.error(res.error || "Failed to add service");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to add service");
        } finally {
            setLoading(false);
        }
    };

    const filteredServices = availableServices.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Billable Service" maxWidth="max-w-2xl">
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search services..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="border rounded-lg h-64 overflow-y-auto">
                    {filteredServices.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">No services found.</div>
                    ) : (
                        <div className="divide-y">
                            {filteredServices.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedProduct(p.id)}
                                    className={`p-3 cursor-pointer flex justify-between items-center transition-colors ${selectedProduct === p.id ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <div>
                                        <div className="font-medium">{p.name}</div>
                                        <div className="text-xs text-gray-500">${p.price.toFixed(2)}</div>
                                    </div>
                                    {selectedProduct === p.id && <Check className="h-5 w-5 text-indigo-600" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-700">Quantity:</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="border rounded p-2 w-20 text-center"
                            min="1"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50 text-sm font-medium">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !selectedProduct}
                            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                        >
                            {loading ? 'Adding...' : 'Add Service'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
