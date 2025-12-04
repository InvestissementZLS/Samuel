"use client";

import { useState } from "react";
import { Product, UsedProduct, TreatmentLocation, TargetPest, ApplicationMethod } from "@prisma/client";
import { addProductUsed, removeProductUsed } from "@/app/actions/job-details-actions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { MaterialUsageDialog } from "./material-usage-dialog";

type UsedProductWithDetails = UsedProduct & {
    product: Product;
    locations: TreatmentLocation[];
    pests: TargetPest[];
    methods: ApplicationMethod[];
};

interface JobProductsProps {
    jobId: string;
    usedProducts: UsedProductWithDetails[];
    availableProducts: Product[];
}

export function JobProducts({ jobId, usedProducts, availableProducts }: JobProductsProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleRemove = async (id: string) => {
        if (!confirm("Remove this product?")) return;
        try {
            await removeProductUsed(id, jobId);
            toast.success("Product removed");
        } catch (error) {
            console.error("Failed to remove product:", error);
            toast.error("Failed to remove product");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Products Used</h3>
                <button
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                    Add Material Usage
                </button>
            </div>

            <MaterialUsageDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                jobId={jobId}
            />

            <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {usedProducts.map((item) => (
                            <tr key={item.id}>
                                <td className="px-4 py-2 text-sm text-gray-900 align-top font-medium">
                                    {item.product.name}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-500 align-top space-y-1">
                                    {item.locations.length > 0 && (
                                        <div className="flex gap-1 flex-wrap">
                                            <span className="text-xs font-semibold text-gray-700">Loc:</span>
                                            {item.locations.map(l => (
                                                <span key={l.id} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{l.name}</span>
                                            ))}
                                        </div>
                                    )}
                                    {item.pests.length > 0 && (
                                        <div className="flex gap-1 flex-wrap">
                                            <span className="text-xs font-semibold text-gray-700">Pest:</span>
                                            {item.pests.map(p => (
                                                <span key={p.id} className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded">{p.name}</span>
                                            ))}
                                        </div>
                                    )}
                                    {item.methods.length > 0 && (
                                        <div className="flex gap-1 flex-wrap">
                                            <span className="text-xs font-semibold text-gray-700">Method:</span>
                                            {item.methods.map(m => (
                                                <span key={m.id} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{m.name}</span>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-500 align-top">
                                    {item.quantity} {item.product.unit}
                                </td>
                                <td className="px-4 py-2 text-right align-top">
                                    <button
                                        onClick={() => handleRemove(item.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {usedProducts.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500 italic">
                                    No products used yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
