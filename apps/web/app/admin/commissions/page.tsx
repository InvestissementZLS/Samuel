"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, CheckCircle, RefreshCcw, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Commission {
    id: string;
    amount: number;
    baseAmount: number;
    percentage: number;
    status: "PENDING" | "PAID";
    createdAt: string;
    user: {
        name: string;
        email: string;
    };
    job: {
        property: {
            client: { name: string }
        }
    };
}

export default function CommissionsPage() {
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [summary, setSummary] = useState({ pending: 0, paid: 0 });
    const [loading, setLoading] = useState(true);
    const [markingPaid, setMarkingPaid] = useState<string | null>(null);

    const fetchCommissions = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/commissions");
            const data = await res.json();
            setCommissions(data.items);
            setSummary(data.summary);
        } catch (error) {
            console.error("Failed to load", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCommissions();
    }, []);

    const handleMarkPaid = async (id: string) => {
        setMarkingPaid(id);
        try {
            await fetch("/api/commissions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: "PAID" })
            });
            await fetchCommissions(); // Refresh
        } catch (e) {
            alert("Failed to update");
        } finally {
            setMarkingPaid(null);
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Commissions 💰</h2>
                <div className="flex items-center space-x-2">
                    <Button onClick={fetchCommissions} variant="outline" size="sm">
                        <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">${summary.pending?.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">To be paid to technicians</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid (All Time)</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">${summary.paid?.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">processed payouts</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Recent Commissions</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Technician</TableHead>
                                    <TableHead>Client / Job</TableHead>
                                    <TableHead>Sale Amount</TableHead>
                                    <TableHead>Comm. %</TableHead>
                                    <TableHead>Earning</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {commissions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                            No commissions found.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {commissions.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell>{format(new Date(c.createdAt), "MMM d, yyyy")}</TableCell>
                                        <TableCell className="font-medium">
                                            {c.user?.name || c.user?.email}
                                        </TableCell>
                                        <TableCell>
                                            {c.job?.property?.client?.name}
                                        </TableCell>
                                        <TableCell>${c.baseAmount.toFixed(2)}</TableCell>
                                        <TableCell>{c.percentage}%</TableCell>
                                        <TableCell className="font-bold text-green-600">
                                            ${c.amount.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={c.status === "PAID" ? "default" : "secondary"} className={c.status === "PAID" ? "bg-green-500" : "bg-yellow-500"}>
                                                {c.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {c.status === 'PENDING' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleMarkPaid(c.id)}
                                                    disabled={markingPaid === c.id}
                                                >
                                                    {markingPaid === c.id ? "Processing..." : "Mark Paid"}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
