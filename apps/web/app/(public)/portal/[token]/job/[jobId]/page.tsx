"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPortalJob } from "@/app/actions/portal-actions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Calendar, Clock, MapPin, User, FileText, CheckCircle, Printer, Download, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function JobReportPage() {
    const params = useParams();
    const router = useRouter();
    // @ts-ignore
    const token = typeof params?.token === 'string' ? params.token : "";
    // @ts-ignore
    const jobId = typeof params?.jobId === 'string' ? params.jobId : "";

    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState<any>(null);

    useEffect(() => {
        if (!token || !jobId) return;

        const fetchData = async () => {
            try {
                const data = await getPortalJob(token, jobId);
                if (!data) {
                    toast.error("Report not found or access denied");
                    router.push(`/portal/${token}`);
                    return;
                }
                setJob(data);
            } catch (e) {
                console.error(e);
                toast.error("Failed to load report");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token, jobId, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!job) return null;

    const isExtermination = job.division === "EXTERMINATION";

    return (
        <div className="min-h-screen bg-gray-100 print:bg-white p-4 md:p-8 print:p-0">

            {/* Navigation (Hidden on Print) */}
            <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Portal
                </button>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Printer className="h-4 w-4" />
                    Print / Save to PDF
                </button>
            </div>

            {/* Report Paper */}
            <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none rounded-xl overflow-hidden print:rounded-none">

                {/* Header */}
                <header className="border-b-2 border-indigo-600 p-8 print:p-6 flex justify-between items-start">
                    <div>
                        {isExtermination ? (
                            <img src="/zls-logo.png" alt="ZLS" className="h-16 object-contain mb-2" />
                        ) : (
                            <img src="/logo.png" alt="Logo" className="h-16 object-contain mb-2" />
                        )}
                        <h1 className="text-2xl font-bold text-gray-900 mt-4 uppercase tracking-wide">
                            Rapport de Service
                        </h1>
                        <p className="text-gray-500 text-sm">
                            #{job.id.slice(0, 8).toUpperCase()}
                        </p>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                        <div className="font-semibold text-gray-900 text-lg mb-1">
                            {format(new Date(job.scheduledAt), "d MMMM yyyy", { locale: fr })}
                        </div>
                        <div className="flex items-center justify-end gap-1 mb-2">
                            <Clock className="h-4 w-4" />
                            {format(new Date(job.scheduledAt), "HH:mm")}
                            {job.completedAt && ` - ${format(new Date(job.completedAt), "HH:mm")}`}
                        </div>
                        <div>
                            {job.status === 'COMPLETED' ? (
                                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full font-bold text-xs uppercase">Conplété</span>
                            ) : (
                                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-full font-bold text-xs uppercase">{job.status}</span>
                            )}
                        </div>
                    </div>
                </header>

                <div className="p-8 print:p-6 space-y-8">

                    {/* Location Info */}
                    <div className="grid md:grid-cols-2 gap-8 p-6 bg-gray-50 rounded-lg print:bg-transparent print:border print:p-4">
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Client</h3>
                            <div className="font-semibold text-gray-900 text-lg">{job.property?.client?.name}</div>
                            <div className="text-gray-600">{job.property?.client?.email}</div>
                            <div className="text-gray-600">{job.property?.client?.phone}</div>
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Service Location</h3>
                            <div className="flex items-start gap-2 text-gray-900">
                                <MapPin className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                                <div>
                                    <div className="font-medium">{job.property?.address}</div>
                                    <div>{job.property?.city} {job.property?.postalCode}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technician */}
                    {job.technicians && job.technicians.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Technicien(s)</h3>
                            <div className="flex gap-4">
                                {job.technicians.map((t: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-full border print:border-0 print:bg-transparent print:p-0">
                                        <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs">
                                            {t.name.charAt(0)}
                                        </div>
                                        <span className="font-medium text-gray-900">{t.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {job.description && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 border-b pb-2">Description</h3>
                            <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-md print:bg-transparent print:p-0">
                                {job.description}
                            </p>
                        </div>
                    )}

                    {/* Products */}
                    {job.products && job.products.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Produits Utilisés</h3>
                            <table className="min-w-full divide-y divide-gray-200 border rounded-lg overflow-hidden">
                                <thead className="bg-gray-50 print:bg-gray-100">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit / Service</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {job.products.map((p: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {p.product.name}
                                                {p.product.activeIngredient && (
                                                    <div className="text-xs text-gray-500 font-normal mt-0.5">
                                                        Active: {p.product.activeIngredient}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                                {p.quantity} {p.unit}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Notes */}
                    {job.notes && job.notes.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2">Notes & Remarques</h3>
                            <ul className="space-y-4">
                                {job.notes.map((note: any) => (
                                    <li key={note.id} className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md print:bg-transparent print:border-l-2 print:border-gray-300 print:pl-4 print:p-0">
                                        <p className="text-gray-800">{note.content}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Photos */}
                    {job.photos && job.photos.length > 0 && (
                        <div className="break-inside-avoid">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-2 flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                Photos
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {job.photos.map((photo: any) => (
                                    <div key={photo.id} className="border rounded-lg overflow-hidden break-inside-avoid bg-gray-50">
                                        <div className="aspect-[4/3] relative">
                                            <img
                                                src={photo.url}
                                                alt={photo.caption || "Job Photo"}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        {photo.caption && (
                                            <div className="p-2 text-xs text-gray-600 bg-white border-t">
                                                {photo.caption}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Signatures */}
                    {job.signature && (
                        <div className="mt-12 break-inside-avoid">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">Confirmation</h3>
                            <div className="grid grid-cols-2 gap-12">
                                <div>
                                    <div className="h-24 border-b border-gray-400 flex items-end justify-center pb-2">
                                        {/* Placeholder for tech signature - usually just name in this system */}
                                        <span className="font-script text-2xl text-gray-600">{job.technicians?.[0]?.name}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 text-center uppercase tracking-wide">Technicien</p>
                                </div>
                                <div>
                                    <div className="h-24 border-b border-gray-400 flex items-end justify-center">
                                        <img src={job.signature} alt="Client Signature" className="max-h-20 object-contain block" />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 text-center uppercase tracking-wide">Client</p>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <footer className="bg-gray-50 border-t p-8 print:p-6 text-center text-xs text-gray-500 print:text-gray-400">
                    <p>Report generated on {format(new Date(), "d MMMM yyyy HH:mm", { locale: fr })}</p>
                    <p className="mt-1">Antigravity Field Service System</p>
                </footer>

            </div>
        </div>
    );
}
