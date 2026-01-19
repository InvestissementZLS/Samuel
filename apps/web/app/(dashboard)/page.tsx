import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Calendar, Users, Truck, CheckCircle, Clock } from 'lucide-react';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { WeeklyAuditReminder } from '@/components/inventory/weekly-audit-reminder';
import { InventoryForecast } from '@/components/dashboard/inventory-forecast';
import { InventoryAdminWidget } from '@/components/inventory/inventory-admin-widget';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
    const cookieStore = cookies();
    const userId = cookieStore.get('userId')?.value;

    const user = userId ? await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    }) : null;

    // Fetch summary data for Extermination
    const exoJobs = await prisma.job.count({ where: { division: 'EXTERMINATION' } });
    const exoPendingJobs = await prisma.job.count({ where: { division: 'EXTERMINATION', status: 'PENDING' } });
    const exoClients = await prisma.client.count({ where: { divisions: { has: 'EXTERMINATION' } } });
    const exoRevenue = await prisma.invoice.aggregate({
        where: { division: 'EXTERMINATION', status: 'PAID' },
        _sum: { total: true }
    });

    // Fetch summary data for Entreprises
    const entJobs = await prisma.job.count({ where: { division: 'ENTREPRISES' } });
    const entPendingJobs = await prisma.job.count({ where: { division: 'ENTREPRISES', status: 'PENDING' } });
    const entClients = await prisma.client.count({ where: { divisions: { has: 'ENTREPRISES' } } });
    const entRevenue = await prisma.invoice.aggregate({
        where: { division: 'ENTREPRISES', status: 'PAID' },
        _sum: { total: true }
    });

    const stats = {
        EXTERMINATION: {
            jobs: exoJobs,
            pendingJobs: exoPendingJobs,
            clients: exoClients,
            revenue: exoRevenue._sum.total || 0
        },
        ENTREPRISES: {
            jobs: entJobs,
            pendingJobs: entPendingJobs,
            clients: entClients,
            revenue: entRevenue._sum.total || 0
        }
    };

    return (
        <div className="space-y-6">
            {userId && <WeeklyAuditReminder userId={userId} />}

            {/* Smart Inventory Widgets (New) */}
            {user?.role === 'TECHNICIAN' && userId && (
                <InventoryForecast userId={userId} />
            )}

            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                <InventoryAdminWidget />
            )}

            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            </div>

            <DashboardStats stats={stats} />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-semibold leading-none tracking-tight">Recent Activity</h3>
                        <p className="text-sm text-muted-foreground">
                            Latest actions in the system.
                        </p>
                    </div>
                    <div className="p-6 pt-0">
                        <div className="text-sm text-gray-500">
                            No recent activity to show.
                        </div>
                    </div>
                </div>
                <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <h3 className="font-semibold leading-none tracking-tight">Quick Actions</h3>
                    </div>
                    <div className="p-6 pt-0 space-y-2">
                        <Link href="/jobs/new" className="block w-full rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
                            Create New Job
                        </Link>
                        <Link href="/clients" className="block w-full rounded-md bg-secondary px-3 py-2 text-center text-sm font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/80">
                            Manage Clients
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
