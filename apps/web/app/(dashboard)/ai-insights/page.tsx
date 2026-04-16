"use client";

import { useState, useTransition, useEffect } from "react";
import { generatePlatformInsights, AIInsight, InsightCategory, InsightPriority } from "@/app/actions/ai-insights-actions";
import { useDivision } from "@/components/providers/division-provider";
import Link from "next/link";
import {
    Sparkles, RefreshCw, TrendingUp, Users, Calendar, Zap, Repeat, UserCheck,
    AlertTriangle, Info, ChevronRight, CheckCircle, Activity
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const categoryConfig: Record<InsightCategory, { label: string; icon: any; color: string; bg: string }> = {
    REVENU:      { label: "Revenu",     icon: TrendingUp,  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
    CLIENT:      { label: "Clients",    icon: Users,       color: "text-blue-600",    bg: "bg-blue-50 border-blue-200" },
    CALENDRIER:  { label: "Calendrier", icon: Calendar,    color: "text-violet-600",  bg: "bg-violet-50 border-violet-200" },
    WORKFLOW:    { label: "Workflow",   icon: Zap,         color: "text-amber-600",   bg: "bg-amber-50 border-amber-200" },
    TECHNICIEN:  { label: "Équipe",     icon: UserCheck,   color: "text-cyan-600",    bg: "bg-cyan-50 border-cyan-200" },
    RÉCURRENT:   { label: "Récurrent",  icon: Repeat,      color: "text-purple-600",  bg: "bg-purple-50 border-purple-200" },
};

const priorityConfig: Record<InsightPriority, { label: string; icon: any; badge: string }> = {
    CRITIQUE:  { label: "Critique",  icon: AlertTriangle, badge: "bg-red-100 text-red-700 border border-red-200" },
    IMPORTANT: { label: "Important", icon: AlertTriangle, badge: "bg-amber-100 text-amber-700 border border-amber-200" },
    INFO:      { label: "Info",      icon: Info,          badge: "bg-gray-100 text-gray-600 border border-gray-200" },
};

function HealthGauge({ score }: { score: number }) {
    const color = score >= 75 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-500";
    const label = score >= 75 ? "En santé" : score >= 50 ? "Attention requise" : "Action urgente";
    const circumference = 2 * Math.PI * 40;
    const strokeDash = ((score / 100) * circumference).toFixed(1);

    return (
        <div className="flex flex-col items-center gap-1">
            <svg width="96" height="96" className="-rotate-90">
                <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                    cx="48" cy="48" r="40" fill="none"
                    stroke={score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                    className="transition-all duration-1000"
                />
            </svg>
            <div className="text-center -mt-[72px] mb-[48px]">
                <p className={`text-2xl font-black ${color}`}>{score}</p>
                <p className="text-[10px] text-gray-400 font-medium">/100</p>
            </div>
            <p className={`text-xs font-semibold ${color} mt-1`}>{label}</p>
        </div>
    );
}

function InsightCard({ insight }: { insight: AIInsight }) {
    const cat = categoryConfig[insight.category];
    const pri = priorityConfig[insight.priority];
    const CatIcon = cat.icon;
    const PriIcon = pri.icon;

    return (
        <div className={`border rounded-xl p-4 ${cat.bg} transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`p-1.5 rounded-lg bg-white/70 ${cat.color} shrink-0`}>
                        <CatIcon size={15} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-gray-800">{insight.title}</h3>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pri.badge} flex items-center gap-1`}>
                                <PriIcon size={9} />
                                {pri.label}
                            </span>
                        </div>
                        {insight.metric && (
                            <p className={`text-base font-black ${cat.color} mt-0.5`}>{insight.metric}</p>
                        )}
                    </div>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/70 ${cat.color} shrink-0`}>
                    {cat.label}
                </span>
            </div>

            <p className="text-xs text-gray-600 mt-2 leading-relaxed">{insight.description}</p>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/50">
                <p className="text-xs font-medium text-gray-700 italic">→ {insight.action}</p>
                {insight.actionUrl && (
                    <Link
                        href={insight.actionUrl}
                        className={`flex items-center gap-1 text-xs font-semibold ${cat.color} hover:underline shrink-0 ml-2`}
                    >
                        Aller <ChevronRight size={12} />
                    </Link>
                )}
            </div>
        </div>
    );
}

export default function AIInsightsPage() {
    const { division } = useDivision();
    const [isPending, startTransition] = useTransition();
    const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof generatePlatformInsights>> | null>(null);
    const [lastGenerated, setLastGenerated] = useState<string | null>(null);
    const [fromCache, setFromCache] = useState(false);

    // Auto-load on mount (from cache or fresh)
    useEffect(() => {
        try {
            const raw = localStorage.getItem('jarvis_snapshot_v1');
            if (raw) {
                const parsed = JSON.parse(raw);
                const age = Date.now() - parsed.cachedAt;
                if (age < 60 * 60 * 1000) { // 1h cache valid
                    setSnapshot(parsed.data);
                    setLastGenerated(new Date(parsed.cachedAt).toISOString());
                    setFromCache(true);
                    return;
                }
            }
        } catch { }
        // No valid cache — auto-generate
        handleGenerate();
    }, []);

    const handleGenerate = () => {
        setFromCache(false);
        startTransition(async () => {
            try {
                const result = await generatePlatformInsights(division as any);
                setSnapshot(result);
                setLastGenerated(new Date().toISOString());
                // Update cache
                try { localStorage.setItem('jarvis_snapshot_v1', JSON.stringify({ data: result, cachedAt: Date.now() })); } catch { }
            } catch (e) {
                console.error(e);
            }
        });
    };

    const criticalCount = snapshot?.insights.filter(i => i.priority === 'CRITIQUE').length || 0;
    const importantCount = snapshot?.insights.filter(i => i.priority === 'IMPORTANT').length || 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Sparkles className="text-purple-500" size={24} />
                        Co-Pilote IA
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Analyse intelligente de votre plateforme Praxis ZLS · Division: <strong>{division || "Toutes"}</strong>
                    </p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isPending}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow transition-all disabled:opacity-60"
                >
                    <RefreshCw size={16} className={isPending ? "animate-spin" : ""} />
                    {isPending ? "Analyse en cours..." : snapshot ? "Réanalyser" : "Lancer l'analyse"}
                </button>
            </div>

            {/* Loading State */}
            {isPending && (
                <div className="border border-purple-200 bg-purple-50 rounded-2xl p-10 flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                        <Sparkles className="absolute inset-0 m-auto text-purple-500" size={20} />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-purple-800">GPT-4o analyse votre plateforme...</p>
                        <p className="text-sm text-purple-600 mt-1">Collecte des métriques · Analyse des tendances · Génération des recommandations</p>
                    </div>
                </div>
            )}

            {/* Initial State */}
            {!isPending && !snapshot && (
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
                    <div className="p-4 bg-purple-50 rounded-full">
                        <Activity className="text-purple-400" size={32} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-700">Prêt à analyser votre plateforme</h3>
                        <p className="text-sm text-gray-400 mt-1 max-w-sm">
                            Le Co-Pilote IA va scanner vos données en temps réel (clients, jobs, factures, techniciens) et vous apporter des recommandations précises.
                        </p>
                    </div>
                    <button
                        onClick={handleGenerate}
                        className="mt-2 flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                        <Sparkles size={16} />
                        Analyser maintenant
                    </button>
                </div>
            )}

            {/* Results */}
            {!isPending && snapshot && (
                <div className="space-y-6">
                    {/* Summary Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Health Score */}
                        <div className="bg-white border rounded-2xl p-4 flex flex-col items-center">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Score de Santé</p>
                            <HealthGauge score={snapshot.healthScore} />
                        </div>

                        {/* Issue Count */}
                        <div className="bg-white border rounded-2xl p-4 flex flex-col justify-center gap-3 col-span-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Résumé Exécutif</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{snapshot.summary}</p>
                            <div className="flex gap-3 mt-1">
                                {criticalCount > 0 && (
                                    <span className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                                        <AlertTriangle size={11} /> {criticalCount} Critique{criticalCount > 1 ? 's' : ''}
                                    </span>
                                )}
                                {importantCount > 0 && (
                                    <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                                        <AlertTriangle size={11} /> {importantCount} Important{importantCount > 1 ? 's' : ''}
                                    </span>
                                )}
                                {criticalCount === 0 && importantCount === 0 && (
                                    <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
                                        <CheckCircle size={11} /> Tout va bien !
                                    </span>
                                )}
                                <span className="text-xs text-gray-400 ml-auto self-center">
                                    {snapshot.insights.length} recommandations
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Insights — Critical first */}
                    <div className="space-y-3">
                        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Recommandations</h2>
                        {['CRITIQUE', 'IMPORTANT', 'INFO'].map(prio =>
                            snapshot.insights
                                .filter(i => i.priority === prio)
                                .map(insight => <InsightCard key={insight.id} insight={insight} />)
                        )}
                    </div>

                    {/* Footer */}
                    {lastGenerated && (
                        <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-2">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${fromCache ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                            {fromCache ? '💾 Depuis le cache · ' : '🔴 Live · '}
                            {format(new Date(lastGenerated), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                            {" · "}
                            <button onClick={handleGenerate} className="underline hover:text-gray-600">Forcer réanalyse</button>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
