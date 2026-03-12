'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { addProductUsed } from '@/app/actions/job-details-actions';
import { getTreatmentOptions, createTreatmentLocation, createTargetPest, createApplicationMethod } from '@/app/actions/treatment-actions';
import { getAllProducts } from '@/app/actions/inventory-actions';
import { Plus, Check, Minus } from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    const { t } = useLanguage();

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
        setProducts(prods.filter((p: any) => p.type === 'CONSUMABLE'));
        setLocations(options.locations);
        setPests(options.pests);
        setMethods(options.methods);
    };

    const handleSubmit = async () => {
        if (!selectedProduct) {
            toast.error(t.jobs.selectProductError);
            return;
        }
        if (quantity <= 0) {
            toast.error(t.jobs.quantityError);
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
            toast.success(t.jobs.usageRecorded);
            onClose();
            // Reset selections
            setSelectedProduct('');
            setSelectedLocations([]);
            setSelectedPests([]);
            setSelectedMethods([]);
            setQuantity(1);
        } catch (error) {
            console.error(error);
            toast.error(t.jobs.recordUsageError);
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
            toast.success(t.jobs.locationAdded);
        } else {
            toast.error(t.jobs.locationAddError);
        }
    };

    const handleAddPest = async () => {
        if (!newPest.trim()) return;
        const res = await createTargetPest(newPest);
        if (res.success) {
            setPests([...pests, res.data]);
            setNewPest('');
            toast.success(t.jobs.pestAdded);
        } else {
            toast.error(t.jobs.pestAddError);
        }
    };

    const handleAddMethod = async () => {
        if (!newMethod.trim()) return;
        const res = await createApplicationMethod(newMethod);
        if (res.success) {
            setMethods([...methods, res.data]);
            setNewMethod('');
            toast.success(t.jobs.methodAdded);
        } else {
            toast.error(t.jobs.methodAddError);
        }
    };

    const toggleSelection = (id: string, list: string[], setList: (l: string[]) => void) => {
        if (list.includes(id)) {
            setList(list.filter(i => i !== id));
        } else {
            setList([...list, id]);
        }
    };

    const incrementQuantity = (val: number) => {
        setQuantity(prev => Number((Math.max(0.1, prev + val)).toFixed(2)));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t.jobs.addMaterialUsage} maxWidth="max-w-2xl">
            <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1 pb-2">
                
                {/* Product Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">{t.jobs.chemicals} <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {products.map(p => (
                            <div 
                                key={p.id}
                                onClick={() => setSelectedProduct(p.id)}
                                className={cn(
                                    "px-3 py-2 text-sm rounded-lg border cursor-pointer flex items-center justify-between transition-colors",
                                    selectedProduct === p.id 
                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-400"
                                )}
                            >
                                <span className="truncate pr-2">{p.name}</span>
                                {selectedProduct === p.id && <Check className="h-4 w-4 shrink-0" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Locations Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">{t.jobs.locations}</label>
                    <div className="flex flex-wrap gap-2">
                        {locations.map(l => (
                            <div 
                                key={l.id}
                                onClick={() => toggleSelection(l.id, selectedLocations, setSelectedLocations)}
                                className={cn(
                                    "px-3 py-1.5 text-xs rounded-full border cursor-pointer flex items-center transition-colors",
                                    selectedLocations.includes(l.id)
                                        ? "bg-indigo-600 text-white border-indigo-600" 
                                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                                )}
                            >
                                {l.name}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                        <Input
                            value={newLocation}
                            onChange={(e) => setNewLocation(e.target.value)}
                            placeholder={t.jobs.addNew + "..."}
                            className="h-8 text-sm max-w-[200px]"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
                        />
                        <Button type="button" size="sm" variant="secondary" onClick={handleAddLocation} className="h-8 shadow-sm">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Target Pests Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">{t.jobs.targetPests}</label>
                    <div className="flex flex-wrap gap-2">
                        {pests.map(p => (
                            <div 
                                key={p.id}
                                onClick={() => toggleSelection(p.id, selectedPests, setSelectedPests)}
                                className={cn(
                                    "px-3 py-1.5 text-xs rounded-full border cursor-pointer flex items-center transition-colors",
                                    selectedPests.includes(p.id)
                                        ? "bg-rose-600 text-white border-rose-600" 
                                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                                )}
                            >
                                {p.name}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                        <Input
                            value={newPest}
                            onChange={(e) => setNewPest(e.target.value)}
                            placeholder={t.jobs.addNew + "..."}
                            className="h-8 text-sm max-w-[200px]"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPest()}
                        />
                        <Button type="button" size="sm" variant="secondary" onClick={handleAddPest} className="h-8 shadow-sm">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Methods Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">{t.jobs.methods}</label>
                    <div className="flex flex-wrap gap-2">
                        {methods.map(m => (
                            <div 
                                key={m.id}
                                onClick={() => toggleSelection(m.id, selectedMethods, setSelectedMethods)}
                                className={cn(
                                    "px-3 py-1.5 text-xs rounded-full border cursor-pointer flex items-center transition-colors",
                                    selectedMethods.includes(m.id)
                                        ? "bg-emerald-600 text-white border-emerald-600" 
                                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                                )}
                            >
                                {m.name}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                        <Input
                            value={newMethod}
                            onChange={(e) => setNewMethod(e.target.value)}
                            placeholder={t.jobs.addNew + "..."}
                            className="h-8 text-sm max-w-[200px]"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddMethod()}
                        />
                        <Button type="button" size="sm" variant="secondary" onClick={handleAddMethod} className="h-8 shadow-sm">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Quantity & Action */}
                <div className="pt-6 border-t mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky bottom-0 bg-white z-10">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold text-gray-700">Quantité (Total Unités)</label>
                        <div className="flex items-center gap-1.5">
                            <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => incrementQuantity(-1)}>
                                -1
                            </Button>
                            <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => incrementQuantity(-0.5)}>
                                -.5
                            </Button>
                            
                            <Input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-20 text-center mx-1 h-9 font-medium"
                                min="0.1"
                                step="0.1"
                            />

                            <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => incrementQuantity(0.5)}>
                                +.5
                            </Button>
                            <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => incrementQuantity(1)}>
                                +1
                            </Button>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
                            {t.common.cancel}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading || !selectedProduct}
                            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 min-w-[120px]"
                        >
                            {loading ? t.common.saving : t.jobs.saveUsage}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
