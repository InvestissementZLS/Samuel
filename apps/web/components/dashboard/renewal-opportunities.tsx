"use client";

import { useEffect, useState } from "react";
import { getRenewalOpportunities, RenewalOpportunity } from "@/app/actions/marketing-actions";
import { useDivision } from "@/components/providers/division-provider";
import { RefreshCw, Mail, CalendarPlus, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/language-provider";
import Link from "next/link";

export function RenewalOpportunitiesWidget() {
    const { division } = useDivision();
    const { language } = useLanguage();
    const isFr = language === "fr";

    const [opportunities, setOpportunities] = useState<RenewalOpportunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadOpportunities();
    }, [division]);

    const loadOpportunities = async () => {
        setIsLoading(true);
        try {
            const data = await getRenewalOpportunities(division as any);
            setOpportunities(data);
        } catch (error) {
            console.error("Failed to load renewal opportunities:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendRenewal = (opp: RenewalOpportunity) => {
        toast.success(
            isFr
                ? `Courriel de renouvellement envoyé à ${opp.client.name}`
                : `Renewal email sent to ${opp.client.name}`
        );
        // Ici, on appellerait une vraie action SendGrid/Resend
    };

    if (isLoading) {
        return (
            <Card className="border-blue-100 shadow-sm animate-pulse">
                <CardHeader className="pb-2">
                    <div className="h-6 w-1/2 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="h-12 bg-gray-100 rounded"></div>
                        <div className="h-12 bg-gray-100 rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (opportunities.length === 0) return null;

    const totalEstimated = opportunities.reduce((acc, opp) => acc + opp.estimatedValue, 0);

    return (
        <Card className="border-blue-200 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
            <CardHeader className="pb-3 border-b border-blue-100/50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                            <span className="p-1.5 bg-blue-100 text-blue-600 rounded-md">
                                <RefreshCw className="h-4 w-4" />
                            </span>
                            {isFr ? "Opportunités de Renouvellement" : "Renewal Opportunities"}
                        </CardTitle>
                        <CardDescription className="text-blue-700/70 mt-1">
                            {isFr
                                ? `${opportunities.length} clients prêts pour leur visite récurrente (Potentiel: ${totalEstimated.toFixed(2)}$)`
                                : `${opportunities.length} clients ready for recurring visit (Potential: $${totalEstimated.toFixed(2)})`}
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                        {isFr ? "Voir tout (Campagnes)" : "View all (Campaigns)"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-4 p-0">
                <div className="divide-y divide-blue-50">
                    {opportunities.slice(0, 5).map((opp, idx) => (
                        <div key={idx} className="p-4 hover:bg-blue-50/50 transition-colors flex items-center justify-between group">
                            <div className="flex-1 min-w-0 mr-4">
                                <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-2">
                                    {opp.client.name}
                                    <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                        {opp.estimatedValue > 0 ? `${opp.estimatedValue.toFixed(2)}$` : '?'}
                                    </span>
                                </p>
                                <p className="text-xs text-gray-500 truncate mt-1">
                                    Dernier service: {opp.lastService}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-100"
                                    onClick={() => handleSendRenewal(opp)}
                                    title={isFr ? "Envoyer un courriel" : "Send email"}
                                >
                                    <Mail className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-gray-500 hover:text-emerald-600 hover:bg-emerald-100"
                                    title={isFr ? "Planifier maintenant" : "Schedule now"}
                                >
                                    <CalendarPlus className="h-4 w-4" />
                                </Button>
                                <Link href={`/clients/${opp.client.id}`}>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900">
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
