import { prisma } from '@/lib/prisma';
import { EditJobForm } from '@/components/jobs/edit-job-form';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function NewJobPage() {
    const clients = await prisma.client.findMany({
        include: { properties: true },
        orderBy: { name: 'asc' }
    });

    const technicians = await prisma.user.findMany({
        where: { role: 'TECHNICIAN', isActive: true },
        orderBy: { name: 'asc' }
    });

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8">
            <div className="mb-6">
                <Link href="/jobs" className="text-sm text-gray-500 hover:text-gray-900 flex items-center mb-2">
                    <ChevronLeft size={16} className="mr-1" />
                    Back to Jobs
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Create New Work Order</h1>
                <p className="text-gray-500 text-sm">Create a job, add a new client if needed, and assign technicians.</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <EditJobForm
                    clients={clients}
                    technicians={technicians}
                // For success redirect, the form actions (createCalendarJob) already revalidate.
                // But we might want to redirect to /jobs or the new job ID.
                // For now, let the user decide logic (in form it calls onSuccess).
                // We'll update EditJobForm to optionally redirect? 
                // Or wrapper:
                />
            </div>
        </div>
    );
}
