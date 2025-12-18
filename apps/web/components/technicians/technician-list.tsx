"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import { TechnicianDialog } from "./technician-dialog";
import { Plus, Pencil } from "lucide-react";

interface TechnicianListProps {
    technicians: User[];
}

export function TechnicianList({ technicians }: TechnicianListProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedTechnician, setSelectedTechnician] = useState<User | null>(null);

    const handleAdd = () => {
        setSelectedTechnician(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (tech: User) => {
        setSelectedTechnician(tech);
        setIsDialogOpen(true);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Technicians</h1>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                    <Plus className="h-4 w-4" />
                    Add Technician
                </button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border">
                {technicians.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Edit</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {technicians.map((tech) => (
                                <tr key={tech.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{tech.name || "N/A"}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{tech.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(tech)}
                                            className="text-indigo-600 hover:text-indigo-900"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-6 text-center text-gray-500">
                        No technicians found. Click "Add Technician" to create one.
                    </div>
                )}
            </div>

            <TechnicianDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                technician={selectedTechnician}
            />
        </div>
    );
}
