import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { cookies } from 'next/headers';
import { dictionary } from '@/lib/i18n/dictionary';

export default async function QuoteDetailsPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const cookieStore = cookies();
    const lang = cookieStore.get("NEXT_LOCALE")?.value || "en";
    const t = dictionary[lang as keyof typeof dictionary] || dictionary.en;

    const quote = await prisma.quote.findUnique({
        where: { id },
        include: {
            client: true,
            property: true,
            items: {
                include: {
                    product: true
                }
            }
        }
    });

    if (!quote) {
        notFound();
    }

    return (
        <div className="max-w-5xl mx-auto p-8">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t.quotes.title} #{quote.number || quote.id.slice(0, 8)}</h1>
                    <span className={`px-2 py-1 text-sm rounded-full font-semibold
                        ${quote.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                            quote.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                quote.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'}`}>
                        {quote.status}
                    </span>
                </div>
                <Link
                    href="/quotes"
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
                >
                    &larr; Back to Quotes
                </Link>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 mb-8">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <h2 className="font-semibold text-gray-700">Client Information</h2>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase">Client</label>
                        <Link href={`/clients/${quote.clientId}`} className="text-indigo-600 hover:underline">
                            {quote.client.name}
                        </Link>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase">Property</label>
                        <div className="text-gray-900">{quote.property?.address || "N/A"}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase">Date</label>
                        <div className="text-gray-900">{format(new Date(quote.createdAt), "PPP")}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase">Total</label>
                        <div className="text-xl font-bold text-gray-900">${quote.total.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <h2 className="font-semibold text-gray-700">Quote Items</h2>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product/Service</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {quote.items.map((item) => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {item.product.name}
                                    {item.description && <div className="text-gray-500 text-xs font-normal">{item.description}</div>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                    {item.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                    ${item.price.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                                    ${(item.quantity * item.price).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
