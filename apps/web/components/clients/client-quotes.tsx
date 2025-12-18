"use client";

import { useState } from "react";
import { Quote, Product } from "@prisma/client";
import { createQuote, updateQuoteStatus, updateQuote } from "@/app/actions/client-portal-actions";
import { format } from "date-fns";
import { toast } from "sonner";
import { Trash2, Plus, FileText, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuoteForm } from "@/components/quotes/quote-form";

import { useDivision } from "@/components/providers/division-provider";
import { useEffect } from "react";

interface ClientQuotesProps {
    clientId: string;
    quotes: (Quote & { items: (any & { product: Product })[] })[];
    products: Product[];
}

export function ClientQuotes({ clientId, quotes, products }: ClientQuotesProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const { division } = useDivision();
    const [divisionFilter, setDivisionFilter] = useState<"ALL" | "EXTERMINATION" | "ENTREPRISES">(division);

    useEffect(() => {
        setDivisionFilter(division);
    }, [division]);

    const handleCreateNew = () => {
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

    const handleStatusChange = async (id: string, status: any) => {
        try {
            await updateQuoteStatus(id, clientId, status);
            toast.success("Status updated");
        } catch (error) {
            toast.error("Failed to update status");
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
                    clientId={clientId}
                    onSave={handleSave}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Quotes</h3>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-1.5">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={divisionFilter}
                            onChange={(e) => setDivisionFilter(e.target.value as any)}
                            className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer text-gray-900"
                        >
                            <option value="ALL">All Divisions</option>
                            <option value="EXTERMINATION">Extermination</option>
                            <option value="ENTREPRISES">Entreprises</option>
                        </select>
                    </div>
                    <Button onClick={handleCreateNew}>
                        + New Quote
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
                                        <p className="font-medium text-gray-900">
                                            {/* @ts-ignore */}
                                            {quote.number || (quote.poNumber ? `PO #${quote.poNumber}` : "Quote")}
                                        </p>
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
