"use client";

import { useEffect, useState } from "react";
import { generateAIInsights, executeAIAction, AIInsight } from "@/app/actions/ai-actions";
import { useDivision } from "@/components/providers/division-provider";
import { Sparkles, CheckCircle2, Bot, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/components/providers/language-provider";

export function AIAssistantWidget() {
    const { division } = useDivision();
    const { language } = useLanguage();
    const isFr = language === "fr";

    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [executingId, setExecutingId] = useState<string | null>(null);
    const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);

    useEffect(() => {
        loadInsights();
    }, [division]);

    const loadInsights = async () => {
        setIsLoading(true);
        try {
            const data = await generateAIInsights(division as any);
            setInsights(data);
        } catch (error) {
            console.error("Failed to load AI insights:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (insight: AIInsight) => {
        setExecutingId(insight.id);
        try {
            const res = await executeAIAction(insight.id, insight.type, insight.data);
            if (res.success) {
                toast.success(
                    isFr
                        ? `Mission accomplie: ${insight.type === 'RECOVERY' ? 'Les liens Square ont été envoyés' : 'L\'action a été traitée avec succès'}.`
                        : "Mission accomplished."
                );
                // Retirer l'insight accompli de la liste
                setInsights(prev => prev.filter(i => i.id !== insight.id));
                setSelectedInsight(null);
            }
        } catch (error) {
            toast.error(isFr ? "Échec de l'action IA." : "AI Action failed.");
        } finally {
            setExecutingId(null);
        }
    };

    // Rendu dynamique du contenu de prévisualisation selon le type d'action
    const renderActionPreview = (insight: AIInsight) => {
        if (insight.type === 'RECOVERY') {
            return (
                <div className="space-y-4 text-sm mt-4">
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-lg">
                        <h4 className="font-semibold text-rose-900 mb-2">📋 L'Action Proposée :</h4>
                        <ul className="list-disc list-inside text-rose-800 space-y-1">
                            <li>Envoi d'un courriel de rappel poli à <strong>{insight.data.count} clients</strong>.</li>
                            <li>Génération automatique de liens de paiement <strong>Square</strong> pour chaque facture.</li>
                            <li>Récupération potentielle : <strong>{insight.data.totalDue.toFixed(2)}$</strong></li>
                        </ul>
                    </div>
                    <div className="bg-gray-50 border p-4 rounded-lg text-gray-600">
                        <p className="font-semibold mb-1 text-gray-800">Aperçu du courriel :</p>
                        <p className="italic">"Bonjour [Client], notre système indique un solde de [Montant]$ toujours en attente concernant les services d'ExterminationZLS. Vous pouvez régler cette facture facilement via le lien Square sécurisé ci-dessous. Merci de votre confiance."</p>
                    </div>
                </div>
            );
        }

        if (insight.type === 'RENEWAL') {
            return (
                <div className="space-y-4 text-sm mt-4">
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg">
                        <h4 className="font-semibold text-amber-900 mb-2">📋 L'Action Proposée :</h4>
                        <ul className="list-disc list-inside text-amber-800 space-y-1">
                            <li>Ciblage de <strong>{insight.data.count} clients</strong> ayant eu un service récurrent l'an dernier.</li>
                            <li>Création de brouillons de devis (Estimates) dans Praxis pré-remplis avec leurs tarifs historiques.</li>
                        </ul>
                    </div>
                    <div className="bg-gray-50 border p-4 rounded-lg text-gray-600">
                        <p className="font-semibold mb-1 text-gray-800">Aperçu du courriel :</p>
                        <p className="italic">"Bonjour [Client], le printemps approche et c'reparti pour la saison des insectes! L'an dernier vous aviez opté pour notre traitement de protection. Voici une proposition de renouvellement pour cette saison."</p>
                    </div>
                </div>
            );
        }

        if (insight.type === 'INVENTORY_ALERT') {
            return (
                <div className="space-y-4 text-sm mt-4">
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg">
                        <h4 className="font-semibold text-orange-900 mb-2">📋 L'Action Proposée :</h4>
                        <ul className="list-disc list-inside text-orange-800 space-y-1">
                            <li><strong>{insight.data.count} produit(s)</strong> sont sous le seuil critique.</li>
                            <li>Je vais générer un <strong>bon de commande</strong> listant les quantités à réapprovisionner.</li>
                        </ul>
                    </div>
                    <div className="bg-gray-50 border p-4 rounded-lg">
                        <p className="font-semibold mb-2 text-gray-800">Produits en stock critique :</p>
                        <div className="space-y-1">
                            {insight.data.items?.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between text-gray-700">
                                    <span>{item.name}</span>
                                    <span className="font-bold text-orange-600">{item.qty} unités</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-4 bg-gray-50 rounded-lg mt-4 text-sm">
                Je vais procéder à l'exécution de cette tâche : {insight.title}.
            </div>
        );
    };

    if (isLoading) {
        return (
            <Card className="border-indigo-100 shadow-xl overflow-hidden animate-pulse">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/20"></div>
                    <div className="h-6 w-1/3 bg-white/20 rounded"></div>
                </div>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div className="h-16 bg-gray-100 rounded-xl"></div>
                        <div className="h-16 bg-gray-100 rounded-xl"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (insights.length === 0) {
        return (
            <Card className="border-emerald-200 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-50" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight flex items-center gap-2">
                                Praxis AI <Sparkles className="w-4 h-4 text-yellow-300" />
                            </h2>
                            <p className="text-emerald-100 text-xs">
                                {isFr ? "Directeur des Opérations Virtuel" : "Virtual Operations Director"}
                            </p>
                        </div>
                    </div>
                    <div className="text-xs font-medium bg-emerald-900/50 px-3 py-1 rounded-full border border-emerald-500/30">
                        {isFr ? "Actif & À l'écoute" : "Active & Monitoring"}
                    </div>
                </div>
                <CardContent className="p-6 bg-emerald-50/30 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                        <Bot className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="text-emerald-900 font-semibold text-lg">
                        {isFr ? "Opérations Optimisées" : "Operations Optimized"}
                    </h3>
                    <p className="text-emerald-700/80 text-sm max-w-sm">
                        {isFr
                            ? "Je surveille activement votre inventaire, votre facturation et votre rentabilité. Aucune action urgente n'est requise pour le moment."
                            : "I am actively monitoring your inventory, billing, and profitability. No urgent tasks require your attention right now."}
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-indigo-200 shadow-xl overflow-hidden">
            {/* Header Master IA */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                        <Bot className="w-5 h-5 text-indigo-50" />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg leading-tight flex items-center gap-2">
                            Praxis AI <Sparkles className="w-4 h-4 text-yellow-300" />
                        </h2>
                        <p className="text-indigo-100 text-xs">
                            {isFr ? "Directeur des Opérations Virtuel" : "Virtual Operations Director"}
                        </p>
                    </div>
                </div>
                <div className="text-xs font-medium bg-indigo-900/50 px-3 py-1 rounded-full border border-indigo-500/30">
                    {insights.length} {isFr ? "missions détectées" : "tasks detected"}
                </div>
            </div>

            {/* Conversation Area */}
            <CardContent className="p-0 bg-indigo-50/30">
                <div className="divide-y divide-indigo-100 max-h-[400px] overflow-y-auto">
                    {insights.map((insight) => (
                        <div key={insight.id} className="p-5 hover:bg-white transition-colors duration-200">
                            {/* AI Message Bubble */}
                            <div className="flex items-start gap-3">
                                <div className="mt-1">
                                    {insight.priority === 'HIGH' && <AlertTriangle className="w-5 h-5 text-rose-500" />}
                                    {insight.priority === 'MEDIUM' && <Sparkles className="w-5 h-5 text-amber-500" />}
                                    {insight.priority === 'LOW' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-gray-900 font-semibold mb-1">{insight.title}</h4>
                                    <div className="bg-white border shadow-sm rounded-2xl rounded-tl-none p-3 text-sm text-gray-700 leading-relaxed max-w-[95%]">
                                        {insight.description}
                                    </div>

                                    {/* Action Button */}
                                    <div className="mt-3 flex justify-end">
                                        <Button
                                            size="sm"
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all group"
                                            onClick={() => setSelectedInsight(insight)}
                                        >
                                            {isFr ? "Comment ça marche ?" : "Preview Action"}
                                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>

            {/* Action Preview Dialog */}
            <Dialog open={!!selectedInsight} onOpenChange={(open) => !open && setSelectedInsight(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-indigo-900">
                            <Bot className="w-5 h-5 text-indigo-600" />
                            {isFr ? "Mon Plan d'Action" : "My Action Plan"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedInsight?.title}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedInsight && renderActionPreview(selectedInsight)}

                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setSelectedInsight(null)} disabled={!!executingId}>
                            {isFr ? "Annuler" : "Cancel"}
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            disabled={!!executingId || !selectedInsight}
                            onClick={() => selectedInsight && handleAction(selectedInsight)}
                        >
                            {executingId ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isFr ? "Exécution..." : "Executing..."}</>
                            ) : (
                                selectedInsight?.actionLabel || "Confirmer"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
