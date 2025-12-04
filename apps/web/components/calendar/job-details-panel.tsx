import { Job, Property, Client, User, Invoice } from "@prisma/client";
import { format } from "date-fns";
import { X, MapPin, Phone, Mail, FileText, CreditCard, Settings } from "lucide-react";
import Link from "next/link";
import { updateJobStatus } from "@/app/actions/job-details-actions";
import { toast } from "sonner";
import { useState } from "react";

type JobWithDetails = Job & {
    property: Property & {
        client: Client;
    };
    technicians: User[];
    invoices: Invoice[];
    activities: (any & { user: User | null })[];
};

interface JobDetailsPanelProps {
    job: JobWithDetails;
    onClose: () => void;
}

export function JobDetailsPanel({ job, onClose }: JobDetailsPanelProps) {
    const [status, setStatus] = useState(job.status);
    const [loading, setLoading] = useState(false);

    const handleStatusChange = async (newStatus: string) => {
        setLoading(true);
        try {
            await updateJobStatus(job.id, newStatus as any);
            setStatus(newStatus as any);
            toast.success(`Job marked as ${newStatus}`);
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setLoading(false);
        }
    };

    const latestInvoice = job.invoices && job.invoices.length > 0 ? job.invoices[0] : null;

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-gray-300 border-l border-gray-800">
            {/* Header */}
            <div className="p-4 flex justify-between items-center border-b border-gray-800">
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium
                        ${status === 'COMPLETED' ? 'bg-green-900 text-green-300' :
                            status === 'IN_PROGRESS' ? 'bg-blue-900 text-blue-300' :
                                'bg-yellow-900 text-yellow-300'}`}>
                        {status}
                    </span>
                    <button className="p-1 hover:bg-gray-800 rounded">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <Link href={`/jobs/${job.id}`} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm text-white">
                        Open Job
                    </Link>
                    <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Title & Time */}
                <div>
                    <h2 className="text-lg font-bold text-white mb-1">{job.description || "No Description"}</h2>
                    <p className="text-sm text-gray-400">
                        {format(new Date(job.scheduledAt), "EEE MMM do, h:mma")} -
                        {job.scheduledEndAt ? format(new Date(job.scheduledEndAt), "h:mma") : "TBD"}
                    </p>
                    {job.technicians.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white">
                                {job.technicians[0].name?.charAt(0)}
                            </div>
                            <span className="text-sm">{job.technicians.map(t => t.name).join(", ")}</span>
                        </div>
                    )}
                </div>

                {/* Client Info */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <Link href={`/clients/${job.property.clientId}`} className="text-indigo-400 hover:underline font-medium text-base flex items-center gap-2">
                            {job.property.client.name}
                            <span className="text-xs bg-indigo-900/50 px-1.5 py-0.5 rounded text-indigo-300 no-underline">View Profile</span>
                        </Link>
                        <button className="p-1 hover:bg-gray-800 rounded">
                            <Settings className="w-3 h-3" />
                        </button>
                    </div>

                    {job.property.client.email && (
                        <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span>{job.property.client.email}</span>
                        </div>
                    )}
                    {job.property.client.phone && (
                        <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span>{job.property.client.phone}</span>
                            <span className="text-xs bg-gray-800 px-1 rounded">Mobile</span>
                        </div>
                    )}
                </div>

                {/* Address */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-900 text-indigo-300 text-xs rounded">
                            {job.property.address.split(',')[0]}
                        </span>
                    </div>
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.property.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 text-sm text-gray-400 mt-2 hover:text-indigo-400 transition-colors"
                    >
                        <MapPin className="w-4 h-4 mt-0.5 text-gray-500" />
                        <p>{job.property.address}</p>
                    </a>
                </div>

                {/* Invoice */}
                <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                    {latestInvoice ? (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-indigo-400">Invoice #{latestInvoice.id.slice(0, 8)}</span>
                                <FileText className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Total</span>
                                <span>CA${latestInvoice.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-white">
                                <span>Status</span>
                                <span className={latestInvoice.status === 'PAID' ? 'text-green-400' : 'text-yellow-400'}>
                                    {latestInvoice.status}
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">No invoice generated</span>
                            <button className="text-xs bg-indigo-600 px-2 py-1 rounded text-white hover:bg-indigo-700">
                                + Create
                            </button>
                        </div>
                    )}
                </div>

                {/* Status Actions */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase">Change Status</label>
                    <select
                        value={status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="w-full bg-gray-800 border-gray-700 text-white rounded p-2 text-sm"
                        disabled={loading}
                    >
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Activity Timeline */}
            <div className="p-4 border-t border-gray-800">
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">Activity Log</h3>
                <div className="space-y-4">
                    {job.activities && job.activities.length > 0 ? (
                        job.activities.map((activity: any) => (
                            <div key={activity.id} className="flex gap-3">
                                <div className="mt-1">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/10" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-300">
                                        <span className="font-medium text-white">
                                            {activity.user ? activity.user.name : 'System'}
                                        </span>
                                        {' '}
                                        {activity.action === 'STATUS_CHANGE' ? 'changed status' :
                                            activity.action === 'NOTE_ADDED' ? 'added a note' :
                                                activity.action === 'PHOTO_ADDED' ? 'added a photo' :
                                                    activity.action === 'PRODUCT_USED' ? 'recorded product usage' :
                                                        activity.action === 'TECHNICIANS_UPDATED' ? 'updated technicians' :
                                                            'updated job'}
                                    </p>
                                    {activity.details && (
                                        <p className="text-xs text-gray-500 mt-0.5">{activity.details}</p>
                                    )}
                                    <p className="text-[10px] text-gray-600 mt-1">
                                        {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-gray-500 italic">No activity recorded yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
