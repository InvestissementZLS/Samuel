"use client";

import { useState, useEffect } from "react";
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, ChevronRight } from "lucide-react";
import { generatePlatformInsights } from "@/app/actions/ai-insights-actions";
import { useDivision } from "@/components/providers/division-provider";
import Link from "next/link";

const CACHE_KEY = "jarvis_snapshot_v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

function getCachedSnapshot() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
        return parsed.data as Awaited<ReturnType<typeof generatePlatformInsights>>;
    } catch { return null; }
}

function setCachedSnapshot(data: Awaited<ReturnType<typeof generatePlatformInsights>>) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() }));
    } catch { }
}

export function JarvisWidget() {
    const { division } = useDivision();
    const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof generatePlatformInsights>> | null>(null);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const cached = getCachedSnapshot();
        if (cached) {
            setSnapshot(cached);
        } else {
            runAnalysis();
        }
    }, []);

    const runAnalysis = async () => {
        setLoading(true);
        try {
            const result = await generatePlatformInsights(division as any);
            setSnapshot(result);
            setCachedSnapshot(result);
        } catch (e) {
            console.error("[JarvisWidget]", e);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    const criticalCount = snapshot?.insights.filter(i => i.priority === "CRITIQUE").length ?? 0;
    const importantCount = snapshot?.insights.filter(i => i.priority === "IMPORTANT").length ?? 0;
    const topInsight = snapshot?.insights.find(i => i.priority === "CRITIQUE") ?? snapshot?.insights.find(i => i.priority === "IMPORTANT");

    const scoreColor = !snapshot ? "text-gray-400" :
        snapshot.healthScore >= 75 ? "text-emerald-600" :
            snapshot.healthScore >= 50 ? "text-amber-500" : "text-red-500";

    const scoreBg = !snapshot ? "bg-gray-50 border-gray-200" :
        snapshot.healthScore >= 75 ? "bg-emerald-50 border-emerald-200" :
            snapshot.healthScore >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

    return (
        <div className="rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 flex items-center gap-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                <Sparkles size={22} className="text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {loading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                        <p className="text-xs text-purple-600 font-medium">JARVIS analyse votre business...</p>
                    </div>
                ) : snapshot ? (
                    <>
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Score */}
                            <span className={`text-sm font-black ${scoreColor} border rounded-lg px-2 py-0.5 ${scoreBg}`}>
                                {snapshot.healthScore}/100
                            </span>
                            {criticalCount > 0 && (
                                <span className="flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">
                                    <AlertTriangle size={9} /> {criticalCount} Critique{criticalCount > 1 ? "s" : ""}
                                </span>
                            )}
                            {importantCount > 0 && (
                                <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                    <AlertTriangle size={9} /> {importantCount} Important{importantCount > 1 ? "s" : ""}
                                </span>
                            )}
                            {criticalCount === 0 && importantCount === 0 && (
                                <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                    <CheckCircle size={9} /> Tout va bien
                                </span>
                            )}
                        </div>
                        {topInsight && (
                            <p className="text-[11px] text-gray-600 mt-1 truncate">
                                {topInsight.priority === "CRITIQUE" ? "⚠️" : "💡"} {topInsight.title} — {topInsight.metric || topInsight.action}
                            </p>
                        )}
                        {!topInsight && snapshot.summary && (
                            <p className="text-[11px] text-gray-500 mt-1 truncate">{snapshot.summary}</p>
                        )}
                    </>
                ) : (
                    <div>
                        <p className="text-sm font-semibold text-gray-700">Co-Pilote JARVIS</p>
                        <p className="text-xs text-gray-400 mt-0.5">Analyse intelligente de votre business</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
                {!loading && (
                    <button onClick={runAnalysis} title="Rafraîchir"
                        className="p-1.5 text-purple-400 hover:text-purple-700 transition-colors rounded-lg hover:bg-purple-100">
                        <RefreshCw size={14} />
                    </button>
                )}
                <Link href="/ai-insights"
                    className="flex items-center gap-1 text-xs font-semibold text-purple-700 bg-white border border-purple-200 hover:bg-purple-50 px-3 py-1.5 rounded-xl transition-all shadow-sm">
                    Voir tout <ChevronRight size={12} />
                </Link>
            </div>
        </div>
    );
}
