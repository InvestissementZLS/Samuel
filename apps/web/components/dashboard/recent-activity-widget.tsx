import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { Calendar, CheckCircle, Truck, FileText } from "lucide-react";

export async function RecentActivityWidget() {
    // Fetch last 5 completed jobs
    const recentJobs = await prisma.job.findMany({
        where: {
            status: { in: ['COMPLETED', 'EN_ROUTE', 'IN_PROGRESS'] }
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
            property: { include: { client: true } },
            technicians: true
        }
    });

    if (recentJobs.length === 0) {
        return (
            <div className="text-sm text-gray-500 py-4 text-center">
                Aucune activité récente.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {recentJobs.map((job) => {
                let Icon = Calendar;
                let colorClass = "text-blue-500 bg-blue-50";
                
                if (job.status === 'COMPLETED') {
                    Icon = CheckCircle;
                    colorClass = "text-green-500 bg-green-50";
                } else if (job.status === 'EN_ROUTE') {
                    Icon = Truck;
                    colorClass = "text-orange-500 bg-orange-50";
                } else if (job.status === 'IN_PROGRESS') {
                    Icon = FileText;
                    colorClass = "text-purple-500 bg-purple-50";
                }

                return (
                    <div key={job.id} className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${colorClass}`}>
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">
                                {(job as any).property.client.name}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                                {job.description || "Aucune description"}
                                {(job as any).technicians.length > 0 && ` • Par ${(job as any).technicians[0].name}`}
                            </p>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true, locale: fr })}
                        </div>
                    </div>
                );
            })}
            <div className="pt-2">
                <Link href="/jobs" className="text-sm text-blue-600 hover:underline">
                    Voir tous les jobs →
                </Link>
            </div>
        </div>
    );
}
