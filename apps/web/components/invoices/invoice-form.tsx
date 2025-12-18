"use client";

import { useDivision } from "@/components/providers/division-provider";

import { useState } from "react";
import { Invoice, Product, InvoiceItem, Client } from "@prisma/client";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, MoreHorizontal, FileText } from "lucide-react";
import { toast } from "sonner";
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

interface InvoiceFormProps {
    invoice?: Invoice & { items: (InvoiceItem & { product: Product })[] };
    products: Product[];
    clients?: Client[];
    clientId: string;
    onSave: (data: any) => Promise<void>;
}

export function InvoiceForm({ invoice, products, clientId, onSave, clients = [] }: InvoiceFormProps) {
    const [loading, setLoading] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState(clientId || invoice?.clientId || "");
    const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);


    // Form State
    const [poNumber, setPoNumber] = useState(invoice?.poNumber || "");
    const [issuedDate, setIssuedDate] = useState<Date>(invoice?.issuedDate ? new Date(invoice.issuedDate) : new Date());
    const [dueDate, setDueDate] = useState<Date | undefined>(invoice?.dueDate ? new Date(invoice.dueDate) : undefined);
    const { division: globalDivision } = useDivision();
    const [division, setDivision] = useState<"EXTERMINATION" | "ENTREPRISES">((invoice?.division as "EXTERMINATION" | "ENTREPRISES") || globalDivision);

    const [items, setItems] = useState<any[]>(invoice?.items.map(item => ({
        id: item.id,
        productId: item.productId,
        description: item.description || item.product.name,
        quantity: item.quantity,
        price: item.price,
        cost: item.unitCost || 0,
        tax: item.taxRate || 0,
        product: item.product
    })) || []);

    const [discount, setDiscount] = useState(invoice?.discount || 0);
    const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
    const [taxRate, setTaxRate] = useState(invoice?.tax || 0);
    const [isQuebecTax, setIsQuebecTax] = useState(Math.abs((invoice?.tax || 0) - 14.975) < 0.01);

    const [notes, setNotes] = useState(invoice?.notes || "");
    const [terms, setTerms] = useState(invoice?.terms || "");

    // Calculations
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const discountAmount = discountType === 'percent' ? subtotal * (discount / 100) : discount;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = taxableAmount + taxAmount;
    const balanceDue = total; // Assuming no payments yet for this form

    const handleAddItem = () => {
        setItems([...items, {
            id: `temp-${Date.now()}`,
            productId: "",
            description: "",
            quantity: 1,
            price: 0,
            cost: 0,
            tax: 0,
            product: null
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
            const product = products.find(p => p.id === value);
            if (product) {
                newItems[index].product = product;
                newItems[index].description = product.name;
                newItems[index].price = product.price;
                newItems[index].cost = 0;
            }
        }

        setItems(newItems);
    };

    const handleSave = async () => {
        if (!selectedClientId) {
            toast.error("Please select a client");
            return;
        }

        const validItems = items.filter(item => item.productId);
        if (validItems.length === 0 && items.length > 0) {
            toast.error("Please select products for all items or remove empty rows");
            return;
        }

        // Check if there are any items with empty product IDs that weren't filtered out (e.g. if we want to enforce all rows to be valid)
        // For now, let's just filter out invalid rows or error if any row is invalid?
        // Better UX: Error if any row has missing product but has other data, or just check existence.

        const hasInvalidItems = items.some(item => !item.productId);
        if (hasInvalidItems) {
            toast.error("Please select a product for all items");
            return;
        }

        setLoading(true);
        try {
            await onSave({
                id: invoice?.id,
                clientId: selectedClientId,
                poNumber,
                issuedDate,
                dueDate,
                division,
                items: items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    description: item.description,
                    unitCost: item.cost,
                    taxRate: item.tax
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

    const productOptions = products
        .filter(p => {
            // @ts-ignore
            const productDivision = p.division || "EXTERMINATION";
            return productDivision === division;
        })
        .map(p => ({ value: p.id, label: p.name }));

    const clientOptions = clients.map(c => ({ value: c.id, label: c.name }));
    const selectedClient = clients.find(c => c.id === selectedClientId);

    return (
        <div className="bg-[#1e1e1e] text-gray-300 p-6 rounded-lg shadow-xl max-w-5xl mx-auto font-sans">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b border-gray-800 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-lg">
                        <FileText className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h1 className="text-xl font-semibold text-white">
                        {invoice ? "Edit Invoice" : "New Invoice"}
                    </h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800">
                        Preview
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {loading ? "Saving..." : "Save Invoice"}
                    </Button>
                </div>
            </div>

            <ClientDialog
                isOpen={isClientDialogOpen}
                onClose={() => setIsClientDialogOpen(false)}
            />

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                {/* Client Info */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Bill To</label>
                        {selectedClientId && selectedClient ? (
                            <div className="group relative">
                                <div className="text-white font-medium">{selectedClient.name}</div>
                                <div className="text-sm text-gray-400 whitespace-pre-line">{selectedClient.billingAddress}</div>
                                <div className="text-sm text-gray-500">{selectedClient.email}</div>
                                {!clientId && (
                                    <button
                                        onClick={() => setSelectedClientId("")}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 mt-1"
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
                                    className="bg-gray-900 border-gray-700 text-white hover:bg-gray-800 hover:text-white justify-between w-full"
                                    popoverClassName="bg-gray-800 border-gray-700 text-white"
                                    itemClassName="text-white aria-selected:bg-gray-700 aria-selected:text-white hover:bg-gray-700 hover:text-white"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-dashed border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
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
                            onChange={(e) => setDivision(e.target.value as "EXTERMINATION" | "ENTREPRISES")}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                        >
                            <option value="EXTERMINATION">Extermination ZLS</option>
                            <option value="ENTREPRISES">Les Entreprises ZLS</option>
                        </select>
                    </div>
                </div>

                {/* Invoice Details */}
                <div className="space-y-4 col-span-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Invoice #</label>
                            <input
                                type="text"
                                value={invoice?.number || "Auto-generated"}
                                disabled
                                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">PO Number</label>
                            <input
                                type="text"
                                value={poNumber}
                                onChange={(e) => setPoNumber(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none"
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
                                            "w-full justify-start text-left font-normal bg-gray-900 border-gray-700 text-white hover:bg-gray-800",
                                            !issuedDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {issuedDate ? format(issuedDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700 text-white">
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
                            <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal bg-gray-900 border-gray-700 text-white hover:bg-gray-800",
                                            !dueDate && "text-gray-500"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dueDate ? format(dueDate, "PPP") : <span>Due on receipt</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700 text-white">
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
                <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-800 text-gray-400 font-medium uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 w-10"></th>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3 w-24 text-right">Cost</th>
                                <th className="px-4 py-3 w-24 text-right">Qty</th>
                                <th className="px-4 py-3 w-32 text-right">Price</th>
                                <th className="px-4 py-3 w-32 text-right">Total</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {items.map((item, index) => (
                                <tr key={item.id} className="group hover:bg-gray-800/50 transition-colors">
                                    <td className="px-4 py-3 text-center text-gray-600 cursor-move">
                                        <MoreHorizontal className="w-4 h-4 mx-auto" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="space-y-2">
                                            <Combobox
                                                items={productOptions}
                                                value={item.productId}
                                                onSelect={(val) => handleItemChange(index, 'productId', val)}
                                                placeholder="Select Item"
                                                className="bg-transparent border-none text-white hover:bg-gray-800 justify-between w-full p-0 h-auto"
                                                popoverClassName="bg-gray-800 border-gray-700 text-white"
                                                itemClassName="text-white aria-selected:bg-gray-700 aria-selected:text-white"
                                            />
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                placeholder="Add a description"
                                                className="w-full bg-transparent border-none p-0 text-xs text-gray-500 focus:ring-0 placeholder:text-gray-700"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            value={item.cost}
                                            onChange={(e) => handleItemChange(index, 'cost', Number(e.target.value))}
                                            className="w-full bg-transparent text-right text-gray-500 focus:text-white outline-none"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                            className="w-full bg-transparent text-right text-white outline-none"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            value={item.price}
                                            onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                                            className="w-full bg-transparent text-right text-white outline-none"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right text-white font-medium">
                                        ${(item.quantity * item.price).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleRemoveItem(index)}
                                            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-2 border-t border-gray-800">
                        <Button variant="ghost" onClick={handleAddItem} className="text-indigo-400 hover:text-indigo-300 hover:bg-gray-800">
                            <Plus className="w-4 h-4 mr-2" /> Add Item
                        </Button>
                    </div>
                </div>
            </div>

            {/* Footer / Totals */}
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-6">
                    {/* Terms & Notes */}
                    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Terms</label>
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-gray-500">Insert</Button>
                        </div>
                        <textarea
                            value={terms}
                            onChange={(e) => setTerms(e.target.value)}
                            className="w-full bg-transparent border-none text-sm text-gray-300 resize-none focus:ring-0 placeholder:text-gray-700"
                            placeholder="Enter terms and conditions..."
                            rows={3}
                        />
                    </div>
                    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Notes</label>
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-gray-500">Insert</Button>
                        </div>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-transparent border-none text-sm text-gray-300 resize-none focus:ring-0 placeholder:text-gray-700"
                            placeholder="Enter notes visible to client..."
                            rows={3}
                        />
                    </div>
                </div>

                <div className="w-full md:w-80 space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Subtotal</span>
                        <span className="text-white">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Discount</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={discount}
                                onChange={(e) => setDiscount(Number(e.target.value))}
                                className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-right text-white text-xs"
                            />
                            <select
                                value={discountType}
                                onChange={(e) => setDiscountType(e.target.value as any)}
                                className="bg-gray-900 border border-gray-700 rounded px-1 py-1 text-white text-xs"
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
                                <span className="text-gray-400">Tax</span>
                                <label className="flex items-center gap-1 text-xs text-indigo-400 cursor-pointer">
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
                                        className="rounded border-gray-700 bg-gray-800 text-indigo-500 focus:ring-0"
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
                                        className="w-12 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-right text-white text-xs"
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
                                <span className="text-gray-400">Tax Amount</span>
                                <span className="text-white">${taxAmount.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-700 pt-4 flex justify-between items-end">
                        <span className="text-gray-400 font-medium">Total</span>
                        <span className="text-2xl font-bold text-white">${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-indigo-400 font-medium">
                        <span>Balance Due</span>
                        <span>${balanceDue.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
