"use client";

import { useState } from "react";
import { Client } from "@prisma/client";
import { ClientDialog } from "./client-dialog";
import { Plus, Pencil, MessageSquare, Link as LinkIcon, Loader2 } from "lucide-react";
import { createBookingLink } from "@/app/actions/booking-actions";
import { toast } from "sonner";

interface ClientListProps {
    clients: Client[];
}

import { useLanguage } from "@/components/providers/language-provider";
import { useRouter } from "next/navigation";
import { useDivision } from "@/components/providers/division-provider";

export function ClientList({ clients }: ClientListProps) {
    const { t } = useLanguage();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const router = useRouter();
    const { division } = useDivision();

    const filteredClients = clients.filter(client => {
        // @ts-ignore
        const clientDivisions = client.divisions || ["EXTERMINATION"];
        return clientDivisions.includes(division);
    });

    const handleAdd = () => {
        setSelectedClient(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (e: React.MouseEvent, client: Client) => {
        e.stopPropagation(); // Prevent row click
        setSelectedClient(client);
        setIsDialogOpen(true);
    };

    const handleGenerateLink = async (e: React.MouseEvent, clientId: string) => {
        e.stopPropagation();
        try {
            const token = await createBookingLink(clientId);
            const url = `${window.location.origin}/booking/${token}`;
            await navigator.clipboard.writeText(url);
            toast.success("Booking Link Copied!");
        } catch (error) {
            toast.error("Failed to generate link");
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">{t.clients.title} ({filteredClients.length})</h1>
                <button
                    onClick={() => {
                        const url = `${window.location.origin}/booking/new`;
                        navigator.clipboard.writeText(url);
                        toast.success("New Client Link Copied!");
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 mr-2"
                >
                    <LinkIcon className="h-4 w-4" />
                    New Lead Link
                </button>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                    <Plus className="h-4 w-4" />
                    {t.clients.addClient}
                </button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border">
                {filteredClients.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t.clients.name}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t.clients.email}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t.clients.phone}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t.clients.address}
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Edit</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredClients.map((client) => (
                                <tr
                                    key={client.id}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => router.push(`/clients/${client.id}`)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{client.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{client.email || "-"}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`tel:${client.phone}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-sm text-gray-900 hover:text-blue-600 hover:underline"
                                            >
                                                {client.phone || "-"}
                                            </a>
                                            {client.phone && (
                                                <a
                                                    href={`sms:${client.phone}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-gray-400 hover:text-green-600 p-1 rounded-full hover:bg-green-50"
                                                    title="Send SMS"
                                                >
                                                    <MessageSquare size={16} />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 truncate max-w-xs">{client.billingAddress || "-"}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={(e) => handleGenerateLink(e, client.id)}
                                            className="text-blue-600 hover:text-blue-900 z-10 relative mr-2"
                                            title="Copy Booking Link"
                                        >
                                            <LinkIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => handleEdit(e, client)}
                                            className="text-indigo-600 hover:text-indigo-900 z-10 relative"
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
                        <p>{t.clients.noClients} in {division === "EXTERMINATION" ? "Extermination" : "Entreprises"}.</p>
                        {clients.length > 0 && (
                            <p className="mt-2 text-sm">
                                {clients.length} clients are hidden because they belong to other divisions.
                                Switch divisions to view them.
                            </p>
                        )}
                        <button
                            onClick={handleAdd}
                            className="mt-4 text-indigo-600 hover:text-indigo-500 font-medium"
                        >
                            Create new client in {division === "EXTERMINATION" ? "Extermination" : "Entreprises"}
                        </button>
                    </div>
                )}
            </div>

            <ClientDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                client={selectedClient}
            />
        </div>
    );
}
