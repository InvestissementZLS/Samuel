"use client";

import { useDivision } from "@/components/providers/division-provider";
import { useUser } from "@/components/providers/user-provider";

import { useState, useEffect } from "react";
import { getWarrantyTemplates } from "@/app/actions/warranty-actions";
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
import { InvoicePreviewDialog } from "@/components/invoices/invoice-preview-dialog";
import { useLanguage } from "@/components/providers/language-provider";

interface InvoiceFormProps {
    invoice?: Invoice & { items: (InvoiceItem & { product: Product })[] };
    products: Product[];
    clients?: Client[];
    clientId: string;
    prefilledClient?: any;
    onSave: (data: any) => Promise<void>;
}

export function InvoiceForm({ invoice, products, clientId, onSave, clients = [], prefilledClient }: InvoiceFormProps) {
    const [loading, setLoading] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState(clientId || invoice?.clientId || "");
    const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const { language, t } = useLanguage();
    const { user } = useUser();

    const [templates, setTemplates] = useState<{id: string, name: string, text: string}[]>([]);

    useEffect(() => {
        getWarrantyTemplates().then(setTemplates).catch(console.error);
    }, []);

    const TemplateSelector = ({ onSelect, label, side = "bottom" }: { onSelect: (text: string) => void, label?: React.ReactNode, side?: "bottom" | "top" | "right" | "left" }) => (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-0">{label || t?.common?.insert || "Insert"}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 shadow-lg" side={side}>
                <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700">{t?.settings?.warranties || "Templates"}</div>
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

    // Use prefilledClient (from client page) if available, otherwise look in clients list
    const resolvedClient = prefilledClient ||
        clients.find(c => c.id === selectedClientId) ||
        (invoice?.client?.id === selectedClientId ? (invoice as any).client : undefined);


    // Form State
    const [poNumber, setPoNumber] = useState(invoice?.poNumber || "");
    const [issuedDate, setIssuedDate] = useState<Date>(invoice?.issuedDate ? new Date(invoice.issuedDate) : new Date());
    const [dueDate, setDueDate] = useState<Date | undefined>(invoice?.dueDate ? new Date(invoice.dueDate) : undefined);
    const { division: globalDivision } = useDivision();
    const [division, setDivision] = useState<"EXTERMINATION" | "ENTREPRISES" | "RENOVATION">((invoice?.division as "EXTERMINATION" | "ENTREPRISES" | "RENOVATION") || globalDivision);

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
    const [taxRate, setTaxRate] = useState(invoice ? (invoice.tax || 0) : 14.975);
    const [isQuebecTax, setIsQuebecTax] = useState(invoice ? Math.abs((invoice.tax || 0) - 14.975) < 0.01 : true);

    const [notes, setNotes] = useState(invoice?.notes || "");
    const [terms, setTerms] = useState(invoice?.terms || "");

    // Calculations
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const discountAmount = discountType === 'percent' ? subtotal * (discount / 100) : discount;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = taxableAmount + taxAmount;
    // @ts-ignore
    const amountPaid = invoice?.amountPaid || 0;
    const balanceDue = Math.max(0, total - amountPaid);

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
            toast.error(t.invoices.selectClientError);
            return;
        }

        const validItems = items.filter(item => item.productId);
        if (validItems.length === 0 && items.length > 0) {
            toast.error(t.invoices.selectProductsError);
            return;
        }

        // Check if there are any items with empty product IDs that weren't filtered out (e.g. if we want to enforce all rows to be valid)
        // For now, let's just filter out invalid rows or error if any row is invalid?
        // Better UX: Error if any row has missing product but has other data, or just check existence.

        const hasInvalidItems = items.some(item => !item.productId);
        if (hasInvalidItems) {
            toast.error(t.invoices.selectProductsError);
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
        .map(p => ({ value: p.id, label: p.name }));

    // Filter clients based on division
    const clientOptions = clients
        .filter(c => {
            // @ts-ignore
            const divisions = c.divisions || ["EXTERMINATION"];
            return divisions.includes(division);
        })
        .map(c => ({ value: c.id, label: c.name }));
    const selectedClient = resolvedClient;

    return (
        <div className="bg-white text-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 max-w-5xl mx-auto font-sans">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <h1 className="text-xl font-semibold text-gray-800">
                        {invoice ? t.invoices.editInvoice : t.invoices.createInvoice}
                    </h1>
                </div>
            </div>

            <ClientDialog
                isOpen={isClientDialogOpen}
                onClose={() => setIsClientDialogOpen(false)}
            />

            {selectedClient && (
                <InvoicePreviewDialog
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    // @ts-ignore
                    language={selectedClient?.language || language}
                    invoice={{
                        // @ts-ignore
                        id: invoice?.id || "PREVIEW",
                        number: invoice?.number || "PREVIEW",
                        clientId: selectedClientId,
                        poNumber: poNumber,
                        issuedDate: issuedDate,
                        dueDate: dueDate,
                        division: division,
                        status: "DRAFT",
                        total: total,
                        subtotal: subtotal,
                        tax: taxAmount,
                        discount: discountAmount,
                        amountPaid: amountPaid,
                        notes: notes,
                        terms: terms,
                        client: selectedClient,
                        items: items.map(item => ({
                            ...item,
                            product: item.product || { name: item.description, price: item.price }
                        })),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }}
                />
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Client Info */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t.invoices.billTo}</label>
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
                                        {t.invoices.changeClient}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Combobox
                                    items={clientOptions}
                                    value={selectedClientId}
                                    onSelect={setSelectedClientId}
                                    placeholder={t.common.select}
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
                                    {t.clientDialog.newClient}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t.products.division}</label>
                        <select
                            value={division}
                            onChange={(e) => setDivision(e.target.value as "EXTERMINATION" | "ENTREPRISES" | "RENOVATION")}
                            className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                            {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.divisions.includes("EXTERMINATION")) && (
                                <option value="EXTERMINATION">{t.divisions.extermination}</option>
                            )}
                            {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.divisions.includes("ENTREPRISES")) && (
                                <option value="ENTREPRISES">{t.divisions.entreprises}</option>
                            )}
                            {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.divisions.includes("RENOVATION")) && (
                                <option value="RENOVATION">Rénovation Esthéban</option>
                            )}
                        </select>
                    </div>
                </div>

                {/* Invoice Details */}
                <div className="space-y-4 col-span-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.invoices.invoiceNumber}</label>
                            <input
                                type="text"
                                value={invoice?.number || "Auto-generated"}
                                disabled
                                className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.invoices.poNumber}</label>
                            <input
                                type="text"
                                value={poNumber}
                                onChange={(e) => setPoNumber(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. PO-1234"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.invoices.dateIssued}</label>
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
                                        {issuedDate ? format(issuedDate, "PPP") : <span>{t.invoices.pickDate}</span>}
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
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t.invoices.dueDate}</label>
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
                                        {dueDate ? format(dueDate, "PPP") : <span>{t.invoices.dueOnReceipt}</span>}
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
                                <th className="px-4 py-3">{t.products.services}</th>
                                <th className="px-4 py-3 w-24 text-right">{t.products.cost}</th>
                                <th className="px-4 py-3 w-24 text-right">{t.common.quantity}</th>
                                <th className="px-4 py-3 w-32 text-right">{t.products.price}</th>
                                <th className="px-4 py-3 w-32 text-right">{t.quotes.total}</th>
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
                                            <Combobox
                                                items={productOptions}
                                                value={item.productId}
                                                onSelect={(val) => handleItemChange(index, 'productId', val)}
                                                placeholder={t.common.select}
                                                className="bg-white border-gray-200 text-gray-900 hover:bg-gray-50 aria-expanded:text-gray-900 justify-between w-full h-8"
                                                popoverClassName="bg-white border-gray-200 text-gray-900 shadow-md"
                                                itemClassName="text-gray-700 aria-selected:bg-indigo-50 aria-selected:text-indigo-700 hover:bg-indigo-50 hover:text-indigo-700"
                                            />
                                            <div className="group/desc relative mt-1">
                                                <textarea
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    placeholder="Add a description"
                                                    rows={Math.max(1, (item.description || "").split("\n").length)}
                                                    className="w-full bg-transparent border-none p-0 px-1 text-xs text-gray-500 focus:ring-0 placeholder:text-gray-400 resize-none min-h-[20px]"
                                                />
                                                <div className="absolute right-0 top-0 opacity-0 group-hover/desc:opacity-100 transition-opacity">
                                                    <TemplateSelector 
                                                        label={<FileText className="w-3 h-3" />}
                                                        side="right"
                                                        onSelect={(text) => handleItemChange(index, 'description', item.description ? `${item.description}\n\n${text}` : text)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <input
                                            type="number"
                                            value={item.cost}
                                            onChange={(e) => handleItemChange(index, 'cost', Number(e.target.value))}
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-right text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none h-8"
                                        />
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-right text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none h-8"
                                        />
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <input
                                            type="number"
                                            value={item.price}
                                            onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-right text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none h-8"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-900 font-medium align-top pt-5">
                                        ${(item.quantity * item.price).toFixed(2)}
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
                    </div>
                    
                    <div className="p-3">
                        <Button variant="outline" onClick={handleAddItem} className="bg-white border-gray-300 text-gray-600 hover:bg-gray-50 text-xs py-1 h-8">
                            <Plus className="w-3 h-3 mr-2" /> {t.invoices.addService}
                        </Button>
                    </div>
                </div>

            {/* Footer / Totals */}
            <div className="flex flex-col md:flex-row gap-8 mt-4">
                <div className="flex-1 space-y-6 max-w-xl">
                    {/* Notes logic wrapper */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="flex justify-between items-center bg-gray-50 border-b border-gray-200 px-4 py-2">
                                <label className="text-xs font-semibold text-gray-600 uppercase">{t.invoices.terms}</label>
                                <TemplateSelector onSelect={(text) => setTerms(terms ? `${terms}\n\n${text}` : text)} />
                            </div>
                            <textarea
                                value={terms}
                                onChange={(e) => setTerms(e.target.value)}
                                className="w-full bg-white border-none text-sm text-gray-700 resize-none px-4 py-3 focus:ring-0 placeholder:text-gray-400"
                                placeholder={t.invoices.termsPlaceholder}
                                rows={3}
                            />
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="flex justify-between items-center bg-gray-50 border-b border-gray-200 px-4 py-2">
                                <label className="text-xs font-semibold text-gray-600 uppercase">{t.invoices.notes}</label>
                                <TemplateSelector onSelect={(text) => setNotes(notes ? `${notes}\n\n${text}` : text)} />
                            </div>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-white border-none text-sm text-gray-700 resize-none px-4 py-3 focus:ring-0 placeholder:text-gray-400"
                                placeholder={t.invoices.notesPlaceholder}
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-80 shrink-0 space-y-4">
                    <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-4 shadow-sm">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">{t.invoices.subtotal}</span>
                            <span className="text-gray-900 font-medium">${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">{t.invoices.discount}</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={discount}
                                    onChange={(e) => setDiscount(Number(e.target.value))}
                                    className="w-16 bg-white border border-gray-300 rounded px-2 py-1 text-right text-gray-900 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                                <select
                                    value={discountType}
                                    onChange={(e) => setDiscountType(e.target.value as any)}
                                    className="bg-gray-50 border border-gray-300 rounded px-1 py-1 text-gray-700 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
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
                                    <span className="text-gray-500">{t.invoices.tax}</span>
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
                                        {t.invoices.qcTaxes}
                                    </label>
                                </div>
                                {!isQuebecTax && (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={taxRate}
                                            onChange={(e) => setTaxRate(Number(e.target.value))}
                                            className="w-12 bg-white border border-gray-300 rounded px-2 py-1 text-right text-gray-900 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                        <span className="text-gray-500 text-xs">%</span>
                                    </div>
                                )}
                            </div>

                            {isQuebecTax ? (
                                <>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>{t.invoices.gst}</span>
                                        <span>${(taxableAmount * 0.05).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>{t.invoices.qst}</span>
                                        <span>${(taxableAmount * 0.09975).toFixed(2)}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">{t.invoices.taxAmount}</span>
                                    <span className="text-gray-900 font-medium">${taxAmount.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-200 pt-4 flex justify-between items-end">
                            <span className="text-gray-900 font-semibold">{t.quotes.total}</span>
                            <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold mt-2">
                            <span className="text-gray-700">{t.invoices.balanceDue}</span>
                            <span className="text-gray-900">${balanceDue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-500">{t.invoices.paidToDate}</span>
                            <span className="text-emerald-600 font-medium">${amountPaid.toFixed(2)}</span>
                        </div>

                        {/* Transaction History - View Only */}
                        {/* @ts-ignore */}
                        {invoice?.transactions && invoice.transactions.length > 0 && (
                            <div className="border-t border-gray-200 pt-4 mt-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{t.invoices.history}</h4>
                                <div className="space-y-2">
                                    {/* @ts-ignore */}
                                    {invoice.transactions.map((t: any) => (
                                        <div key={t.id} className="flex justify-between text-xs">
                                            <div className="text-gray-500">
                                                {format(new Date(t.date), "MMM d, yyyy")} - {t.type} ({t.method})
                                            </div>
                                            <div className={t.type === 'REFUND' ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>
                                                {t.type === 'REFUND' ? '-' : '+'}${t.amount.toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Action Buttons in Footer */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="outline"
                            className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsPreviewOpen(true)}
                        >
                            {t.common.preview}
                        </Button>
                        <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                            {loading ? t.common.saving : (invoice ? t.common.save : t.invoices.createInvoice)}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
