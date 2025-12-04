"use client";

import { useState } from "react";
import { Property } from "@prisma/client";
import { PropertyDialog } from "./property-dialog";
import { Pencil } from "lucide-react";

interface PropertyListProps {
    properties: Property[];
    clientId: string;
}

export function PropertyList({ properties, clientId }: PropertyListProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

    const handleAdd = () => {
        setSelectedProperty(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (property: Property) => {
        setSelectedProperty(property);
        setIsDialogOpen(true);
    };

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Properties ({properties.length})</h2>
                <button
                    onClick={handleAdd}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    + Add Property
                </button>
            </div>
            <ul className="divide-y divide-gray-200">
                {properties.map((property) => (
                    <li key={property.id} className="hover:bg-gray-50 transition duration-150 ease-in-out">
                        <div className="px-6 py-4 flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium text-blue-600 truncate">{property.address}</p>
                                <p className="text-xs text-gray-500 mt-1">{property.type}</p>
                                {property.accessInfo && (
                                    <p className="text-xs text-gray-400 mt-1">Access: {property.accessInfo}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => handleEdit(property)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </li>
                ))}
                {properties.length === 0 && (
                    <li className="px-6 py-8 text-center text-gray-500 text-sm">
                        No properties found.
                    </li>
                )}
            </ul>

            <PropertyDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                property={selectedProperty}
                clientId={clientId}
            />
        </div>
    );
}
