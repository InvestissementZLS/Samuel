"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Brain, Mic, Send, X, AlertTriangle, MessageSquare, RefreshCw, ChevronRight, CheckCircle2, UserPen, AlertCircle } from "lucide-react";
import { QuickCallDialog } from "./quick-call-dialog";
import { askJarvis } from "@/app/actions/jarvis-chat-action";
import { executeClientUpdate, WriteIntent, FoundClient, UpdatableClientField } from "@/app/actions/jarvis-update-action";
import { generatePlatformInsights, AIInsight, InsightPriority } from "@/app/actions/ai-insights-actions";
import { useDivision } from "./providers/division-provider";
import Link from "next/link";
import { toast } from "sonner";

const CACHE_KEY = "jarvis_snapshot_v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type Tab = "quickcall" | "alerts" | "chat";

interface CachedSnapshot {
    data: Awaited<ReturnType<typeof generatePlatformInsights>>;
    cachedAt: number;
}

function getCachedSnapshot(): CachedSnapshot | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed: CachedSnapshot = JSON.parse(raw);
        if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
        return parsed;
    } catch { return null; }
}

function setCachedSnapshot(data: Awaited<ReturnType<typeof generatePlatformInsights>>) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() }));
    } catch { /* ignore */ }
}

const priorityConfig: Record<InsightPriority, { badge: string; dot: string }> = {
    CRITIQUE: { badge: "bg-red-100 text-red-700 border border-red-200", dot: "bg-red-500" },
    IMPORTANT: { badge: "bg-amber-100 text-amber-700 border border-amber-200", dot: "bg-amber-400" },
    INFO: { badge: "bg-gray-100 text-gray-600 border border-gray-200", dot: "bg-gray-400" },
};

// ── Message Types ──────────────────────────────────────────────────
interface TextMessage {
    role: "user" | "jarvis";
    content: string;
    loading?: boolean;
}

interface WriteConfirmMessage {
    role: "jarvis";
    type: "write_confirm";
    intent: WriteIntent;
}

type ChatMessage = TextMessage | WriteConfirmMessage;

const SUGGESTED_QUESTIONS = [
    "Quels clients n'ont pas payé?",
    "Jobs sans technicien cette semaine?",
    "Ajoute le email test@gmail.com pour Tremblay",
    "Change le téléphone de Bergeron à 514-555-4321",
];

// ── Write Confirmation Card ────────────────────────────────────────
function WriteConfirmCard({ intent, onConfirm, onCancel }: {
    intent: WriteIntent;
    onConfirm: (clientId: string, clientName: string) => void;
    onCancel: () => void;
}) {
    const [selectedClientId, setSelectedClientId] = useState<string | null>(
        intent.candidates.length === 1 ? intent.candidates[0].id : null
    );
    const [confirming, setConfirming] = useState(false);

    const selectedClient = intent.candidates.find(c => c.id === selectedClientId);

    const handleConfirm = async () => {
        if (!selectedClientId || !selectedClient) return;
        setConfirming(true);
        const result = await executeClientUpdate(selectedClientId, intent.field, intent.value);
        setConfirming(false);
        if (result.success) {
            toast.success(`✅ ${intent.fieldLabel} de ${result.clientName} mis à jour !`);
            onConfirm(selectedClientId, result.clientName);
        } else {
            toast.error(result.error || "Erreur lors de la mise à jour.");
        }
    };

    if (intent.candidates.length === 0) {
        return (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
                <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={14} className="text-amber-600 shrink-0" />
                    <p className="font-bold text-amber-800">Aucun client trouvé</p>
                </div>
                <p className="text-amber-700">Aucun client correspondant à <strong>"{intent.clientSearch}"</strong>.</p>
                <button onClick={onCancel} className="mt-2 text-[10px] text-amber-600 underline">Annuler</button>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 space-y-3 text-xs w-full max-w-[90%]">
            {/* Header */}
            <div className="flex items-center gap-2">
                <UserPen size={14} className="text-purple-600 shrink-0" />
                <p className="font-bold text-purple-900">Modifier un client</p>
            </div>

            {/* What we're changing */}
            <div className="bg-white rounded-lg border border-purple-100 p-2 space-y-1">
                <p className="text-gray-500">Champ : <span className="font-bold text-gray-800">{intent.fieldLabel}</span></p>
                <p className="text-gray-500">Nouvelle valeur : <span className="font-bold text-emerald-700">{intent.value || <em className="text-gray-400">vide</em>}</span></p>
            </div>

            {/* Client selection (if multiple candidates) */}
            {intent.candidates.length > 1 && (
                <div>
                    <p className="text-gray-500 mb-1.5">{intent.candidates.length} clients trouvés — choisissez le bon :</p>
                    <div className="space-y-1.5">
                        {intent.candidates.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedClientId(c.id)}
                                className={`w-full text-left rounded-lg border p-2 transition-all ${selectedClientId === c.id
                                    ? "border-purple-500 bg-purple-100 text-purple-900"
                                    : "border-gray-200 bg-white hover:border-purple-300 text-gray-700"}`}
                            >
                                <p className="font-semibold">{c.name}</p>
                                {c.companyName && <p className="text-[10px] text-gray-400">{c.companyName}</p>}
                                <p className="text-[10px] text-gray-400">{c.phone || c.email || "Pas de contact"}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Single candidate preview */}
            {intent.candidates.length === 1 && selectedClient && (
                <div className="bg-white rounded-lg border border-gray-100 p-2">
                    <p className="font-semibold text-gray-900">{selectedClient.name}</p>
                    {selectedClient.companyName && <p className="text-[10px] text-gray-400">{selectedClient.companyName}</p>}
                    <p className="text-[10px] text-gray-500">{selectedClient.phone || selectedClient.email || "Pas de contact"}</p>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={handleConfirm}
                    disabled={!selectedClientId || confirming}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-purple-600 text-white rounded-lg py-2 font-semibold hover:bg-purple-700 transition-colors disabled:opacity-40"
                >
                    {confirming ? (
                        <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mise à jour...</>
                    ) : (
                        <><CheckCircle2 size={12} />Confirmer</>
                    )}
                </button>
                <button
                    onClick={onCancel}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    Annuler
                </button>
            </div>
        </div>
    );
}

// ── Main Panel ─────────────────────────────────────────────────────
export function JarvisPanel() {
    const { division } = useDivision();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("quickcall");
    const [quickCallOpen, setQuickCallOpen] = useState(false);

    // Alerts
    const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof generatePlatformInsights>> | null>(null);
    const [loadingAlerts, setLoadingAlerts] = useState(false);
    const [alertsLoadedAt, setAlertsLoadedAt] = useState<number | null>(null);

    // Chat
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: "jarvis",
            content: "Bonjour ! Je suis JARVIS. Posez-moi une question ou dites-moi de modifier une info client.\n\nEx: \"Ajoute le email tremblay@gmail.com pour Jean Tremblay\""
        }
    ]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const chatBottomRef = useRef<HTMLDivElement | null>(null);

    // Load alerts on tab switch
    useEffect(() => {
        if (activeTab === "alerts" && !snapshot) {
            const cached = getCachedSnapshot();
            if (cached) {
                setSnapshot(cached.data);
                setAlertsLoadedAt(cached.cachedAt);
            } else {
                loadAlerts();
            }
        }
    }, [activeTab]);

    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadAlerts = async () => {
        setLoadingAlerts(true);
        try {
            const result = await generatePlatformInsights(division as any);
            setSnapshot(result);
            setAlertsLoadedAt(Date.now());
            setCachedSnapshot(result);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAlerts(false);
        }
    };

    const handleAskJarvis = async (q?: string) => {
        const question = q ?? chatInput.trim();
        if (!question) return;
        setChatInput("");

        const userMsg: TextMessage = { role: "user", content: question };
        const loadingMsg: TextMessage = { role: "jarvis", content: "", loading: true };
        setMessages(prev => [...prev, userMsg, loadingMsg]);
        setChatLoading(true);

        try {
            const response = await askJarvis(question, division as any);

            if (response.type === "write_intent") {
                // Replace loading bubble with confirmation card
                const confirmMsg: WriteConfirmMessage = {
                    role: "jarvis",
                    type: "write_confirm",
                    intent: response,
                };
                setMessages(prev => [...prev.slice(0, -1), confirmMsg]);
            } else {
                // Regular text answer
                setMessages(prev => [
                    ...prev.slice(0, -1),
                    { role: "jarvis", content: response.error || response.answer || "Je n'ai pas pu répondre." }
                ]);
            }
        } catch {
            setMessages(prev => [
                ...prev.slice(0, -1),
                { role: "jarvis", content: "Erreur de communication avec l'IA." }
            ]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleWriteConfirm = (idx: number, clientId: string, clientName: string) => {
        // Replace the confirmation card with a success message
        setMessages(prev => {
            const updated = [...prev];
            const confirmMsg = updated[idx] as WriteConfirmMessage;
            updated[idx] = {
                role: "jarvis",
                content: `✅ ${confirmMsg.intent.fieldLabel} de **${clientName}** mis à jour avec succès !`,
            };
            return updated;
        });
    };

    const handleWriteCancel = (idx: number) => {
        setMessages(prev => {
            const updated = [...prev];
            updated[idx] = { role: "jarvis", content: "Modification annulée." };
            return updated;
        });
    };

    const criticalCount = snapshot?.insights.filter(i => i.priority === "CRITIQUE").length ?? 0;
    const importantCount = snapshot?.insights.filter(i => i.priority === "IMPORTANT").length ?? 0;
    const hotCount = criticalCount + importantCount;

    const minutesAgo = alertsLoadedAt ? Math.floor((Date.now() - alertsLoadedAt) / 60000) : null;

    return (
        <>
            {/* Floating Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center group"
                title="JARVIS — Assistant IA"
            >
                <Brain size={24} className="group-hover:animate-pulse" />
                {hotCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-white animate-bounce">
                        {hotCount}
                    </span>
                )}
            </button>

            {/* Slide-in Panel */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-center sm:justify-end p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

                    {/* Panel */}
                    <div className="relative w-full max-w-sm h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-in slide-in-from-bottom-4 duration-300">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-purple-700 to-indigo-700 px-4 py-3 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <Sparkles size={16} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-sm tracking-wide">JARVIS</p>
                                    <p className="text-purple-200 text-[10px]">Assistant IA · Praxis ZLS</p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 shrink-0">
                            {([
                                { id: "quickcall" as Tab, label: "⚡ Action" },
                                { id: "alerts" as Tab, label: `🔔 Alertes${hotCount > 0 ? ` (${hotCount})` : ""}` },
                                { id: "chat" as Tab, label: "💬 Chat" },
                            ] as const).map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${activeTab === tab.id
                                        ? "text-purple-700 border-b-2 border-purple-600 bg-purple-50"
                                        : "text-gray-500 hover:text-gray-700"}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto">

                            {/* ── QUICK CALL TAB ── */}
                            {activeTab === "quickcall" && (
                                <div className="p-4 space-y-3">
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Dictez vos notes ou joignez une image — l'IA extrait le client et crée le job automatiquement.
                                    </p>
                                    <button
                                        onClick={() => { setIsOpen(false); setQuickCallOpen(true); }}
                                        className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold shadow-md hover:opacity-90 transition-all"
                                    >
                                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                            <Mic size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-sm">Ouvrir Quick Call IA</p>
                                            <p className="text-xs text-purple-200">Vocal · Photo · Texte libre</p>
                                        </div>
                                    </button>
                                    <div className="border-t border-gray-100 pt-3">
                                        <p className="text-xs font-semibold text-gray-500 mb-2">Accès rapide</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { label: "Nouveau job", href: "/jobs/new" },
                                                { label: "Calendrier", href: "/calendar" },
                                                { label: "Clients", href: "/clients" },
                                                { label: "Co-Pilote IA", href: "/ai-insights" },
                                            ].map(item => (
                                                <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}
                                                    className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all">
                                                    {item.label}
                                                    <ChevronRight size={12} />
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── ALERTS TAB ── */}
                            {activeTab === "alerts" && (
                                <div className="p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] text-gray-400">
                                            {minutesAgo !== null && `Mis à jour il y a ${minutesAgo < 1 ? "moins d'1 min" : `${minutesAgo} min`}`}
                                        </p>
                                        <button onClick={loadAlerts} disabled={loadingAlerts}
                                            className="flex items-center gap-1 text-[10px] text-purple-600 hover:text-purple-800 font-semibold disabled:opacity-40">
                                            <RefreshCw size={10} className={loadingAlerts ? "animate-spin" : ""} />
                                            {loadingAlerts ? "Analyse..." : "Rafraîchir"}
                                        </button>
                                    </div>

                                    {loadingAlerts && (
                                        <div className="flex flex-col items-center py-10 gap-3">
                                            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                                            <p className="text-xs text-purple-600 font-medium">JARVIS analyse vos données...</p>
                                        </div>
                                    )}

                                    {!loadingAlerts && !snapshot && (
                                        <div className="flex flex-col items-center py-10 gap-3 text-center">
                                            <AlertTriangle size={28} className="text-gray-300" />
                                            <p className="text-xs text-gray-500">Aucune analyse chargée.</p>
                                            <button onClick={loadAlerts} className="text-xs text-purple-600 font-semibold hover:underline">
                                                Lancer l'analyse
                                            </button>
                                        </div>
                                    )}

                                    {!loadingAlerts && snapshot && (
                                        <>
                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg border-4 ${snapshot.healthScore >= 75 ? "border-emerald-400 text-emerald-600 bg-emerald-50" : snapshot.healthScore >= 50 ? "border-amber-400 text-amber-600 bg-amber-50" : "border-red-400 text-red-600 bg-red-50"}`}>
                                                    {snapshot.healthScore}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-gray-700">Score de santé</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{snapshot.summary}</p>
                                                </div>
                                            </div>

                                            {["CRITIQUE", "IMPORTANT", "INFO"].map(prio =>
                                                snapshot.insights
                                                    .filter(i => i.priority === prio)
                                                    .map(insight => {
                                                        const cfg = priorityConfig[insight.priority];
                                                        return (
                                                            <div key={insight.id} className="border border-gray-100 rounded-xl p-3 hover:shadow-sm transition-shadow">
                                                                <div className="flex items-start gap-2">
                                                                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <p className="text-xs font-bold text-gray-800">{insight.title}</p>
                                                                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>{insight.priority}</span>
                                                                        </div>
                                                                        {insight.metric && <p className="text-sm font-black text-purple-700 mt-0.5">{insight.metric}</p>}
                                                                        <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{insight.description}</p>
                                                                        <p className="text-[10px] font-medium text-gray-700 mt-1.5 italic">→ {insight.action}</p>
                                                                        {insight.actionUrl && (
                                                                            <Link href={insight.actionUrl} onClick={() => setIsOpen(false)}
                                                                                className="text-[10px] text-purple-600 hover:underline font-semibold mt-1 inline-block">
                                                                                Aller →
                                                                            </Link>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ── CHAT TAB ── */}
                            {activeTab === "chat" && (
                                <div className="flex flex-col h-full">
                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                        {messages.map((msg, idx) => {
                                            // Write confirmation card
                                            if ("type" in msg && msg.type === "write_confirm") {
                                                return (
                                                    <div key={idx} className="flex justify-start gap-1.5">
                                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                                                            <Sparkles size={10} className="text-white" />
                                                        </div>
                                                        <WriteConfirmCard
                                                            intent={msg.intent}
                                                            onConfirm={(cId, cName) => handleWriteConfirm(idx, cId, cName)}
                                                            onCancel={() => handleWriteCancel(idx)}
                                                        />
                                                    </div>
                                                );
                                            }

                                            // Regular text bubble
                                            const textMsg = msg as TextMessage;
                                            return (
                                                <div key={idx} className={`flex ${textMsg.role === "user" ? "justify-end" : "justify-start"}`}>
                                                    {textMsg.role === "jarvis" && (
                                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 mr-1.5 mt-0.5">
                                                            <Sparkles size={10} className="text-white" />
                                                        </div>
                                                    )}
                                                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${textMsg.role === "user"
                                                        ? "bg-purple-600 text-white rounded-br-sm"
                                                        : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}>
                                                        {textMsg.loading
                                                            ? <span className="flex gap-1 items-center"><span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span><span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span><span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span></span>
                                                            : <span style={{ whiteSpace: "pre-wrap" }}>{textMsg.content}</span>
                                                        }
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={chatBottomRef} />
                                    </div>

                                    {/* Suggested Questions */}
                                    {messages.length <= 1 && (
                                        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                                            {SUGGESTED_QUESTIONS.map(q => (
                                                <button key={q} onClick={() => handleAskJarvis(q)}
                                                    className="text-[10px] bg-purple-50 border border-purple-200 text-purple-700 rounded-full px-2.5 py-1 hover:bg-purple-100 transition-colors font-medium">
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Input */}
                                    <div className="p-3 border-t border-gray-100 shrink-0">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={chatInput}
                                                onChange={e => setChatInput(e.target.value)}
                                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAskJarvis(); } }}
                                                placeholder="Question ou modification client..."
                                                disabled={chatLoading}
                                                className="flex-1 text-xs rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 disabled:opacity-50 outline-none"
                                            />
                                            <button
                                                onClick={() => handleAskJarvis()}
                                                disabled={chatLoading || !chatInput.trim()}
                                                className="w-8 h-8 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:bg-purple-700 transition-colors disabled:opacity-40 shrink-0"
                                            >
                                                <Send size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Call Dialog (still available) */}
            <QuickCallDialog isOpen={quickCallOpen} onClose={() => setQuickCallOpen(false)} />
        </>
    );
}
