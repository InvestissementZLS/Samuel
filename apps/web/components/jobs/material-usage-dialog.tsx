'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { addProductUsed } from '@/app/actions/job-details-actions';
import { getTreatmentOptions, createTreatmentLocation, createTargetPest, createApplicationMethod } from '@/app/actions/treatment-actions';
import { getAllProducts } from '@/app/actions/inventory-actions';
import { Plus, Check } from 'lucide-react';

interface MaterialUsageDialogProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
}

export function MaterialUsageDialog({ isOpen, onClose, jobId }: MaterialUsageDialogProps) {
    const [products, setProducts] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [pests, setPests] = useState<any[]>([]);
    const [methods, setMethods] = useState<any[]>([]);

    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [selectedPests, setSelectedPests] = useState<string[]>([]);
    const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
    const [quantity, setQuantity] = useState<number>(1);
    const [loading, setLoading] = useState(false);

    // "Add New" states
    const [newLocation, setNewLocation] = useState('');
    const [newPest, setNewPest] = useState('');
    const [newMethod, setNewMethod] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadOptions();
        }
    }, [isOpen]);

    const loadOptions = async () => {
        const [prods, options] = await Promise.all([
            getAllProducts(),
            getTreatmentOptions()
        ]);
        setProducts(prods);
        setLocations(options.locations);
        setPests(options.pests);
        setMethods(options.methods);
    };

    const handleSubmit = async () => {
        if (!selectedProduct) {
            toast.error("Please select a product");
            return;
        }
        if (quantity <= 0) {
            toast.error("Quantity must be positive");
            return;
        }

        setLoading(true);
        try {
            await addProductUsed(
                jobId,
                selectedProduct,
                quantity,
                selectedLocations,
                selectedPests,
                selectedMethods
            );
            toast.success("Material usage recorded");
            onClose();
            // Reset selections
            setSelectedProduct('');
            setSelectedLocations([]);
            setSelectedPests([]);
            setSelectedMethods([]);
            setQuantity(1);
        } catch (error) {
            console.error(error);
            toast.error("Failed to record usage");
        } finally {
            setLoading(false);
        }
    };

    const handleAddLocation = async () => {
        if (!newLocation.trim()) return;
        const res = await createTreatmentLocation(newLocation);
        if (res.success) {
            setLocations([...locations, res.data]);
            setNewLocation('');
            toast.success("Location added");
        } else {
            toast.error("Failed to add location");
        }
    };

    const handleAddPest = async () => {
        if (!newPest.trim()) return;
        const res = await createTargetPest(newPest);
        if (res.success) {
            setPests([...pests, res.data]);
            setNewPest('');
            toast.success("Pest added");
        } else {
            toast.error("Failed to add pest");
        }
    };

    const handleAddMethod = async () => {
        if (!newMethod.trim()) return;
        const res = await createApplicationMethod(newMethod);
        if (res.success) {
            setMethods([...methods, res.data]);
            setNewMethod('');
            toast.success("Method added");
        } else {
            toast.error("Failed to add method");
        }
    };

    const toggleSelection = (id: string, list: string[], setList: (l: string[]) => void) => {
        if (list.includes(id)) {
            setList(list.filter(i => i !== id));
        } else {
            setList([...list, id]);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Material Usage" maxWidth="max-w-6xl">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[500px]">
                    {/* Column 1: Chemicals (Products) */}
                    <div className="border rounded-lg flex flex-col">
                        <div className="p-3 bg-gray-50 border-b font-semibold">Chemicals</div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {products.filter(p => p.type === 'CONSUMABLE').map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedProduct(p.id)}
                                    className={`p-2 rounded cursor-pointer text-sm flex justify-between items-center ${selectedProduct === p.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-50'}`}
                                >
                                    <span>{p.name}</span>
                                    {selectedProduct === p.id && <Check className="h-4 w-4" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Locations */}
                    <div className="border rounded-lg flex flex-col">
                        <div className="p-3 bg-gray-50 border-b font-semibold">Locations</div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {locations.map(l => (
                                <div
                                    key={l.id}
                                    onClick={() => toggleSelection(l.id, selectedLocations, setSelectedLocations)}
                                    className={`p-2 rounded cursor-pointer text-sm flex justify-between items-center ${selectedLocations.includes(l.id) ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-50'}`}
                                >
                                    <span>{l.name}</span>
                                    {selectedLocations.includes(l.id) && <Check className="h-4 w-4" />}
                                </div>
                            ))}
                        </div>
                        <div className="p-2 border-t flex gap-2">
                            <input
                                type="text"
                                value={newLocation}
                                onChange={(e) => setNewLocation(e.target.value)}
                                placeholder="Add New..."
                                className="flex-1 text-sm border rounded px-2 py-1"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
                            />
                            <button onClick={handleAddLocation} className="p-1 bg-gray-100 rounded hover:bg-gray-200">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Column 3: Target Pests */}
                    <div className="border rounded-lg flex flex-col">
                        <div className="p-3 bg-gray-50 border-b font-semibold">Target Pests</div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {pests.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => toggleSelection(p.id, selectedPests, setSelectedPests)}
                                    className={`p-2 rounded cursor-pointer text-sm flex justify-between items-center ${selectedPests.includes(p.id) ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-50'}`}
                                >
                                    <span>{p.name}</span>
                                    {selectedPests.includes(p.id) && <Check className="h-4 w-4" />}
                                </div>
                            ))}
                        </div>
                        <div className="p-2 border-t flex gap-2">
                            <input
                                type="text"
                                value={newPest}
                                onChange={(e) => setNewPest(e.target.value)}
                                placeholder="Add New..."
                                className="flex-1 text-sm border rounded px-2 py-1"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddPest()}
                            />
                            <button onClick={handleAddPest} className="p-1 bg-gray-100 rounded hover:bg-gray-200">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Column 4: Methods */}
                    <div className="border rounded-lg flex flex-col">
                        <div className="p-3 bg-gray-50 border-b font-semibold">Method</div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {methods.map(m => (
                                <div
                                    key={m.id}
                                    onClick={() => toggleSelection(m.id, selectedMethods, setSelectedMethods)}
                                    className={`p-2 rounded cursor-pointer text-sm flex justify-between items-center ${selectedMethods.includes(m.id) ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-50'}`}
                                >
                                    <span>{m.name}</span>
                                    {selectedMethods.includes(m.id) && <Check className="h-4 w-4" />}
                                </div>
                            ))}
                        </div>
                        <div className="p-2 border-t flex gap-2">
                            <input
                                type="text"
                                value={newMethod}
                                onChange={(e) => setNewMethod(e.target.value)}
                                placeholder="Add New..."
                                className="flex-1 text-sm border rounded px-2 py-1"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddMethod()}
                            />
                            <button onClick={handleAddMethod} className="p-1 bg-gray-100 rounded hover:bg-gray-200">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                    <div className="flex items-center gap-4">
                        <label className="font-medium">Quantity Used:</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="border rounded p-2 w-24"
                            min="0.1"
                            step="0.1"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !selectedProduct}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Usage'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
