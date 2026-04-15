"use client";

import { useDivision } from "@/components/providers/division-provider";
import { useUser } from "@/components/providers/user-provider";

import { useState, useEffect } from "react";
import { getWarrantyTemplates } from "@/app/actions/warranty-actions";
import { createQuickService } from "@/app/actions/product-actions";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/language-provider";
import { Quote, Product, QuoteItem, Client } from "@prisma/client";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, MoreHorizontal, FileText, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import { ClientDialog } from "@/components/clients/client-dialog";
import { ConstructionCalculator } from "./construction-calculator";

interface QuoteFormProps {
    quote?: Quote & { items: (QuoteItem & { product: Product })[] };
    products: Product[];
    clients?: Client[];
    clientId: string;
    prefilledClient?: any;
    onSave: (data: any) => Promise<void>;
}

export function QuoteForm({ quote, products, clientId, onSave, clients = [], prefilledClient }: QuoteFormProps) {
    const [loading, setLoading] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState(clientId || quote?.clientId || "");
    const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

    // Form State
    const [poNumber, setPoNumber] = useState(quote?.poNumber || "");
    const [issuedDate, setIssuedDate] = useState<Date>(quote?.issuedDate ? new Date(quote.issuedDate) : new Date());
    const [dueDate, setDueDate] = useState<Date | undefined>(quote?.dueDate ? new Date(quote.dueDate) : undefined);
    const { division: globalDivision } = useDivision();
    const { user } = useUser();
    const { t } = useLanguage();
    const [division, setDivision] = useState<"EXTERMINATION" | "ENTREPRISES" | "RENOVATION">((quote?.division as "EXTERMINATION" | "ENTREPRISES" | "RENOVATION") || globalDivision);

    const [templates, setTemplates] = useState<{id: string, name: string, text: string}[]>([]);
    const [localProducts, setLocalProducts] = useState(products);
    const [quickServiceIndex, setQuickServiceIndex] = useState<number | null>(null);
    const [quickServiceName, setQuickServiceName] = useState("");

    useEffect(() => {
        getWarrantyTemplates().then(setTemplates).catch(console.error);
    }, []);

    const handleCreateQuickService = async () => {
        if (quickServiceIndex === null) return;
        const name = quickServiceName;
        if (!name?.trim()) {
            toast.error("Veuillez entrer un nom valide");
            return;
        }
        try {
            const newProduct = await createQuickService(name.trim());
            const updatedProducts = [...localProducts, newProduct];
            // @ts-ignore
            setLocalProducts(updatedProducts);
            handleItemChange(quickServiceIndex, 'productId', newProduct.id);
            toast.success("Service créé !");
            setQuickServiceIndex(null);
            setQuickServiceName("");
        } catch (e) {
            toast.error("Erreur lors de la création");
        }
    };

    const TemplateSelector = ({ onSelect, label, side = "bottom" }: { onSelect: (text: string) => void, label?: React.ReactNode, side?: "bottom" | "top" | "right" | "left" }) => (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-0">{label || t?.common?.insert || "Insert"}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 shadow-lg" side={side}>
                <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700">{(t?.settings as any)?.warrantiesTitle || "Templates"}</div>
                <div className="max-h-60 overflow-y-auto">
                    {templates.length === 0 ? <div className="p-4 text-xs text-center text-gray-500">No templates found</div> : templates.map(temp => (
                        <button
                            key={temp.id}
                            type="button"
                            onClick={() => onSelect(temp.text)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-0 hover:text-indigo-600 transition-colors"
                        >
                            <div className="font-medium text-gray-900">{temp.name}</div>
                            <div className="text-xs text-gray-500 line-clamp-2 mt-0.5 whitespace-pre-wrap">{temp.text}</div>
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );

    const [items, setItems] = useState<any[]>(quote?.items.map(item => ({
        id: item.id,
        productId: item.productId,
        description: item.description || item.product.name,
        quantity: item.quantity,
        price: item.price,
        cost: item.unitCost || 0,
        tax: item.taxRate || 0,
        product: item.product,
        // @ts-ignore
        isUpsell: item.isUpsell || false
    })) || []);

    const [discount, setDiscount] = useState(quote?.discount || 0);
    const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
    const [taxRate, setTaxRate] = useState(quote?.tax || 0);
    const [isQuebecTax, setIsQuebecTax] = useState(Math.abs((quote?.tax || 0) - 14.975) < 0.01);

    const [notes, setNotes] = useState(quote?.notes || "");
    const [terms, setTerms] = useState(quote?.terms || "");

    // Calculations — force Number() to prevent Decimal/string concatenation bugs
    const subtotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
    const discountAmount = discountType === 'percent' ? subtotal * (discount / 100) : discount;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = taxableAmount + taxAmount;

    const handleAddItem = () => {
        setItems([...items, {
            id: `temp-${Date.now()}`,
            productId: "",
            description: "",
            quantity: 1,
            price: 0,
            cost: 0,
            tax: 0,
            product: null,
            isUpsell: false
        }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === 'productId') {
            const product = localProducts.find(p => p.id === value);
            if (product) {
                newItems[index].product = product;
                newItems[index].description = (product as any).description || product.name;
                newItems[index].price = Number(product.price) || 0;
                newItems[index].cost = Number(product.cost) || 0;
            }
        }

        setItems(newItems);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave({
                id: quote?.id,
                clientId: selectedClientId,
                poNumber,
                issuedDate,
                dueDate,
                division,
                items: items
                    .filter(item => item.productId || item.description?.trim())
                    .map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    description: item.description,
                    unitCost: item.cost,
                    taxRate: item.tax,
                    isUpsell: item.isUpsell
                })),
                discount: discountAmount,
                tax: taxRate,
                notes,
                terms,
                total
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const productOptions = [...localProducts]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(p => ({ value: p.id, label: p.name }));

    const clientOptions = clients
        .filter(c => {
            // @ts-ignore
            const divisions = c.divisions || ["EXTERMINATION"];
            return divisions.includes(division);
        })
        .map(c => ({ value: c.id, label: c.name }));
    const selectedClient = prefilledClient ||
        clients.find(c => c.id === selectedClientId) ||
        (quote as any)?.client;

    return (
        <div className="bg-white text-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 max-w-5xl mx-auto font-sans">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <h1 className="text-xl font-semibold text-gray-800">
                        {quote ? "Edit Quote" : "New Quote"}
                    </h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
                        Preview
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                        {loading ? "Saving..." : "Save Quote"}
                    </Button>
                </div>
            </div>

            <ClientDialog
                isOpen={isClientDialogOpen}
                onClose={() => setIsClientDialogOpen(false)}
            />

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Client Info */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Bill To</label>
                        {selectedClientId && selectedClient ? (
                            <div className="group relative">
                                <div className="text-gray-900 font-medium">{selectedClient.name}</div>
                                <div className="text-sm text-gray-500 whitespace-pre-line">{selectedClient.billingAddress}</div>
                                <div className="text-sm text-gray-400">{selectedClient.email}</div>
                                {!clientId && (
                                    <button
                                        onClick={() => setSelectedClientId("")}
                                        className="text-xs text-indigo-600 hover:text-indigo-500 mt-1 font-medium"
                                    >
                                        Change Client
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Combobox
                                    items={clientOptions}
                                    value={selectedClientId}
                                    onSelect={setSelectedClientId}
                                    placeholder="Select Client..."
                                    className="bg-white border-gray-200 text-gray-900 hover:bg-gray-50 hover:text-gray-900 justify-between w-full"
                                    popoverClassName="bg-white border-gray-200 text-gray-900 shadow-md"
                                    itemClassName="text-gray-700 aria-selected:bg-indigo-50 aria-selected:text-indigo-700 hover:bg-indigo-50 hover:text-indigo-700"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-dashed border-gray-300 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                    onClick={() => setIsClientDialogOpen(true)}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Client
                                </Button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Division</label>
                        <select
                            value={division}
                            onChange={(e) => setDivision(e.target.value as "EXTERMINATION" | "ENTREPRISES" | "RENOVATION")}
                            className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                            {(user?.role === "ADMIN" || user?.divisions.includes("EXTERMINATION")) && (
                                <option value="EXTERMINATION">Extermination ZLS</option>
                            )}
                            {(user?.role === "ADMIN" || user?.divisions.includes("ENTREPRISES")) && (
                                <option value="ENTREPRISES">Les Entreprises ZLS</option>
                            )}
                            {(user?.role === "ADMIN" || user?.divisions.includes("RENOVATION")) && (
                                <option value="RENOVATION">Rénovation Esthéban</option>
                            )}
                        </select>
                    </div>
                </div>

                {/* Quote Details */}
                <div className="space-y-4 col-span-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Quote #</label>
                            <input
                                type="text"
                                value={quote?.number || "Auto-generated"}
                                disabled
                                className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">PO Number</label>
                            <input
                                type="text"
                                value={poNumber}
                                onChange={(e) => setPoNumber(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. PO-1234"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Date Issued</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal bg-white border-gray-200 text-gray-900 hover:bg-gray-50",
                                            !issuedDate && "text-gray-400"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {issuedDate ? format(issuedDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-white border-gray-200 shadow-md">
                                    <Calendar
                                        mode="single"
                                        selected={issuedDate}
                                        onSelect={(d) => d && setIssuedDate(d)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Valid Until</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal bg-white border-gray-200 text-gray-900 hover:bg-gray-50",
                                            !dueDate && "text-gray-400"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dueDate ? format(dueDate, "PPP") : <span>Select date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-white border-gray-200 shadow-md">
                                    <Calendar
                                        mode="single"
                                        selected={dueDate}
                                        onSelect={setDueDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#f8f9fa] text-gray-500 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 w-10"></th>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3 w-16 text-center">Upsell</th>
                                <th className="px-4 py-3 w-24 text-right">Cost</th>
                                <th className="px-4 py-3 w-24 text-right">Qty</th>
                                <th className="px-4 py-3 w-32 text-right">Price</th>
                                <th className="px-4 py-3 w-32 text-right">Total</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map((item, index) => (
                                <tr key={item.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-center text-gray-400 cursor-move">
                                        <MoreHorizontal className="w-4 h-4 mx-auto" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="space-y-1">
                                            <select
                                                value={item.productId || ""}
                                                onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                                className="w-full h-8 text-sm border border-gray-200 rounded px-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
                                            >
                                                <option value="">Sélectionner un service...</option>
                                                {productOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            <div className="flex items-center gap-2 mt-1">
                                                {/* @ts-ignore */}
                                                {item.product?.isCommissionEligible && (
                                                    <span className="text-yellow-500" title="Eligible for Commission">
                                                        $
                                                    </span>
                                                )}
                                            <div className="flex flex-col gap-1">
                                                <textarea
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    placeholder="Add a description"
                                                    rows={Math.max(3, (item.description || "").split("\n").length + 1)}
                                                    className="w-full bg-transparent border border-gray-100 rounded p-1 px-1 text-sm text-gray-700 focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300 placeholder:text-gray-400 resize-y min-h-[60px]"
                                                />
                                                <div className="flex justify-between items-center">
                                                    {quickServiceIndex === index ? (
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="text"
                                                                autoFocus
                                                                value={quickServiceName}
                                                                onChange={e => setQuickServiceName(e.target.value)}
                                                                placeholder="Nom du service..."
                                                                className="text-xs border px-1.5 py-0.5 rounded w-32 outline-none focus:border-emerald-500"
                                                                onKeyDown={e => e.key === 'Enter' && handleCreateQuickService()}
                                                            />
                                                            <button type="button" onClick={handleCreateQuickService} className="text-white bg-emerald-600 hover:bg-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Créer</button>
                                                            <button type="button" onClick={() => { setQuickServiceIndex(null); setQuickServiceName(""); }} className="text-gray-500 hover:text-gray-700 font-bold px-1">×</button>
                                                        </div>
                                                    ) : (
                                                        <button type="button" onClick={() => setQuickServiceIndex(index)} className="text-[10px] flex items-center gap-1 text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                                                            <Plus className="w-3 h-3" /> Nouveau Service
                                                        </button>
                                                    )}
                                                    <TemplateSelector
                                                        label={<span className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded"><FileText className="w-3 h-3" /> Modèles</span>}
                                                        side="right"
                                                        onSelect={(text) => handleItemChange(index, 'description', item.description ? `${item.description}\n\n${text}` : text)}
                                                    />
                                                </div>
                                            </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center align-top pt-5">
                                        {/* @ts-ignore */}
                                        {item.product?.isCommissionEligible && (
                                            <input
                                                type="checkbox"
                                                checked={item.isUpsell || false}
                                                onChange={(e) => handleItemChange(index, 'isUpsell', e.target.checked)}
                                                className="rounded border-gray-300 bg-white text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                title="Vente générée sur place"
                                            />
                                        )}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <input
                                            type="number"
                                            value={item.cost}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => handleItemChange(index, 'cost', Number(e.target.value))}
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-right text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none h-8"
                                        />
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-right text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none h-8"
                                        />
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <input
                                            type="number"
                                            value={item.price}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-right text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none h-8"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-900 font-medium align-top pt-5">
                                        ${(Number(item.quantity) * Number(item.price)).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-center align-top pt-4">
                                        <button
                                            onClick={() => handleRemoveItem(index)}
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-3 bg-white border-t border-gray-200 flex gap-3">
                        <Button variant="outline" onClick={handleAddItem} className="bg-white border-gray-300 text-gray-600 hover:bg-gray-50 text-xs py-1 h-8">
                            <Plus className="w-3 h-3 mr-2" /> Add Item
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsCalculatorOpen(true)}
                            className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs py-1 h-8"
                        >
                            <Calculator className="w-3 h-3 mr-2" />
                            Calculateur Chantier
                        </Button>
                    </div>
                </div>
            </div>

            <ConstructionCalculator
                isOpen={isCalculatorOpen}
                onClose={() => setIsCalculatorOpen(false)}
                division={division}
                onConfirm={(calculatedItem) => {
                    setItems([...items, {
                        id: `calc-${Date.now()}`,
                        productId: "", // No linked product for custom estimates
                        description: calculatedItem.description,
                        quantity: calculatedItem.quantity,
                        price: calculatedItem.price,
                        cost: calculatedItem.cost,
                        tax: 0,
                        product: null,
                        isUpsell: false
                    }]);
                }}
            />

            {/* Footer / Totals */}
            <div className="flex flex-col md:flex-row gap-8 mt-4">
                <div className="flex-1 space-y-6 max-w-xl">
                    {/* Notes logic wrapper */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                            <div className="flex justify-between items-center bg-gray-50 border-b border-gray-200 px-4 py-2">
                                <label className="text-xs font-semibold text-gray-600 uppercase">Terms</label>
                                <TemplateSelector onSelect={(text) => setTerms(terms ? `${terms}\n\n${text}` : text)} />
                            </div>
                            <textarea
                                value={terms}
                                onChange={(e) => setTerms(e.target.value)}
                                className="w-full bg-white border-none text-sm text-gray-700 resize-none px-4 py-3 focus:ring-0 placeholder:text-gray-400 outline-none"
                                placeholder="Enter terms and conditions..."
                                rows={3}
                            />
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                            <div className="flex justify-between items-center bg-gray-50 border-b border-gray-200 px-4 py-2">
                                <label className="text-xs font-semibold text-gray-600 uppercase">Notes</label>
                                <TemplateSelector onSelect={(text) => setNotes(notes ? `${notes}\n\n${text}` : text)} />
                            </div>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-white border-none text-sm text-gray-700 resize-none px-4 py-3 focus:ring-0 placeholder:text-gray-400 outline-none"
                                placeholder="Enter notes visible to client..."
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-80 shrink-0 space-y-4">
                    <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-4 shadow-sm">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="text-gray-900 font-medium">${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Discount</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={discount}
                                    onChange={(e) => setDiscount(Number(e.target.value))}
                                    className="w-16 bg-white border border-gray-300 rounded px-2 py-1 text-right text-gray-900 text-xs focus:ring-1 focus:ring-indigo-500 outline-none h-8"
                                />
                                <select
                                    value={discountType}
                                    onChange={(e) => setDiscountType(e.target.value as any)}
                                    className="bg-gray-50 border border-gray-300 rounded px-1 py-1 text-gray-700 text-xs focus:ring-1 focus:ring-indigo-500 outline-none h-8"
                                >
                                    <option value="percent">%</option>
                                    <option value="amount">$</option>
                                </select>
                            </div>
                        </div>

                        {/* Tax Section */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Tax</span>
                                    <label className="flex items-center gap-1 text-xs text-indigo-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isQuebecTax}
                                            onChange={(e) => {
                                                setIsQuebecTax(e.target.checked);
                                                if (e.target.checked) {
                                                    setTaxRate(14.975);
                                                } else {
                                                    setTaxRate(0);
                                                }
                                            }}
                                            className="rounded border-gray-300 bg-white text-indigo-600 focus:ring-indigo-500"
                                        />
                                        QC Taxes
                                    </label>
                                </div>
                                {!isQuebecTax && (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={taxRate}
                                            onChange={(e) => setTaxRate(Number(e.target.value))}
                                            className="w-12 bg-white border border-gray-300 rounded px-2 py-1 text-right text-gray-900 text-xs focus:ring-1 focus:ring-indigo-500 outline-none h-8"
                                        />
                                        <span className="text-gray-500 text-xs">%</span>
                                    </div>
                                )}
                            </div>

                            {isQuebecTax ? (
                                <>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>GST (5%)</span>
                                        <span>${(taxableAmount * 0.05).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>QST (9.975%)</span>
                                        <span>${(taxableAmount * 0.09975).toFixed(2)}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Tax Amount</span>
                                    <span className="text-gray-900 font-medium">${taxAmount.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-200 pt-4 flex justify-between items-end">
                            <span className="text-gray-900 font-semibold">Total</span>
                            <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
