"use client";

import { useState, useEffect, useMemo, memo } from "react";
import { Quote, Product, Client } from "@prisma/client";
import { createQuote, updateQuoteStatus, updateQuote } from "@/app/actions/client-portal-actions";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    FileText, Link as LinkIcon, Download, Mail,
    Search, SlidersHorizontal, ArrowUpDown, ChevronUp, ChevronDown, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const QuoteForm = dynamic(() => import("@/components/quotes/quote-form").then(mod => mod.QuoteForm), {
    loading: () => <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg animate-pulse">Loading form...</div>
});

import { useDivision } from "@/components/providers/division-provider";
import { useLanguage } from "@/components/providers/language-provider";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type QuoteWithDetails = Quote & { items: (any & { product: Product })[], client: Client };
type SortKey = 'number' | 'client' | 'total' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'ALL' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'DRAFT';

interface QuoteListProps {
    quotes: QuoteWithDetails[];
    products: Product[];
    clients?: Client[];
    clientId?: string;
    currentPage?: number;
    totalPages?: number;
    totalCount?: number;
}

const STATUS_STYLES: Record<string, string> = {
    ACCEPTED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-600',
    SENT: 'bg-blue-100 text-blue-700',
    DRAFT: 'bg-gray-100 text-gray-600',
};

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
    if (!active) return <ArrowUpDown className="w-3 h-3 text-gray-300 ml-1" />;
    return dir === 'asc'
        ? <ChevronUp className="w-3 h-3 text-indigo-500 ml-1" />
        : <ChevronDown className="w-3 h-3 text-indigo-500 ml-1" />;
}

export function QuoteList({ 
    quotes, 
    products, 
    clientId, 
    clients = [],
    currentPage = 1,
    totalPages = 1,
    totalCount = 0
}: QuoteListProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { language } = useLanguage();
    const isFr = language === 'fr';
    const [isEditing, setIsEditing] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const { division } = useDivision();

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    // Search & filter state
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [divisionFilter, setDivisionFilter] = useState<"ALL" | "EXTERMINATION" | "ENTREPRISES">(division as any);
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    useEffect(() => {
        const qId = searchParams.get('quoteId');
        if (qId) {
            const q = quotes.find(item => item.id === qId);
            if (q) {
                setSelectedQuote(q);
                setIsEditing(true);
            }
        }
    }, [searchParams, quotes]);

    useEffect(() => { setDivisionFilter(division as any); }, [division]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const filtered = useMemo(() => {
        return quotes
            .filter(q => {
                if (divisionFilter !== 'ALL' && (q as any).division !== divisionFilter) return false;
                if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
                if (search.trim()) {
                    const s = search.toLowerCase();
                    return (
                        (q.number || '').toLowerCase().includes(s) ||
                        q.client?.name?.toLowerCase().includes(s) ||
                        q.total.toString().includes(s)
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
    }, [quotes, search, statusFilter, divisionFilter, sortKey, sortDir]);

    const handleSave = async (data: any) => {
        try {
            if (data.id) {
                await updateQuote(data);
                toast.success(t.quotes.updated);
            } else {
                await createQuote(data);
                toast.success(t.quotes.created);
            }
            setIsEditing(false);
        } catch {
            toast.error(t.quotes.failedSave);
        }
    };

    const quickFilters: { key: StatusFilter; label: string }[] = [
        { key: 'ALL', label: isFr ? 'Tous' : 'All' },
        { key: 'SENT', label: isFr ? 'Envoyées' : 'Sent' },
        { key: 'ACCEPTED', label: isFr ? 'Acceptés' : 'Accepted' },
        { key: 'REJECTED', label: isFr ? 'Refusés' : 'Rejected' },
        { key: 'DRAFT', label: isFr ? 'Brouillons' : 'Drafts' },
    ];

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        quickFilters.forEach(f => {
            if (f.key === 'ALL') return;
            counts[f.key] = quotes.filter(q => q.status === f.key && (divisionFilter === 'ALL' || (q as any).division === divisionFilter)).length;
        });
        return counts;
    }, [quotes, divisionFilter]);

    if (isEditing) {
        return (
            <div>
                <Button variant="ghost" onClick={() => setIsEditing(false)} className="mb-4">
                    ← {t.quotes.backToQuotes}
                </Button>
                <QuoteForm
                    quote={selectedQuote}
                    products={products}
                    clients={clients}
                    clientId={selectedQuote?.clientId || clientId || ""}
                    onSave={handleSave}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Search */}
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
                    {/* Division filter */}
                    {!clientId && (
                        <select
                            value={divisionFilter}
                            onChange={e => setDivisionFilter(e.target.value as any)}
                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                            <option value="ALL">{isFr ? 'Toutes divisions' : 'All divisions'}</option>
                            <option value="EXTERMINATION">Extermination ZLS</option>
                            <option value="ENTREPRISES">Les Entreprises ZLS</option>
                        </select>
                    )}

                    <Button onClick={() => { setSelectedQuote(null); setIsEditing(true); }}>
                        + {t.quotes.createQuote}
                    </Button>
                </div>
            </div>

            {/* Quick status filters */}
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

            {/* Result count */}
            <p className="text-xs text-gray-400">
                {filtered.length} {isFr ? 'résultat' : 'result'}{filtered.length !== 1 ? 's' : ''}
            </p>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        {/* ... table content remains same ... */}
                        <thead className="bg-gray-50">
                            <tr>
                                {[
                                    { key: 'number' as SortKey, label: isFr ? 'Numéro' : 'Number' },
                                    { key: 'client' as SortKey, label: isFr ? 'Client' : 'Client' },
                                    { key: 'total' as SortKey, label: isFr ? 'Montant' : 'Amount' },
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
                                    {isFr ? 'Actions' : 'Actions'}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm italic">
                                        {search ? (isFr ? 'Aucun résultat pour cette recherche.' : 'No results for this search.') : t.quotes.noQuotes}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(quote => (
                                    <QuoteRow
                                        key={quote.id}
                                        quote={quote}
                                        t={t}
                                        clientId={clientId}
                                        onEdit={() => { setSelectedQuote(quote); setIsEditing(true); }}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination UI */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-4 py-3">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <Button
                                variant="outline"
                                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                            >
                                {isFr ? 'Précédent' : 'Previous'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                            >
                                {isFr ? 'Suivant' : 'Next'}
                            </Button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-500">
                                    {isFr ? 'Affichage de' : 'Showing'}{' '}
                                    <span className="font-medium">{(currentPage - 1) * 50 + 1}</span>{' '}
                                    {isFr ? 'à' : 'to'}{' '}
                                    <span className="font-medium">{Math.min(currentPage * 50, totalCount)}</span>{' '}
                                    {isFr ? 'sur' : 'of'}{' '}
                                    <span className="font-medium">{totalCount}</span>{' '}
                                    {isFr ? 'résultats' : 'results'}
                                </p>
                            </div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm bg-white" aria-label="Pagination">
                                <button
                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <ChevronUp className="h-4 w-4 -rotate-90" />
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => handlePageChange(i + 1)}
                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                            currentPage === i + 1
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
                                    <ChevronUp className="h-4 w-4 rotate-90" />
                                </button>
                            </nav>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const QuoteRow = memo(({ quote, t, clientId, onEdit }: { quote: QuoteWithDetails; t: any; clientId?: string; onEdit: () => void }) => {
    const STATUS_STYLES: Record<string, string> = {
        ACCEPTED: 'bg-emerald-100 text-emerald-700',
        REJECTED: 'bg-red-100 text-red-600',
        SENT: 'bg-blue-100 text-blue-700',
        DRAFT: 'bg-gray-100 text-gray-600',
    };

    return (
        <tr
            className={`hover:bg-gray-50/80 transition-colors ${quote.status === 'ACCEPTED' ? 'bg-emerald-50/30' :
                quote.status === 'REJECTED' ? 'bg-red-50/20' : ''
                }`}
        >
            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                <Link href={`/quotes/${quote.id}`} className="hover:text-indigo-600 hover:underline">
                    {quote.number || `#${quote.id.slice(0, 6)}`}
                </Link>
            </td>
            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                {!clientId ? (
                    <Link href={`/clients/${quote.clientId}`} className="hover:text-indigo-600 hover:underline">
                        {quote.client?.name || '—'}
                    </Link>
                ) : (
                    quote.client?.name || '—'
                )}
            </td>
            <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                {quote.total.toFixed(2)}$
            </td>
            <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[quote.status] || 'bg-gray-100 text-gray-600'}`}>
                    {t.quotes.statuses?.[quote.status as keyof typeof t.quotes.statuses] || quote.status}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                {format(new Date(quote.createdAt), 'dd MMM yyyy')}
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1.5">
                    <Button variant="ghost" size="sm" onClick={onEdit}>
                        {t.common.edit}
                    </Button>
                    <a
                        href={`/api/quotes/${quote.id}/pdf`}
                        target="_blank"
                        className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="PDF"
                    >
                        <Download className="w-4 h-4" />
                    </a>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/portal/quotes/${quote.id}`);
                            toast.success(t.quotes.linkCopied);
                        }}
                        className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title={t.quotes.copyLink}
                    >
                        <LinkIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={async () => {
                            const tid = toast.loading(t.invoices.sending);
                            try {
                                const { sendQuote } = await import("@/app/actions/email-actions");
                                const r = await sendQuote(quote.id);
                                r.success
                                    ? toast.success(t.invoices.emailSent, { id: tid })
                                    : toast.error((r.error || 'Error'), { id: tid });
                            } catch {
                                toast.error(t.invoices.emailError, { id: tid });
                            }
                        }}
                        className="p-1.5 rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title={t.common.email}
                    >
                        <Mail className="w-4 h-4" />
                    </button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                            if (confirm(t.quotes.convertConfirm)) {
                                const { convertQuoteToJob } = await import("@/app/actions/workflow-actions");
                                await convertQuoteToJob(quote.id);
                            }
                        }}
                    >
                        {t.quotes.convertToJob}
                    </Button>
                </div>
            </td>
        </tr>
    );
});

QuoteRow.displayName = "QuoteRow";
