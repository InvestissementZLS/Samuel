"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import Link from "next/link";

const CACHE_KEY = "jarvis_snapshot_v1";
const BANNER_DISMISS_KEY = "jarvis_banner_dismissed_v1";

interface Insight {
    id: string;
    priority: string;
    title: string;
    metric?: string;
    actionUrl?: string;
}

export function JarvisAlertBanner() {
    const [criticals, setCriticals] = useState<Insight[]>([]);
    const [dismissed, setDismissed] = useState(true); // start hidden
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            const allInsights: Insight[] = parsed?.data?.insights || [];
            const crits = allInsights.filter(i => i.priority === "CRITIQUE");
            if (crits.length === 0) return;

            // Check if this banner was dismissed for today
            const dismissKey = `${BANNER_DISMISS_KEY}_${new Date().toDateString()}`;
            const wasDismissed = localStorage.getItem(dismissKey) === "true";
            if (!wasDismissed) {
                setCriticals(crits);
                setDismissed(false);
            }
        } catch { }
    }, []);

    const dismiss = () => {
        setDismissed(true);
        try {
            const dismissKey = `${BANNER_DISMISS_KEY}_${new Date().toDateString()}`;
            localStorage.setItem(dismissKey, "true");
        } catch { }
    };

    if (!mounted || dismissed || criticals.length === 0) return null;

    const top = criticals[0];

    return (
        <div className="bg-red-600 text-white px-4 py-2.5 flex items-center gap-3 text-sm shrink-0">
            <AlertTriangle size={16} className="shrink-0 animate-pulse" />
            <span className="flex-1 font-medium truncate">
                ⚠️ JARVIS: {top.title}{top.metric ? ` — ${top.metric}` : ""}
                {criticals.length > 1 ? ` (+${criticals.length - 1} autre${criticals.length > 2 ? "s" : ""})` : ""}
            </span>
            {top.actionUrl && (
                <Link href={top.actionUrl} className="font-bold underline underline-offset-2 hover:text-red-200 shrink-0 text-xs">
                    Voir →
                </Link>
            )}
            <Link href="/ai-insights" className="font-bold underline underline-offset-2 hover:text-red-200 shrink-0 text-xs">
                Co-Pilote
            </Link>
            <button onClick={dismiss} className="text-white/70 hover:text-white shrink-0 ml-1">
                <X size={16} />
            </button>
        </div>
    );
}
