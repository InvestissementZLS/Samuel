import { Invoice, InvoiceItem, Product } from "@prisma/client";
import { format } from "date-fns";

interface InvoiceTemplateProps {
    invoice: Invoice & { items: (InvoiceItem & { product: Product })[] };
    client: any; // Replace with proper Client type
}

export function InvoiceTemplate({ invoice, client }: InvoiceTemplateProps) {
    // @ts-ignore
    const division = invoice.division || "EXTERMINATION";
    const isExtermination = division === "EXTERMINATION";

    const companyName = isExtermination ? "Extermination ZLS" : "Les Entreprises ZLS";
    const companyAddress = isExtermination
        ? "123 Extermination St, City, QC"
        : "456 Entreprises Blvd, City, QC";
    const companyPhone = isExtermination ? "(555) 123-4567" : "(555) 987-6543";
    const companyEmail = isExtermination ? "info@exterminationzls.com" : "info@entrepriseszls.com";
    const primaryColor = isExtermination ? "text-red-600" : "text-blue-600";
    const borderColor = isExtermination ? "border-red-600" : "border-blue-600";

    return (
        <div className="bg-white text-black p-8 max-w-4xl mx-auto shadow-lg print:shadow-none">
            {/* Header */}
            <div className={`flex justify-between items-start border-b-4 ${borderColor} pb-6 mb-8`}>
                <div>
                    <h1 className={`text-3xl font-bold ${primaryColor} uppercase tracking-wider`}>
                        {companyName}
                    </h1>
                    <div className="mt-2 text-sm text-gray-600">
                        <p>{companyAddress}</p>
                        <p>{companyPhone}</p>
                        <p>{companyEmail}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-light text-gray-400 uppercase">Invoice</h2>
                    <p className="text-lg font-semibold mt-2">#{invoice.number || invoice.poNumber || "DRAFT"}</p>
                </div>
            </div>

            {/* Client & Info */}
            <div className="flex justify-between mb-12">
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bill To</h3>
                    <p className="font-bold text-lg">{client.firstName} {client.lastName}</p>
                    <p className="text-gray-600">{client.address}</p>
                    <p className="text-gray-600">{client.city}, {client.province} {client.postalCode}</p>
                    <p className="text-gray-600">{client.email}</p>
                </div>
                <div className="text-right space-y-2">
                    <div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-4">Date Issued</span>
                        <span className="font-medium">{format(new Date(invoice.issuedDate || new Date()), "MMM d, yyyy")}</span>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-4">Due Date</span>
                        <span className="font-medium">{invoice.dueDate ? format(new Date(invoice.dueDate), "MMM d, yyyy") : "Due on receipt"}</span>
                    </div>
                    {invoice.poNumber && (
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-4">PO Number</span>
                            <span className="font-medium">{invoice.poNumber}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Items */}
            <table className="w-full mb-8">
                <thead>
                    <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="text-right py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Qty</th>
                        <th className="text-right py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Price</th>
                        <th className="text-right py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {invoice.items.map((item) => (
                        <tr key={item.id}>
                            <td className="py-4 text-sm">
                                <p className="font-medium">{item.product.name}</p>
                                {item.description && <p className="text-gray-500 text-xs mt-1">{item.description}</p>}
                            </td>
                            <td className="py-4 text-sm text-right">{item.quantity}</td>
                            <td className="py-4 text-sm text-right">${item.price.toFixed(2)}</td>
                            <td className="py-4 text-sm text-right font-medium">${(item.quantity * item.price).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
                <div className="w-64 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">${(invoice.total - (invoice.tax || 0)).toFixed(2)}</span>
                    </div>
                    {invoice.discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                            <span>Discount</span>
                            <span>-${invoice.discount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax</span>
                        <span className="font-medium">${(invoice.tax || 0).toFixed(2)}</span>
                    </div>
                    <div className={`flex justify-between text-lg font-bold ${primaryColor} border-t-2 border-gray-200 pt-3`}>
                        <span>Total</span>
                        <span>${invoice.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
                <p className="font-medium mb-2">Thank you for your business!</p>
                {invoice.terms && <p className="text-xs">{invoice.terms}</p>}
                <div className="mt-4 text-xs">
                    <p>{companyName} • {companyAddress}</p>
                    <p>{companyEmail} • {companyPhone}</p>
                </div>
            </div>
        </div>
    );
}
