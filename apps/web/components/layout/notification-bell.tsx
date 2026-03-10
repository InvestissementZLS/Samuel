'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { getDashboardAlerts, type DashboardAlert } from '@/app/actions/alert-actions';
import { useDivision } from '@/components/providers/division-provider';
import { useLanguage } from '@/components/providers/language-provider';
import Link from 'next/link';
import { Bell, X, ChevronRight, AlertTriangle, ShieldAlert, Clock, FileText, Users } from 'lucide-react';
import { createPortal } from 'react-dom';

const CATEGORY_ICONS = {
    quote: FileText,
    warranty: ShieldAlert,
    visit: Clock,
    invoice: AlertTriangle,
    client: Users,
};

const SEVERITY_DOT = {
    critical: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-400',
};

const SEVERITY_ITEM = {
    critical: 'border-l-2 border-red-400',
    warning: 'border-l-2 border-amber-400',
    info: 'border-l-2 border-blue-300',
};

export function NotificationBell() {
    const { division } = useDivision();
    const { language } = useLanguage();
    const isFr = language === 'fr';

    const [open, setOpen] = useState(false);
    const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
    // ⚠️ Initialize dismissed lazily in a useEffect to avoid SSR crash
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [loaded, setLoaded] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [mounted, setMounted] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelPos, setPanelPos] = useState<{ top?: number; bottom?: number; left: number }>({ top: 0, left: 0 });

    // Load dismissed from localStorage after mount (safe from SSR)
    useEffect(() => {
        setMounted(true);
        try {
            const stored = localStorage.getItem('dismissed_alerts');
            if (stored) setDismissed(new Set(JSON.parse(stored)));
        } catch { }
    }, []);

    const load = () => {
        startTransition(async () => {
            try {
                const data = await getDashboardAlerts(division !== 'ALL' ? division : undefined);
                setAlerts(data);
            } finally {
                setLoaded(true);
            }
        });
    };

    useEffect(() => { load(); }, [division]);

    // Calculate panel position relative to button when opening
    const handleToggle = () => {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const left = Math.max(8, Math.min(window.innerWidth - 400, rect.left));

            if (spaceBelow < 400 && spaceAbove > spaceBelow) {
                // Open upwards
                setPanelPos({
                    top: undefined,
                    bottom: window.innerHeight - rect.top + 8,
                    left
                });
            } else {
                // Open downwards
                setPanelPos({
                    top: rect.bottom + 8,
                    bottom: undefined,
                    left
                });
            }
        }
        setOpen(prev => !prev);
    };

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            const clickedButton = buttonRef.current?.contains(target);
            const clickedPanel = panelRef.current?.contains(target);
            if (!clickedButton && !clickedPanel) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const dismiss = (id: string) => {
        setDismissed(prev => {
            const next = new Set([...prev, id]);
            try { localStorage.setItem('dismissed_alerts', JSON.stringify([...next])); } catch { }
            return next;
        });
    };

    const visible = alerts.filter(a => !dismissed.has(a.id));
    const critical = visible.filter(a => a.severity === 'critical').length;
    const hasNew = visible.length > 0;

    if (!mounted) return null;

    const panel = open ? (
        <div
            ref={panelRef}
            style={{
                position: 'fixed',
                ...(panelPos.top !== undefined ? { top: panelPos.top } : {}),
                ...(panelPos.bottom !== undefined ? { bottom: panelPos.bottom } : {}),
                left: panelPos.left,
                width: 384,
                maxWidth: 'calc(100vw - 16px)',
                maxHeight: '80vh',
                zIndex: 9999,
            }}
            className="rounded-xl border border-gray-200 bg-white shadow-2xl flex flex-col overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
                <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-gray-800">
                        {isFr ? 'Alertes' : 'Alerts'}
                    </span>
                    {hasNew && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">
                            {visible.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setOpen(false)}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Alert list */}
            <div className="overflow-y-auto divide-y divide-gray-50 flex-1">
                {!loaded || isPending ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex gap-3 px-4 py-3 animate-pulse">
                            <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
                            <div className="flex-1 space-y-1.5 pt-0.5">
                                <div className="h-3 bg-gray-200 rounded w-40" />
                                <div className="h-2.5 bg-gray-100 rounded w-52" />
                            </div>
                        </div>
                    ))
                ) : visible.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Bell className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-sm">{isFr ? 'Aucune alerte active' : 'No active alerts'}</p>
                    </div>
                ) : (
                    visible.slice(0, 20).map(alert => {
                        const content = (
                            <>
                                <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${SEVERITY_DOT[alert.severity]}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-900 truncate">{alert.title}</p>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">{alert.description}</p>
                                </div>
                            </>
                        );

                        return (
                            <div
                                key={alert.id}
                                className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group relative ${SEVERITY_ITEM[alert.severity]}`}
                            >
                                {alert.linkHref ? (
                                    <Link
                                        href={alert.linkHref}
                                        onClick={() => setOpen(false)}
                                        className="flex items-start gap-3 flex-1 min-w-0"
                                    >
                                        {content}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <div className="p-1 rounded text-gray-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        {content}
                                    </div>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dismiss(alert.id);
                                    }}
                                    className="p-1 rounded text-gray-200 hover:text-gray-500 hover:bg-gray-100 transition-colors z-10"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            {visible.length > 0 && (
                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                    <button
                        onClick={() => {
                            const ids = visible.map(a => a.id);
                            setDismissed(prev => {
                                const next = new Set([...prev, ...ids]);
                                try { localStorage.setItem('dismissed_alerts', JSON.stringify([...next])); } catch { }
                                return next;
                            });
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                    >
                        {isFr ? 'Tout ignorer' : 'Dismiss all'}
                    </button>
                    <button onClick={load} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                        {isFr ? 'Actualiser' : 'Refresh'}
                    </button>
                </div>
            )}
        </div>
    ) : null;

    return (
        <>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                className="relative p-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="Notifications"
            >
                <Bell className={`w-5 h-5 ${open ? 'text-white' : ''}`} />
                {hasNew && (
                    <span className={`
                        absolute top-1 right-1 flex h-4 w-4 items-center justify-center
                        rounded-full text-[10px] font-bold text-white
                        ${critical > 0 ? 'bg-red-500' : 'bg-amber-500'}
                    `}>
                        {visible.length > 9 ? '9+' : visible.length}
                    </span>
                )}
            </button>

            {/* Portal: renders outside sidebar to avoid overflow:hidden clipping */}
            {typeof document !== 'undefined' && createPortal(panel, document.body)}
        </>
    );
}
