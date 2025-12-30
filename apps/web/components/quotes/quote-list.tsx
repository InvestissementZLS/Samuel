"use client";

import { useState, useEffect } from "react";
import { Quote, Product, Client } from "@prisma/client";
import { createQuote, updateQuoteStatus, updateQuote } from "@/app/actions/client-portal-actions";
import { format } from "date-fns";
import { toast } from "sonner";
import { FileText, Filter, Link as LinkIcon, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuoteForm } from "@/components/quotes/quote-form";
import { useDivision } from "@/components/providers/division-provider";
import { useLanguage } from "@/components/providers/language-provider";
import Link from "next/link";

interface QuoteListProps {
    quotes: (Quote & { items: (any & { product: Product })[], client: Client })[];
    products: Product[];
    clients?: Client[];
    clientId?: string;
}

export function QuoteList({ quotes, products, clientId, clients = [] }: QuoteListProps) {
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const { division } = useDivision();
    const [divisionFilter, setDivisionFilter] = useState<"ALL" | "EXTERMINATION" | "ENTREPRISES">(division);

    useEffect(() => {
        setDivisionFilter(division);
    }, [division]);

    const handleCreateNew = () => {
        // Allow creation without clientId now
        setSelectedQuote(null);
        setIsEditing(true);
    };

    const handleEdit = (quote: any) => {
        setSelectedQuote(quote);
        setIsEditing(true);
    };

    const handleSave = async (data: any) => {
        try {
            if (data.id) {
                await updateQuote(data);
                toast.success("Quote updated");
            } else {
                await createQuote(data);
                toast.success("Quote created");
            }
            setIsEditing(false);
        } catch (error) {
            toast.error("Failed to save quote");
            console.error(error);
        }
    };

    const filteredQuotes = quotes.filter(quote => {
        if (divisionFilter === "ALL") return true;
        // @ts-ignore
        return quote.division === divisionFilter;
    });

    if (isEditing) {
        return (
            <div>
                <Button variant="ghost" onClick={() => setIsEditing(false)} className="mb-4">
                    &larr; Back to Quotes
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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">{t.quotes.title}</h3>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-1.5">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={divisionFilter}
                            onChange={(e) => setDivisionFilter(e.target.value as any)}
                            className="border-none text-sm focus:ring-0 cursor-pointer text-gray-900 bg-white"
                        >
                            <option value="ALL">All Divisions</option>
                            <option value="EXTERMINATION">Extermination</option>
                            <option value="ENTREPRISES">Entreprises</option>
                        </select>
                    </div>

                    <Button onClick={handleCreateNew}>
                        + {t.quotes.createQuote}
                    </Button>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <div className="divide-y divide-gray-200">
                    {filteredQuotes.map((quote) => (
                        <div key={quote.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-indigo-50 rounded text-indigo-600">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900">
                                                {/* @ts-ignore */}
                                                {quote.number || (quote.poNumber ? `PO #${quote.poNumber}` : "Quote")}
                                            </p>
                                            {!clientId && (
                                                <Link href={`/clients/${quote.clientId}`} className="text-xs text-indigo-600 hover:underline">
                                                    ({quote.client.name})
                                                </Link>
                                            )}
                                        </div>
                                        <div className="flex gap-2 text-sm text-gray-500">
                                            <span>{format(new Date(quote.createdAt), "MMM d, yyyy")}</span>
                                            <span>•</span>
                                            <span>${quote.total.toFixed(2)}</span>
                                            {/* @ts-ignore */}
                                            {quote.division && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-xs uppercase tracking-wider font-semibold">
                                                        {/* @ts-ignore */}
                                                        {quote.division === "EXTERMINATION" ? "EXO" : "ENT"}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                const url = `${window.location.origin}/portal/quotes/${quote.id}`;
                                                navigator.clipboard.writeText(url);
                                                toast.success("Portal link copied to clipboard");
                                            }}
                                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1 hover:underline"
                                        >
                                            <LinkIcon className="w-3 h-3" />
                                            Copy Link
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                        ${quote.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                            quote.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                quote.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                        {quote.status}
                                    </span>
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(quote)}>
                                        Edit
                                    </Button>
                                    <div className="flex gap-1">
                                        <a
                                            href={`/api/quotes/${quote.id}/pdf`}
                                            target="_blank"
                                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                                        >
                                            PDF
                                        </a>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={async () => {
                                                const toastId = toast.loading("Sending email...");
                                                try {
                                                    const { sendQuote } = await import("@/app/actions/email-actions");
                                                    const result = await sendQuote(quote.id);
                                                    if (result.success) {
                                                        toast.success("Email sent!", { id: toastId });
                                                    } else {
                                                        toast.error("Failed to send email: " + (result.error || "Unknown error"), { id: toastId });
                                                    }
                                                } catch (error) {
                                                    toast.error("Error sending email", { id: toastId });
                                                }
                                            }}
                                        >
                                            Email
                                        </Button>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={async () => {
                                            if (confirm("Create a job from this quote?")) {
                                                const { convertQuoteToJob } = await import("@/app/actions/workflow-actions");
                                                await convertQuoteToJob(quote.id);
                                            }
                                        }}
                                    >
                                        Convert to Job
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredQuotes.length === 0 && (
                        <div className="p-8 text-center text-gray-500 italic">
                            No quotes found for this selection.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
