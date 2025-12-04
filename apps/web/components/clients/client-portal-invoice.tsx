import { Invoice, Product } from "@prisma/client";
import { createCheckoutSession } from "@/app/actions/payment-actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { translations, Language } from "@/lib/translations";

interface ClientPortalInvoiceProps {
    invoice: Invoice & { items: (any & { product: Product })[] };
    language?: Language;
}

export function ClientPortalInvoice({ invoice, language = "FR" }: ClientPortalInvoiceProps) {
    const t = translations[language];
    const dateLocale = language === "FR" ? fr : enUS;

    const handlePay = async () => {
        const toastId = toast.loading(t.redirecting);
        try {
            const result = await createCheckoutSession(invoice.id);
            if (result.url) {
                window.location.href = result.url;
            } else {
                toast.error(result.error || t.paymentFailed, { id: toastId });
            }
        } catch (error) {
            toast.error(t.error, { id: toastId });
        }
    };

    return (
        <li className="py-4 flex justify-between items-center">
            <div>
                <p className="text-sm font-medium text-gray-900">
                    {t.invoice} #{invoice.id.slice(0, 8)} - {invoice.description}
                </p>
                <p className="text-sm text-gray-500">
                    {format(new Date(invoice.createdAt), 'MMM d, yyyy', { locale: dateLocale })}
                </p>
                <div className="mt-1">
                    {invoice.items.map(item => (
                        <span key={item.id} className="text-xs text-gray-500 block">
                            • {item.product.name} x{item.quantity}
                        </span>
                    ))}
                </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
                <p className="text-lg font-bold text-gray-900">${invoice.total.toFixed(2)}</p>
                <button
                    onClick={handlePay}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    {t.payNow}
                </button>
            </div>
        </li>
    );
}
