"use client";

import { useState, useMemo, memo } from "react";
import { Client } from "@prisma/client";
import { ClientDialog } from "./client-dialog";
import { ClientImportDialog } from "./client-import-dialog";
import { Plus, Pencil, MessageSquare, Link as LinkIcon, Loader2, UploadCloud } from "lucide-react";
import { createBookingLink } from "@/app/actions/booking-actions";
import { toast } from "sonner";

interface ClientListProps {
    clients: Client[];
    currentPage?: number;
    totalPages?: number;
    totalCount?: number;
}

import { useLanguage } from "@/components/providers/language-provider";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDivision } from "@/components/providers/division-provider";
import { useUser } from "@/components/providers/user-provider";

export function ClientList({ 
    clients,
    currentPage = 1,
    totalPages = 1,
    totalCount = 0
}: ClientListProps) {
    const { t } = useLanguage();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { division } = useDivision();
    const { user } = useUser();

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };


    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            // @ts-ignore
            const clientDivisions = client.divisions || ["EXTERMINATION"];
            return clientDivisions.includes(division);
        });
    }, [clients, division]);

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
            toast.success(t.clients.bookingLinkCopied);
        } catch (error) {
            toast.error(t.clients.generateLinkError);
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
                        toast.success(t.clients.newClientLinkCopied);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 mr-2"
                >
                    <LinkIcon className="h-4 w-4" />
                    {t.clients.newLeadLink}
                </button>
                <button
                    onClick={() => setIsImportOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 mr-2"
                >
                    <UploadCloud className="h-4 w-4" />
                    {t.clients.importCSV || "Import CSV"}
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
                                <ClientRow
                                    key={client.id}
                                    client={client}
                                    t={t}
                                    onEdit={(e) => handleEdit(e, client)}
                                    onGenerateLink={(e) => handleGenerateLink(e, client.id)}
                                    onClick={() => router.push(`/clients/${client.id}`)}
                                />
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-6 text-center text-gray-500">
                        {/* Note: keeping inline ternary for division names or use props if strict translation needed, but acceptable for now */}
                        <p>{t.clients.noClients} {t.clients.in} {division === "EXTERMINATION" ? "Extermination" : division === "RENOVATION" ? "Rénovation Esthéban" : "Entreprises"}.</p>
                        {clients.length > 0 && (
                            <p className="mt-2 text-sm">
                                {clients.length} {t.clients.hiddenClients}
                                <br />
                                {t.clients.switchDivision}
                            </p>
                        )}
                        <button
                            onClick={handleAdd}
                            className="mt-4 text-indigo-600 hover:text-indigo-500 font-medium"
                        >
                            {t.clients.createInDivision} {division === "EXTERMINATION" ? "Extermination" : division === "RENOVATION" ? "Rénovation Esthéban" : "Entreprises"}
                        </button>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow-sm">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            {t.common.previous || "Previous"}
                        </button>
                        <button
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            {t.common.next || "Next"}
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing <span className="font-medium">{(currentPage - 1) * 50 + 1}</span> to{' '}
                                <span className="font-medium">{Math.min(currentPage * 50, totalCount)}</span> of{' '}
                                <span className="font-medium">{totalCount}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Previous</span>
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => handlePageChange(i + 1)}
                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === i + 1
                                                ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Next</span>
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l4.5-4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}

            <ClientDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                client={selectedClient}
            />

            <ClientImportDialog
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={() => { router.refresh(); }}
            />
        </div>
    );
}

const ClientRow = memo(({ client, t, onEdit, onGenerateLink, onClick }: { client: Client; t: any; onEdit: (e: React.MouseEvent) => void; onGenerateLink: (e: React.MouseEvent) => void; onClick: () => void }) => (
    <tr
        className="hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={onClick}
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
                onClick={onGenerateLink}
                className="text-blue-600 hover:text-blue-900 z-10 relative mr-2"
                title={t.clients.copyLink}
            >
                <LinkIcon className="h-4 w-4" />
            </button>
            <button
                onClick={onEdit}
                className="text-indigo-600 hover:text-indigo-900 z-10 relative"
            >
                <Pencil className="h-4 w-4" />
            </button>
        </td>
    </tr>
));

ClientRow.displayName = "ClientRow";
