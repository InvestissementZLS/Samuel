"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { createProduct, updateProduct, deleteProduct } from "@/app/actions/product-actions";
import { Product } from "@prisma/client";

interface ProductDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product?: Product | null;
}

export function ProductDialog({ isOpen, onClose, product }: ProductDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [unit, setUnit] = useState("");
    const [stock, setStock] = useState(0);
    const [price, setPrice] = useState(0);
    const [cost, setCost] = useState(0);
    const [division, setDivision] = useState<"EXTERMINATION" | "ENTREPRISES">("EXTERMINATION");
    const [type, setType] = useState<"CONSUMABLE" | "EQUIPMENT">("CONSUMABLE");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (product) {
                setName(product.name);
                setDescription(product.description || "");
                setUnit(product.unit);
                setStock(product.stock);
                setPrice(product.price);
                // @ts-ignore
                setCost(product.cost || 0);
                // @ts-ignore
                setDivision(product.division || "EXTERMINATION");
                // @ts-ignore
                setType(product.type || "CONSUMABLE");
            } else {
                setName("");
                setDescription("");
                setUnit("");
                setStock(0);
                setPrice(0);
                setCost(0);
                setDivision("EXTERMINATION");
                setType("CONSUMABLE");
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
                    stock: Number(stock),
                    price: Number(price),
                    cost: Number(cost),
                    division,
                    type,
                });
                toast.success("Product updated successfully");
            } else {
                await createProduct({
                    name,
                    description,
                    unit,
                    stock: Number(stock),
                    price: Number(price),
                    cost: Number(cost),
                    division,
                    type,
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
                        <label className="block text-sm font-medium mb-1">Division</label>
                        <select
                            value={division}
                            onChange={(e) => setDivision(e.target.value as "EXTERMINATION" | "ENTREPRISES")}
                            className="w-full rounded-md border p-2 bg-background"
                        >
                            <option value="EXTERMINATION">Extermination ZLS</option>
                            <option value="ENTREPRISES">Les Entreprises ZLS</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as "CONSUMABLE" | "EQUIPMENT")}
                            className="w-full rounded-md border p-2 bg-background"
                        >
                            <option value="CONSUMABLE">Consumable</option>
                            <option value="EQUIPMENT">Equipment (Tools/Machines)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Product Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background"
                        rows={3}
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Unit</label>
                        <input
                            type="text"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="w-full rounded-md border p-2 bg-background"
                            required
                            placeholder="e.g. pcs"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Stock</label>
                        <input
                            type="number"
                            value={stock}
                            onChange={(e) => setStock(Number(e.target.value))}
                            className="w-full rounded-md border p-2 bg-background"
                            required
                            min="0"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Price ($)</label>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(Number(e.target.value))}
                            className="w-full rounded-md border p-2 bg-background"
                            required
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Cost ($)</label>
                        <input
                            type="number"
                            value={cost}
                            onChange={(e) => setCost(Number(e.target.value))}
                            className="w-full rounded-md border p-2 bg-background"
                            required
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>

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
        </Modal>
    );
}
