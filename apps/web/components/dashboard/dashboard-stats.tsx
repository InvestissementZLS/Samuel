"use client";

import { Calendar, Users, Truck, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardStatsProps {
    stats: {
        EXTERMINATION: {
            jobs: number;
            pendingJobs: number;
            clients: number;
            revenue: number;
        };
        ENTREPRISES: {
            jobs: number;
            pendingJobs: number;
            clients: number;
            revenue: number;
        };
    };
}

import { useDivision } from "@/components/providers/division-provider";

export function DashboardStats({ stats }: DashboardStatsProps) {
    const { division, setDivision } = useDivision();

    const currentStats = stats[division];

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Tabs value={division} onValueChange={(v) => setDivision(v as any)} className="w-full md:w-[400px]">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="EXTERMINATION">Extermination ZLS</TabsTrigger>
                        <TabsTrigger value="ENTREPRISES">Les Entreprises ZLS</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{currentStats.jobs}</div>
                        <p className="text-xs text-muted-foreground">
                            {currentStats.pendingJobs} pending
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{currentStats.clients}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue (Est.)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${currentStats.revenue.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Technicians</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                        <p className="text-xs text-muted-foreground">Shared Resource</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
