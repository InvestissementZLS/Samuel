"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { createProperty, updateProperty, deleteProperty } from "@/app/actions/property-actions";
import { Property, PropertyType } from "@prisma/client";

interface PropertyDialogProps {
    isOpen: boolean;
    onClose: () => void;
    property?: Property | null;
    clientId: string;
}

export function PropertyDialog({ isOpen, onClose, property, clientId }: PropertyDialogProps) {
    const [address, setAddress] = useState("");
    const [type, setType] = useState<PropertyType>("RESIDENTIAL");
    const [accessInfo, setAccessInfo] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (property) {
                setAddress(property.address);
                setType(property.type);
                setAccessInfo(property.accessInfo || "");
            } else {
                setAddress("");
                setType("RESIDENTIAL");
                setAccessInfo("");
            }
        }
    }, [isOpen, property]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (property) {
                await updateProperty(property.id, { address, type, accessInfo });
                toast.success("Property updated successfully");
            } else {
                await createProperty({ clientId, address, type, accessInfo });
                toast.success("Property created successfully");
            }
            onClose();
        } catch (error) {
            console.error("Failed to save property:", error);
            toast.error("Failed to save property");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!property || !confirm("Are you sure you want to delete this property?")) return;
        setLoading(true);
        try {
            await deleteProperty(property.id);
            toast.success("Property deleted successfully");
            onClose();
        } catch (error) {
            console.error("Failed to delete property:", error);
            toast.error("Failed to delete property (May have associated jobs)");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={property ? "Edit Property" : "New Property"}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Address</label>
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Type</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as PropertyType)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                    >
                        <option value="RESIDENTIAL">Residential</option>
                        <option value="COMMERCIAL">Commercial</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Access Info</label>
                    <textarea
                        value={accessInfo}
                        onChange={(e) => setAccessInfo(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        rows={3}
                        placeholder="Gate codes, key location, etc."
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    {property && (
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
