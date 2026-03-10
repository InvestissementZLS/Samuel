"use client";

import { useState, useEffect, useMemo, memo } from "react";
import { Invoice, Product, Client } from "@prisma/client";
import { createInvoice, updateInvoice, deleteInvoice } from "@/app/actions/client-portal-actions";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    Trash2, DollarSign, RefreshCcw, Mail, Download,
    Search, ArrowUpDown, ChevronUp, ChevronDown, X, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const InvoiceForm = dynamic(() => import("@/components/invoices/invoice-form").then(mod => mod.InvoiceForm), {
    loading: () => <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg animate-pulse">Loading form...</div>
});

const PaymentDialog = dynamic(() => import("@/components/invoices/payment-dialog").then(mod => mod.PaymentDialog));

import { useDivision } from "@/components/providers/division-provider";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useLanguage } from "@/components/providers/language-provider";
import Link from "next/link";

type InvoiceWithDetails = Invoice & { items: (any & { product: Product })[], client: Client };
type SortKey = 'number' | 'client' | 'total' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'ALL' | 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID';

interface InvoiceListProps {
    invoices: InvoiceWithDetails[];
    products: Product[];
    clients?: Client[];
    clientId?: string;
    currentPage?: number;
    totalPages?: number;
    totalCount?: number;
}

const STATUS_STYLES: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-700',
    PARTIALLY_PAID: 'bg-orange-100 text-orange-700',
    OVERDUE: 'bg-red-100 text-red-600',
    SENT: 'bg-blue-100 text-blue-700',
    DRAFT: 'bg-gray-100 text-gray-600',
};

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
    if (!active) return <ArrowUpDown className="w-3 h-3 text-gray-300 ml-1" />;
    return dir === 'asc'
        ? <ChevronUp className="w-3 h-3 text-indigo-500 ml-1" />
        : <ChevronDown className="w-3 h-3 text-indigo-500 ml-1" />;
}

export function InvoiceList({ invoices, products, clientId, clients = [], currentPage = 1, totalPages = 1, totalCount }: InvoiceListProps) {
    const { t } = useLanguage();
    const { language } = useLanguage();
    const isFr = language === 'fr';
    const [isEditing, setIsEditing] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const { division } = useDivision();
    const [divisionFilter, setDivisionFilter] = useState<"ALL" | "EXTERMINATION" | "ENTREPRISES" | "RENOVATION">(division as any);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentModalType, setPaymentModalType] = useState<"PAYMENT" | "REFUND">("PAYMENT");
    const [paymentInvoice, setPaymentInvoice] = useState<any>(null);

    const { checkPermission } = useCurrentUser();

    const allDivisions = [
        { value: "EXTERMINATION", label: t.divisions.extermination },
        { value: "ENTREPRISES", label: t.divisions.entreprises },
        { value: "RENOVATION", label: t.divisions.renovation }
    ];
    const allowedDivisions = allDivisions.filter(d => checkPermission(d.value as any).hasDivisionAccess);

    useEffect(() => { setDivisionFilter(division as any); }, [division]);

    // Search & filter state
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const filtered = useMemo(() => {
        return invoices
            .filter(inv => {
                if (divisionFilter !== 'ALL' && (inv as any).division !== divisionFilter) return false;
                if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
                if (search.trim()) {
                    const s = search.toLowerCase();
                    return (
                        (inv.number || '').toLowerCase().includes(s) ||
                        inv.client?.name?.toLowerCase().includes(s) ||
                        inv.total.toString().includes(s)
                    );
                }
                return true;
            })
            .sort((a, b) => {
                let valA: any, valB: any;
                if (sortKey === 'total') { valA = a.total; valB = b.total; }
                else if (sortKey === 'client') { valA = a.client?.name || ''; valB = b.client?.name || ''; }
                else if (sortKey === 'status') { valA = a.status; valB = b.status; }
                else if (sortKey === 'number') { valA = a.number || ''; valB = b.number || ''; }
                else { valA = new Date(a.createdAt); valB = new Date(b.createdAt); }
                if (valA < valB) return sortDir === 'asc' ? -1 : 1;
                if (valA > valB) return sortDir === 'asc' ? 1 : -1;
                return 0;
            });
    }, [invoices, search, statusFilter, divisionFilter, sortKey, sortDir]);

    const handleSave = async (data: any) => {
        try {
            if (data.id) {
                await updateInvoice(data);
                toast.success(t.invoices.updated);
            } else {
                await createInvoice(data);
                toast.success(t.invoices.created);
            }
            setIsEditing(false);
        } catch {
            toast.error(t.invoices.failedSave);
        }
    };
    const quickFilters: { key: StatusFilter; label: string; color?: string }[] = [
        { key: 'ALL', label: isFr ? 'Toutes' : 'All' },
        { key: 'SENT', label: isFr ? 'Envoyées' : 'Sent' },
        { key: 'PAID', label: isFr ? 'Payées' : 'Paid' },
        { key: 'OVERDUE', label: isFr ? 'En retard' : 'Overdue' },
        { key: 'PARTIALLY_PAID', label: isFr ? 'Partielles' : 'Partial' },
        { key: 'DRAFT', label: isFr ? 'Brouillons' : 'Drafts' },
    ];

    // Summary metrics
    const totalUnpaid = useMemo(() => {
        return invoices
            .filter(i => i.status !== 'PAID' && (divisionFilter === 'ALL' || (i as any).division === divisionFilter))
            .reduce((sum, i) => sum + i.total - ((i as any).amountPaid || 0), 0);
    }, [invoices, divisionFilter]);

    // Memoize status counts to avoid triple-filtering the entire list on every render
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        quickFilters.forEach(f => {
            if (f.key === 'ALL') return;
            counts[f.key] = invoices.filter(i => i.status === f.key && (divisionFilter === 'ALL' || (i as any).division === divisionFilter)).length;
        });
        return counts;
    }, [invoices, divisionFilter]);

    if (isEditing) {
        return (
            <div>
                <Button variant="ghost" onClick={() => setIsEditing(false)} className="mb-4">
                    ← {t.invoices.backToInvoices}
                </Button>
                <InvoiceForm
                    invoice={selectedInvoice}
                    products={products}
                    clients={clients}
                    clientId={selectedInvoice?.clientId || clientId || ""}
                    onSave={handleSave}
                />
            </div>
        );
    }


    return (
        <div className="space-y-4">
            {/* Summary bar */}
            {!clientId && totalUnpaid > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    <DollarSign className="w-4 h-4 shrink-0" />
                    <span className="font-medium">
                        {isFr ? `${totalUnpaid.toFixed(2)}$ en attente de paiement` : `${totalUnpaid.toFixed(2)}$ outstanding`}
                    </span>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={isFr ? 'Rechercher par client, numéro…' : 'Search by client, number…'}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {!clientId && (
                        <select
                            value={divisionFilter}
                            onChange={e => setDivisionFilter(e.target.value as any)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                            {(checkPermission("ALL" as any).hasDivisionAccess || allowedDivisions.length > 1) && (
                                <option value="ALL">{isFr ? 'Toutes divisions' : 'All divisions'}</option>
                            )}
                            {allowedDivisions.map(d => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                        </select>
                    )}
                    <Button onClick={() => { setSelectedInvoice(null); setIsEditing(true); }}>
                        + {t.invoices.createInvoice}
                    </Button>
                </div>
            </div>

            {/* Quick status pills */}
            <div className="flex gap-1.5 flex-wrap">
                {quickFilters.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setStatusFilter(f.key)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === f.key
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        {f.label}
                        {f.key !== 'ALL' && (
                            <span className="ml-1 opacity-70">
                                ({statusCounts[f.key] || 0})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <p className="text-xs text-gray-400">
                {filtered.length} {isFr ? 'résultat' : 'result'}{filtered.length !== 1 ? 's' : ''}
            </p>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                {[
                                    { key: 'number' as SortKey, label: isFr ? 'Numéro' : 'Number' },
                                    { key: 'client' as SortKey, label: isFr ? 'Client' : 'Client' },
                                    { key: 'total' as SortKey, label: isFr ? 'Total' : 'Total' },
                                    { key: 'status' as SortKey, label: isFr ? 'Statut' : 'Status' },
                                    { key: 'createdAt' as SortKey, label: isFr ? 'Date' : 'Date' },
                                ].map(col => (
                                    <th
                                        key={col.key}
                                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort(col.key)}
                                    >
                                        <div className="flex items-center">
                                            {col.label}
                                            <SortIcon active={sortKey === col.key} dir={sortDir} />
                                        </div>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {isFr ? 'Solde dû' : 'Balance'}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {isFr ? 'Actions' : 'Actions'}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm italic">
                                        {search ? (isFr ? 'Aucun résultat.' : 'No results.') : t.invoices.noInvoices}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(invoice => (
                                    <InvoiceRow
                                        key={invoice.id}
                                        invoice={invoice}
                                        t={t}
                                        clientId={clientId}
                                        onEdit={() => { setSelectedInvoice(invoice); setIsEditing(true); }}
                                        onPay={() => { setPaymentInvoice(invoice); setPaymentModalType("PAYMENT"); setPaymentModalOpen(true); }}
                                        onRefund={() => { setPaymentInvoice(invoice); setPaymentModalType("REFUND"); setPaymentModalOpen(true); }}
                                        onDelete={async () => {
                                            if (confirm(t.invoices.deleteConfirm)) {
                                                const tid = toast.loading(t.invoices.deleting);
                                                try {
                                                    await deleteInvoice(invoice.id);
                                                    toast.success(t.invoices.deleted, { id: tid });
                                                } catch { toast.error(t.invoices.deleteError, { id: tid }); }
                                            }
                                        }}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {paymentInvoice && (
                <PaymentDialog
                    isOpen={paymentModalOpen}
                    onClose={() => { setPaymentModalOpen(false); setPaymentInvoice(null); }}
                    invoiceId={paymentInvoice.id}
                    total={paymentInvoice.total}
                    amountPaid={(paymentInvoice as any).amountPaid || 0}
                    type={paymentModalType}
                />
            )}

            {/* Pagination */}
            {!clientId && totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-gray-500">
                        {isFr
                            ? `Affichage de ${Math.min((currentPage - 1) * 50 + 1, totalCount || 0)}–${Math.min(currentPage * 50, totalCount || 0)} sur ${totalCount} factures`
                            : `Showing ${Math.min((currentPage - 1) * 50 + 1, totalCount || 0)}–${Math.min(currentPage * 50, totalCount || 0)} of ${totalCount} invoices`}
                    </p>
                    <div className="flex gap-2">
                        <a
                            href={`?page=${Math.max(1, currentPage - 1)}`}
                            className={`px-3 py-1.5 text-sm border rounded-md transition ${currentPage <= 1 ? 'text-gray-300 border-gray-200 cursor-not-allowed pointer-events-none' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                            ← {isFr ? 'Précédent' : 'Previous'}
                        </a>
                        <span className="px-3 py-1.5 text-sm text-gray-600">
                            {currentPage} / {totalPages}
                        </span>
                        <a
                            href={`?page=${Math.min(totalPages, currentPage + 1)}`}
                            className={`px-3 py-1.5 text-sm border rounded-md transition ${currentPage >= totalPages ? 'text-gray-300 border-gray-200 cursor-not-allowed pointer-events-none' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                            {isFr ? 'Suivant' : 'Next'} →
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

const InvoiceRow = memo(({ invoice, t, clientId, onEdit, onPay, onRefund, onDelete }: {
    invoice: any;
    t: any;
    clientId?: string;
    onEdit: () => void;
    onPay: () => void;
    onRefund: () => void;
    onDelete: () => void;
}) => {
    const balance = invoice.total - ((invoice as any).amountPaid || 0);
    const isPaid = invoice.status === 'PAID';

    return (
        <tr
            className={`hover:bg-gray-50/80 transition-colors ${invoice.status === 'PAID' ? 'bg-emerald-50/20' :
                invoice.status === 'OVERDUE' ? 'bg-red-50/20' : ''
                }`}
        >
            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                {invoice.number || `#${invoice.id.slice(0, 6)}`}
            </td>
            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                {!clientId ? (
                    <Link href={`/clients/${invoice.clientId}`} className="hover:text-indigo-600 hover:underline">
                        {invoice.client?.name || '—'}
                    </Link>
                ) : invoice.client?.name || '—'}
            </td>
            <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                {invoice.total.toFixed(2)}$
            </td>
            <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[invoice.status] || 'bg-gray-100 text-gray-600'}`}>
                    {(t.invoices.statuses as any)?.[invoice.status] || invoice.status}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                {format(new Date(invoice.createdAt), 'dd MMM yyyy')}
            </td>
            <td className="px-4 py-3 text-sm font-bold whitespace-nowrap text-right">
                {!isPaid && balance > 0 ? (
                    <span className="text-red-600">{balance.toFixed(2)}$</span>
                ) : (
                    <span className="text-emerald-600">—</span>
                )}
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={onEdit}>
                        {t.common.edit}
                    </Button>
                    <a
                        href={`/api/invoices/${invoice.id}/pdf`}
                        target="_blank"
                        className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="PDF"
                    >
                        <FileText className="w-4 h-4" />
                    </a>
                    <button
                        onClick={async () => {
                            const tid = toast.loading(t.invoices.sending);
                            try {
                                const { sendInvoice } = await import("@/app/actions/email-actions");
                                const r = await sendInvoice(invoice.id);
                                r.success ? toast.success(t.invoices.emailSent, { id: tid }) : toast.error(r.error || 'Error', { id: tid });
                            } catch { toast.error(t.invoices.emailError, { id: tid }); }
                        }}
                        className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title={t.invoices.sendEmail}
                    >
                        <Mail className="w-4 h-4" />
                    </button>
                    {!isPaid && (
                        <button
                            onClick={onPay}
                            className="p-1.5 rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title={t.invoices.pay}
                        >
                            <DollarSign className="w-4 h-4" />
                        </button>
                    )}
                    {(invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID') && (
                        <button
                            onClick={onRefund}
                            className="p-1.5 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                            title={t.invoices.refund}
                        >
                            <RefreshCcw className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        disabled={isPaid || ((invoice as any).amountPaid || 0) > 0}
                        onClick={onDelete}
                        className={`p-1.5 rounded transition-colors ${isPaid || ((invoice as any).amountPaid || 0) > 0 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                        title={t.invoices.deleteConfirm}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
});

InvoiceRow.displayName = "InvoiceRow";
