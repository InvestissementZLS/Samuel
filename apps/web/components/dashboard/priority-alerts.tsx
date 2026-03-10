'use client';

import { useEffect, useState, useTransition } from 'react';
import { getDashboardAlerts, type DashboardAlert, type AlertCategory } from '@/app/actions/alert-actions';
import { useDivision } from '@/components/providers/division-provider';
import { useLanguage } from '@/components/providers/language-provider';
import Link from 'next/link';
import {
    AlertTriangle, Clock, ShieldAlert, FileText, Users,
    ChevronRight, RefreshCw, CheckCircle, X
} from 'lucide-react';

const CATEGORY_META: Record<AlertCategory, { label: string; labelFr: string; icon: React.ElementType; color: string }> = {
    quote: { label: 'Quote', labelFr: 'Devis', icon: FileText, color: 'text-amber-500' },
    warranty: { label: 'Warranty', labelFr: 'Garantie', icon: ShieldAlert, color: 'text-purple-500' },
    visit: { label: 'Visit', labelFr: 'Visite', icon: Clock, color: 'text-blue-500' },
    invoice: { label: 'Invoice', labelFr: 'Facture', icon: AlertTriangle, color: 'text-red-500' },
    client: { label: 'Client', labelFr: 'Client', icon: Users, color: 'text-emerald-500' },
};

const SEVERITY_STYLES = {
    critical: {
        row: 'border-l-4 border-red-400 bg-red-50 hover:bg-red-100/70',
        badge: 'bg-red-100 text-red-700',
        dot: 'bg-red-500',
    },
    warning: {
        row: 'border-l-4 border-amber-400 bg-amber-50 hover:bg-amber-100/70',
        badge: 'bg-amber-100 text-amber-700',
        dot: 'bg-amber-500',
    },
    info: {
        row: 'border-l-4 border-blue-300 bg-blue-50/60 hover:bg-blue-100/50',
        badge: 'bg-blue-100 text-blue-700',
        dot: 'bg-blue-400',
    },
};

// How many items to show per category group
const INITIAL_LIMIT = 5;

export function PriorityAlerts() {
    const { division } = useDivision();
    const { language } = useLanguage();
    const isFr = language === 'fr';

    const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [showAll, setShowAll] = useState(false);
    const [isPending, startTransition] = useTransition();

    const load = () => {
        setLoading(true);
        startTransition(async () => {
            try {
                const data = await getDashboardAlerts(division !== 'ALL' ? division : undefined);
                setAlerts(data);
            } finally {
                setLoading(false);
            }
        });
    };

    useEffect(() => { load(); }, [division]);

    const visible = alerts.filter(a => !dismissed.has(a.id));
    const displayed = showAll ? visible : visible.slice(0, INITIAL_LIMIT);

    const criticalCount = visible.filter(a => a.severity === 'critical').length;
    const warningCount = visible.filter(a => a.severity === 'warning').length;

    if (!loading && visible.length === 0) {
        return (
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{isFr ? 'Tout est à jour — aucune action requise.' : 'All caught up — no actions required.'}</span>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/70">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">
                            {isFr ? 'Actions Prioritaires' : 'Priority Actions'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {loading ? (isFr ? 'Chargement…' : 'Loading…') : (
                                <>
                                    {criticalCount > 0 && <span className="text-red-600 font-medium">{criticalCount} {isFr ? 'critique' : 'critical'}{criticalCount > 1 ? 's' : ''}</span>}
                                    {criticalCount > 0 && warningCount > 0 && ' · '}
                                    {warningCount > 0 && <span className="text-amber-600 font-medium">{warningCount} {isFr ? 'avertissement' : 'warning'}{warningCount > 1 ? 's' : ''}</span>}
                                    {visible.length > 0 && ` · ${visible.length} ${isFr ? 'au total' : 'total'}`}
                                </>
                            )}
                        </p>
                    </div>
                </div>
                <button
                    onClick={load}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title={isFr ? 'Actualiser' : 'Refresh'}
                >
                    <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Alert list */}
            <div className="divide-y divide-gray-100">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3.5 bg-gray-200 rounded w-48" />
                                <div className="h-3 bg-gray-100 rounded w-64" />
                            </div>
                        </div>
                    ))
                ) : (
                    displayed.map(alert => {
                        const meta = CATEGORY_META[alert.category];
                        const Icon = meta.icon;
                        const styles = SEVERITY_STYLES[alert.severity];

                        return (
                            <div
                                key={alert.id}
                                className={`flex items-start gap-3 px-5 py-3.5 transition-colors group ${styles.row}`}
                            >
                                {/* Icon */}
                                <div className={`mt-0.5 shrink-0 ${meta.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-gray-900 truncate">{alert.title}</span>
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${styles.badge}`}>
                                            {isFr ? meta.labelFr : meta.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">{alert.description}</p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    {alert.linkHref && (
                                        <Link
                                            href={alert.linkHref}
                                            className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors opacity-0 group-hover:opacity-100"
                                            title={isFr ? 'Voir' : 'View'}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    )}
                                    <button
                                        onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                                        className="p-1.5 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                                        title={isFr ? 'Ignorer' : 'Dismiss'}
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Show more / less */}
            {!loading && visible.length > INITIAL_LIMIT && (
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        {showAll
                            ? (isFr ? '▲ Réduire' : '▲ Show less')
                            : (isFr ? `▼ Voir ${visible.length - INITIAL_LIMIT} de plus` : `▼ Show ${visible.length - INITIAL_LIMIT} more`)}
                    </button>
                </div>
            )}
        </div>
    );
}
