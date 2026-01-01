"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { createProduct, updateProduct, deleteProduct, getConsumables, getProductDetails } from "@/app/actions/product-actions";
import { Product } from "@prisma/client";
import { Trash2, Plus } from "lucide-react";

interface ProductDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product?: Product | null;
}

export function ProductDialog({ isOpen, onClose, product }: ProductDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [usageDescription, setUsageDescription] = useState("");
    const [activeIngredient, setActiveIngredient] = useState("");
    const [recommendedConcentration, setRecommendedConcentration] = useState("");
    const [unit, setUnit] = useState("ml");
    const [stock, setStock] = useState(0);
    const [price, setPrice] = useState(0);
    const [cost, setCost] = useState(0);
    const [division, setDivision] = useState<"EXTERMINATION" | "ENTREPRISES">("EXTERMINATION");
    const [type, setType] = useState<"CONSUMABLE" | "EQUIPMENT" | "SERVICE">("CONSUMABLE");
    const [isCommissionEligible, setIsCommissionEligible] = useState(false);
    const [warrantyInfo, setWarrantyInfo] = useState("");
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [minTechnicians, setMinTechnicians] = useState(1);
    const [materials, setMaterials] = useState<{ id: string; quantity: number }[]>([]);

    // Available Consumables
    const [availableConsumables, setAvailableConsumables] = useState<{ id: string, name: string, unit: string }[]>([]);
    const [loading, setLoading] = useState(false);

    // Warranty Templates
    const [warrantyTemplates, setWarrantyTemplates] = useState<{ id: string, name: string, text: string }[]>([]);

    useEffect(() => {
        if (type === 'SERVICE') {
            import("@/app/actions/warranty-actions").then(mod => {
                mod.getWarrantyTemplates().then(setWarrantyTemplates);
            });
            getConsumables().then(setAvailableConsumables);
        }
    }, [type]);

    useEffect(() => {
        if (isOpen) {
            if (product) {
                setName(product.name);
                setDescription(product.description || "");
                // @ts-ignore
                setUsageDescription(product.usageDescription || "");
                // @ts-ignore
                setActiveIngredient(product.activeIngredient || "");
                // @ts-ignore
                setRecommendedConcentration(product.recommendedConcentration || "");
                setUnit(product.unit);
                setStock(product.stock);
                setPrice(product.price);
                // @ts-ignore
                setCost(product.cost || 0);
                // @ts-ignore
                setDivision(product.division || "EXTERMINATION");
                // @ts-ignore
                setType(product.type || "CONSUMABLE");
                // @ts-ignore
                setIsCommissionEligible(product.isCommissionEligible || false);
                // @ts-ignore
                setWarrantyInfo(product.warrantyInfo || "");
                // @ts-ignore
                setDurationMinutes(product.durationMinutes || 60);
                // @ts-ignore
                setMinTechnicians(product.minTechnicians || 1);
            }
        } else {
            setName("");
            setDescription("");
            setUsageDescription("");
            setActiveIngredient("");
            setRecommendedConcentration("");
            setUnit("ml");
            setStock(0);
            setPrice(0);
            setCost(0);
            setDivision("EXTERMINATION");
            setType("CONSUMABLE");
            setIsCommissionEligible(false);
            setWarrantyInfo("");
            setDurationMinutes(60);
            setMinTechnicians(1);
        }
    }
    }, [isOpen, product]);

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        if (product) {
            await updateProduct(product.id, {
                name,
                description,
                unit,
                usageDescription,
                stock: Number(stock),
                price: Number(price),
                cost: Number(cost),
                division,
                type,
                isCommissionEligible,
                warrantyInfo,
                durationMinutes,
                minTechnicians,
                materials
            });
            toast.success("Product updated successfully");
        } else {
            await createProduct({
                name,
                description,
                unit,
                usageDescription,
                activeIngredient,
                recommendedConcentration,
                stock: Number(stock),
                price: Number(price),
                cost: Number(cost),
                division,
                type,
                isCommissionEligible,
                warrantyInfo,
                durationMinutes,
                minTechnicians,
                materials
            });
            toast.success("Product created successfully");
        }
        onClose();
    } catch (error) {
        console.error("Failed to save product:", error);
        toast.error("Failed to save product");
    } finally {
        setLoading(false);
    }
};

const handleDelete = async () => {
    if (!product || !confirm("Are you sure you want to delete this product?")) return;
    setLoading(true);
    try {
        await deleteProduct(product.id);
        toast.success("Product deleted successfully");
        onClose();
    } catch (error) {
        console.error("Failed to delete product:", error);
        toast.error("Failed to delete product");
    } finally {
        setLoading(false);
    }
};

return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={product ? "Edit Product" : "New Product"}
    >
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Division</label>
                    <select
                        value={division}
                        onChange={(e) => setDivision(e.target.value as "EXTERMINATION" | "ENTREPRISES")}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                    >
                        <option value="EXTERMINATION">Extermination ZLS</option>
                        <option value="ENTREPRISES">Les Entreprises ZLS</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Type</label>
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as "CONSUMABLE" | "EQUIPMENT" | "SERVICE")}
                    className="w-full rounded-md border p-2 bg-background text-foreground"
                >
                    <option value="CONSUMABLE">Consumable</option>
                    <option value="EQUIPMENT">Equipment (Tools/Machines)</option>
                    <option value="SERVICE">Service (Template)</option>
                </select>
            </div>


            <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Product Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border p-2 bg-background text-foreground"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Description</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-md border p-2 bg-background text-foreground"
                    rows={3}
                />
            </div>

            {type === 'SERVICE' && (
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-foreground">Warranty Information (Template)</label>
                        {warrantyTemplates.length > 0 && (
                            <select
                                className="text-xs border rounded p-1 bg-background text-foreground"
                                onChange={(e) => {
                                    const t = warrantyTemplates.find(w => w.id === e.target.value);
                                    if (t) setWarrantyInfo(t.text);
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>Paste from Template...</option>
                                {warrantyTemplates.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <textarea
                        value={warrantyInfo}
                        onChange={(e) => setWarrantyInfo(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        rows={3}
                        placeholder="Default warranty text for this service..."
                    />
                </div>
            )}

            {type === 'SERVICE' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">Duration (Minutes)</label>
                        <input
                            type="number"
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(Number(e.target.value))}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                            required
                            min="15"
                            step="15"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">Required Technicians</label>
                        <input
                            type="number"
                            value={minTechnicians}
                            onChange={(e) => setMinTechnicians(Number(e.target.value))}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                            required
                            min="1"
                        />
                    </div>
                </div>
            )}

            {type !== 'SERVICE' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">Unit</label>
                        <select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                        >
                            <option value="" disabled>Select Unit</option>
                            <option value="ml">ml</option>
                            <option value="L">L</option>
                            <option value="Gallon">Gallon</option>
                            <option value="Block">Block</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Kg">Kg</option>
                            <option value="g">g</option>
                            <option value="oz">oz</option>
                            <option value="lb">lb</option>
                        </select>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-4">
                {type !== 'SERVICE' && (
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">Stock</label>
                        <input
                            type="number"
                            value={stock}
                            onChange={(e) => setStock(Number(e.target.value))}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                            required
                            min="0"
                        />
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Price ($)</label>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        required
                        min="0"
                        step="0.01"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Cost ($)</label>
                    <input
                        type="number"
                        value={cost}
                        onChange={(e) => setCost(Number(e.target.value))}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        required
                        min="0"
                        step="0.01"
                    />
                </div>
            </div>

            {type !== 'SERVICE' && (
                <>
                    <div className="pt-2">
                        <label className="block text-sm font-medium mb-1 text-foreground">Usage Description</label>
                        <textarea
                            value={usageDescription}
                            onChange={(e) => setUsageDescription(e.target.value)}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                            rows={2}
                            placeholder="How to use this product..."
                        />
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-medium mb-1 text-foreground">Active Ingredient</label>
                        <input
                            type="text"
                            value={activeIngredient}
                            onChange={(e) => setActiveIngredient(e.target.value)}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                            placeholder="e.g. Permethrin 5%"
                        />
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-medium mb-1 text-foreground">Recommended Concentration</label>
                        <input
                            type="text"
                            value={recommendedConcentration}
                            onChange={(e) => setRecommendedConcentration(e.target.value)}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                            placeholder="e.g. 1% - 3%"
                        />
                    </div>
                </>
            )}

            <div className="flex justify-end gap-2 pt-4">
                {product && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                        disabled={loading}
                    >
                        Delete
                    </button>
                )}
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
                    disabled={loading}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    disabled={loading}
                >
                    {loading ? "Saving..." : "Save"}
                </button>
            </div>
        </form>
    </Modal >
);
}
