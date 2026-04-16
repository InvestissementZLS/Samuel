"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import {
    parseCallNotes,
    searchExistingClients,
    createJobFromAI
} from "@/app/actions/ai-actions";
import { parseScheduledDate } from "@/lib/date-utils";
import { createClientAndSendLink, createClient } from "@/app/actions/client-actions";
import { useRouter } from "next/navigation";
import { useDivision } from "@/components/providers/division-provider";
import {
    Sparkles, Phone, MessageSquare, Briefcase, CalendarClock, Send, Mic, Image as ImageIcon,
    X, UserCheck, UserPlus, Search, CheckCircle2, Clock, Calendar, AlertCircle, ChevronRight
} from "lucide-react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface QuickCallDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'input' | 'review' | 'client_match' | 'confirm_job';

// ---- Types ----
type AiResultResponse = Awaited<ReturnType<typeof parseCallNotes>>;
type AiResult = Extract<AiResultResponse, { success: true }>['data'];
type ClientMatch = {
    id: string;
    name: string;
    companyName?: string | null;
    phone?: string | null;
    email?: string | null;
    billingAddress?: string | null;
    properties: { id: string; address: string; type: string }[];
};

export function QuickCallDialog({ isOpen, onClose }: QuickCallDialogProps) {
    const router = useRouter();
    const { division } = useDivision();

    const [step, setStep] = useState<Step>('input');
    const [rawText, setRawText] = useState("");
    const [loading, setLoading] = useState(false);
    const [imagesBase64, setImagesBase64] = useState<string[]>([]);

    // Audio
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);

    // AI Results
    const [aiResult, setAiResult] = useState<AiResult | null>(null);
    const [scheduledDate, setScheduledDate] = useState<Date | null>(null);

    // Client Resolution
    const [clientMatches, setClientMatches] = useState<ClientMatch[]>([]);
    const [selectedClient, setSelectedClient] = useState<ClientMatch | null>(null);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

    // Editable fields (Step 2)
    const [clientData, setClientData] = useState({
        name: "",
        companyName: "",
        phone: "",
        email: "",
        billingAddress: "",
        email: "",
        billingAddress: "",
        language: "FR" as "FR" | "EN",
    });

    const [jobData, setJobData] = useState({
        description: "",
        period: "ANY" as "AM" | "PM" | "ANY",
    });

    // ─── Audio Recording ──────────────────────────────────────
    const handleRecordToggle = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunksRef.current.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const formData = new FormData();
                    formData.append("audio", audioBlob, "recording.webm");

                    setLoading(true);
                    try {
                        // Use API route instead of server action for reliable binary upload
                        const res = await fetch('/api/transcribe', {
                            method: 'POST',
                            body: formData,
                        });
                        
                        const data = await res.json();
                        
                        if (!res.ok) throw new Error(data.error || 'Erreur transcription');
                        
                        setRawText((prev) => prev + (prev ? " " : "") + data.text);
                        toast.success("Audio transcrit !");
                    } catch (e: any) {
                        toast.error(e.message || "Échec de la transcription.");
                    } finally {
                        setLoading(false);
                        stream.getTracks().forEach(t => t.stop());
                    }
                };

                mediaRecorder.start();
                setIsRecording(true);
            } catch {
                toast.error("Autorisez l'accès au microphone.");
            }
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            files.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagesBase64(prev => [...prev, reader.result as string]);
                    toast.success("Image ajoutée !");
                };
                reader.readAsDataURL(file);
            });
        }
    };

    // ─── Step 1: Analyze ──────────────────────────────────────
    const handleAnalyze = async () => {
        if (!rawText.trim() && imagesBase64.length === 0) {
            toast.error("Entrez du texte, parlez au micro, ou joignez des images.");
            return;
        }

        setLoading(true);
        try {
            const response = await parseCallNotes(rawText, imagesBase64);

            // Handle structured error return (no throw across server boundary)
            if (!response.success) {
                toast.error(response.error || "Erreur lors de l'analyse IA.");
                return;
            }

            const result = response.data;
            setAiResult(result);

            // Pre-populate client and job forms
            setClientData({
                name: result.client.name || "",
                companyName: result.client.companyName || "",
                phone: result.client.phone || "",
                email: result.client.email || "",
                billingAddress: result.client.billingAddress || "",
                language: result.client.language || "FR",
            });
            
            setJobData({
                description: result.job.description || "",
                period: result.job.period || "ANY",
            });

            // Parse scheduled date if job is needed
            if (result.job.needsJob && result.job.scheduledDateHint) {
                const date = parseScheduledDate(
                    result.job.scheduledDateHint,
                    result.job.scheduledTimeHint,
                    result.job.period
                );
                setScheduledDate(date);
            }

            // Search for existing clients by name, phone, AND email simultaneously
            const searchTerm = result.client.searchName || result.client.name;
            const hasSearchCriteria =
                (searchTerm && searchTerm.trim().length >= 2) ||
                (result.client.phone && result.client.phone.trim().length >= 7) ||
                (result.client.email && result.client.email.includes('@'));

            if (hasSearchCriteria) {
                const matches = await searchExistingClients(
                    searchTerm || "",
                    division,
                    result.client.phone || "",
                    result.client.email || ""
                );
                setClientMatches(matches as ClientMatch[]);
                if (matches.length > 0) {
                    setStep('client_match');
                    return;
                }
            }

            setStep('review');
            toast.success("Analyse IA terminée !");
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de l'analyse.");
        } finally {
            setLoading(false);
        }
    };

    // ─── Step 2: Client Match Selection ──────────────────────
    const handleSelectExistingClient = (client: ClientMatch) => {
        setSelectedClient(client);
        if (client.properties.length > 0) {
            setSelectedPropertyId(client.properties[0].id);
        }
        setStep('confirm_job');
    };

    const handleUseNewClient = () => {
        setSelectedClient(null);
        setStep('review');
    };

    // ─── Step 3: Confirm Job (Existing Client) ────────────────
    const handleCreateJobForExistingClient = async () => {
        if (!selectedClient) return;
        if (!selectedPropertyId) {
            toast.error("Sélectionnez une propriété/adresse de service.");
            return;
        }
        if (!scheduledDate) {
            toast.error("L'IA n'a pas détecté de date. Veuillez la préciser dans vos notes.");
            return;
        }

        setLoading(true);
        try {
            await createJobFromAI({
                clientId: selectedClient.id,
                propertyId: selectedPropertyId,
                description: jobData.description || "Service planifié via Action Rapide",
                scheduledAt: scheduledDate,
                division: division as any,
            });

            toast.success(`✅ Job créé pour ${selectedClient.name} !`);
            router.push('/calendar');
            closeReset();
        } catch (e: any) {
            toast.error(e.message || "Erreur lors de la création du job.");
        } finally {
            setLoading(false);
        }
    };

    // ─── Step 3b: Actions for New Client ─────────────────────
    const handleSaveClientOnly = async () => {
        if (!clientData.name) {
            toast.error("Le Nom est obligatoire.");
            return;
        }
        setLoading(true);
        try {
            await createClient({
                name: clientData.name,
                companyName: clientData.companyName,
                email: clientData.email,
                phone: clientData.phone,
                billingAddress: clientData.billingAddress,
                language: clientData.language,
                divisions: [division as any]
            });
            toast.success("Client créé !");
            closeReset();
        } catch { toast.error("Erreur."); } finally { setLoading(false); }
    };

    const handleSaveAndJob = async () => {
        if (!clientData.name) { toast.error("Nom obligatoire."); return; }
        if (!scheduledDate) { toast.error("Précisez la date dans vos notes (ex: 'demain matin')."); return; }
        setLoading(true);
        try {
            const client = await createClient({
                name: clientData.name,
                companyName: clientData.companyName,
                email: clientData.email,
                phone: clientData.phone,
                billingAddress: clientData.billingAddress || "",
                language: clientData.language,
                divisions: [division as any]
            });

            // Use first auto-created property
            const firstProp = client.properties?.[0];
            if (firstProp) {
                await createJobFromAI({
                    clientId: client.id,
                    propertyId: firstProp.id,
                    description: jobData.description || "Service planifié",
                    scheduledAt: scheduledDate,
                    division: division as any,
                });
                toast.success("Client + Job créés ! Redirection au calendrier...");
                router.push('/calendar');
            } else {
                toast.success("Client créé. Ajoutez une adresse pour créer le job.");
                router.push(`/clients/${client.id}`);
            }
            closeReset();
        } catch (e: any) { toast.error(e.message || "Erreur."); } finally { setLoading(false); }
    };

    const handleSendBookingLink = async () => {
        if (!clientData.name) { toast.error("Nom obligatoire."); return; }
        if (!clientData.email) { toast.error("Courriel obligatoire pour envoyer le lien."); return; }
        setLoading(true);
        try {
            const result = await createClientAndSendLink({
                name: clientData.name,
                companyName: clientData.companyName,
                email: clientData.email,
                phone: clientData.phone,
                billingAddress: clientData.billingAddress,
                language: clientData.language,
                divisions: [division as any],
                sendLink: true,
                division: division as any,
                preferredPeriod: jobData.period !== 'ANY' ? jobData.period as any : undefined,
            });
            if (result.emailSent) toast.success("Client créé + lien de réservation envoyé !");
            else toast.warning("Client créé, mais l'email n'a pas pu être envoyé.");
            closeReset();
        } catch (e: any) { toast.error(e.message || "Erreur."); } finally { setLoading(false); }
    };

    const closeReset = () => {
        setStep('input');
        setRawText("");
        setImagesBase64([]);
        setAiResult(null);
        setScheduledDate(null);
        setClientMatches([]);
        setSelectedClient(null);
        setSelectedPropertyId("");
        if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); }
        router.refresh();
        onClose();
    };

    // ─── Formatted Date Display ───────────────────────────────
    const formattedDate = scheduledDate
        ? format(scheduledDate, "EEEE d MMMM 'à' HH'h'mm", { locale: fr })
        : null;

    // ─── Render ───────────────────────────────────────────────
    return (
        <Modal isOpen={isOpen} onClose={closeReset} title="⚡ Action Rapide (IA)">

            {/* ─── STEP 1: INPUT ─── */}
            {step === 'input' && (
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Dictez vos notes, joignez une image, ou tapez un texto client. L'IA de Praxis va tout structurer !
                    </p>

                    <div className="relative">
                        <textarea
                            className="w-full rounded-md border p-3 text-sm min-h-[140px] shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-y pr-8"
                            placeholder={`Exemples:\n• "Sédule Tremblay Inc pour demain PM, fourmis"\n• "Nouveau client: Jean Bergeron, 514-555-0001, 12 rue des Pins, inspection souris jeudi matin"\n• "Envoie un lien à Sophie Martin, sophie@gmail.com"`}
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            disabled={isRecording}
                        />
                        <Sparkles className="absolute right-2 top-2 text-purple-300" size={16} />
                    </div>

                    {/* Toolbar */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleRecordToggle}
                            disabled={loading}
                            className={`flex-1 flex justify-center items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all
                                ${isRecording
                                    ? "bg-red-50 border-red-300 text-red-600 animate-pulse shadow-inner"
                                    : "bg-white border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700"
                                }`}
                        >
                            <Mic size={15} />
                            {isRecording ? "Arrêter l'enregistrement" : "Dictée vocale"}
                        </button>

                        <label className="flex-1 flex justify-center items-center gap-2 p-2.5 bg-white rounded-lg border border-gray-200 text-gray-700 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 cursor-pointer text-sm font-medium transition-all">
                            <ImageIcon size={15} />
                            Joindre images
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                        </label>
                    </div>

                    {imagesBase64.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {imagesBase64.map((img, idx) => (
                                <div key={idx} className="relative inline-flex items-center gap-2 p-2 border rounded-lg bg-gray-50">
                                    <img src={img} alt="Attached" className="h-12 w-12 object-cover rounded" />
                                    <span className="text-xs text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">Image {idx + 1}</span>
                                    <button onClick={() => setImagesBase64(prev => prev.filter((_, i) => i !== idx))} className="ml-1 text-red-400 hover:text-red-600">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={handleAnalyze}
                        disabled={loading || (!rawText.trim() && imagesBase64.length === 0) || isRecording}
                        className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-3 rounded-xl font-semibold shadow-md transition-all disabled:opacity-40 mt-1"
                    >
                        {loading ? (
                            <><div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" /> Analyse en cours...</>
                        ) : (
                            <><Sparkles size={16} /> Analyser et Structurer</>
                        )}
                    </button>
                </div>
            )}

            {/* ─── STEP: CLIENT MATCH ─── */}
            {step === 'client_match' && (
                <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 items-start">
                        <Search className="text-amber-500 shrink-0 mt-0.5" size={18} />
                        <div>
                            <p className="text-sm font-semibold text-amber-800">Clients existants trouvés</p>
                            <p className="text-xs text-amber-700 mt-0.5">L'IA a détecté un nom correspondant dans votre base de données. Sélectionnez le bon client ou créez-en un nouveau.</p>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {clientMatches.map((client) => (
                            <button
                                key={client.id}
                                onClick={() => handleSelectExistingClient(client)}
                                className="w-full text-left border rounded-xl p-3 hover:border-purple-400 hover:bg-purple-50 transition-all group"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-sm text-gray-800">{client.name}</p>
                                        {client.companyName && <p className="text-xs text-gray-500">{client.companyName}</p>}
                                        <p className="text-xs text-gray-500 mt-0.5">{client.phone || client.email || "—"}</p>
                                        {client.billingAddress && (
                                            <p className="text-xs text-gray-400 truncate max-w-[250px]">{client.billingAddress}</p>
                                        )}
                                    </div>
                                    <ChevronRight className="text-gray-300 group-hover:text-purple-500 shrink-0" size={18} />
                                </div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleUseNewClient}
                        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-purple-400 hover:text-purple-700 text-sm font-medium transition-all"
                    >
                        <UserPlus size={16} /> Ce n'est pas ce client — Créer un nouveau
                    </button>
                </div>
            )}

            {/* ─── STEP: CONFIRM JOB (Existing Client) ─── */}
            {step === 'confirm_job' && selectedClient && (
                <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-3 items-center">
                        <UserCheck className="text-emerald-600 shrink-0" size={20} />
                        <div>
                            <p className="text-sm font-bold text-emerald-800">{selectedClient.name}</p>
                            {selectedClient.companyName && <p className="text-xs text-emerald-700">{selectedClient.companyName}</p>}
                            <p className="text-xs text-emerald-600">{selectedClient.phone || selectedClient.email || ""}</p>
                        </div>
                    </div>

                    {/* Editable Job Details */}
                    {aiResult?.job.needsJob && (
                        <div className="bg-purple-50 rounded-xl p-4 space-y-3 border border-purple-100">
                            <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider flex items-center justify-between">
                                Détails du Job détecté
                                <span className="text-[10px] bg-purple-200 px-2 rounded-full py-0.5 font-medium lowercase">Modifiable</span>
                            </h4>

                            <div className="space-y-2">
                                <div>
                                    <label className="block text-xs font-medium text-purple-900 mb-0.5">Service à effectuer</label>
                                    <div className="relative">
                                        <MessageSquare size={14} className="absolute left-2.5 top-2.5 text-purple-400" />
                                        <input 
                                            value={jobData.description} 
                                            onChange={e => setJobData({ ...jobData, description: e.target.value })} 
                                            className="w-full rounded-lg border-purple-200 pl-8 pr-2 py-2 text-sm bg-white shadow-sm focus:ring-purple-500 focus:border-purple-500" 
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-purple-900 mb-0.5">Date</label>
                                        <div className="relative">
                                            <Calendar size={14} className="absolute left-2.5 top-2.5 text-purple-400" />
                                            <input 
                                                type="date" 
                                                value={scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : ''}
                                                onChange={e => setScheduledDate(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}
                                                className="w-full rounded-lg border-purple-200 pl-8 pr-2 py-2 text-sm bg-white shadow-sm" 
                                            />
                                        </div>
                                        {!scheduledDate && (
                                            <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1"><AlertCircle size={10}/> Requise pour créer le job</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-purple-900 mb-0.5">Période</label>
                                        <div className="relative">
                                            <Clock size={14} className="absolute left-2.5 top-2.5 text-purple-400" />
                                            <select 
                                                value={jobData.period} 
                                                onChange={e => setJobData({ ...jobData, period: e.target.value as any })}
                                                className="w-full rounded-lg border-purple-200 pl-8 pr-2 py-2 text-sm bg-white shadow-sm"
                                            >
                                                <option value="ANY">Peu importe</option>
                                                <option value="AM">Matin (AM)</option>
                                                <option value="PM">Après-midi (PM)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Property Selection */}
                    {selectedClient.properties.length > 1 && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Adresse de service</label>
                            <select
                                value={selectedPropertyId}
                                onChange={(e) => setSelectedPropertyId(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 text-sm"
                            >
                                {selectedClient.properties.map(p => (
                                    <option key={p.id} value={p.id}>{p.address}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-2">
                        {scheduledDate && (
                            <button
                                onClick={handleCreateJobForExistingClient}
                                disabled={loading}
                                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold shadow hover:opacity-90 transition-all"
                            >
                                <CheckCircle2 size={18} />
                                <div className="text-left">
                                    <p className="font-bold text-sm">Créer le Job maintenant</p>
                                    <p className="text-xs opacity-80 capitalize">{formattedDate}</p>
                                </div>
                            </button>
                        )}

                        <button
                            onClick={handleSendBookingLink}
                            disabled={loading || !selectedClient.email}
                            className="w-full flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-all disabled:opacity-40"
                        >
                            <Send size={16} />
                            <div className="text-left">
                                <p className="text-sm font-semibold">Envoyer un lien de réservation</p>
                                <p className="text-xs opacity-70">{selectedClient.email || "Courriel manquant"}</p>
                            </div>
                        </button>
                    </div>

                    <button onClick={() => setStep('client_match')} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1">
                        ← Choisir un autre client
                    </button>
                </div>
            )}

            {/* ─── STEP: REVIEW (New Client) ─── */}
            {step === 'review' && (
                <div className="space-y-3">
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-center gap-3">
                        <div className="bg-purple-200 p-2 rounded-full"><Sparkles size={14} className="text-purple-700" /></div>
                        <div>
                            <p className="text-xs font-bold text-purple-900">Nouveau client détecté</p>
                            <p className="text-xs text-purple-700">Vérifiez et corrigez au besoin avant de continuer.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Nom *</label>
                            <input value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} className="w-full rounded-lg border px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Compagnie</label>
                            <input value={clientData.companyName} onChange={e => setClientData({ ...clientData, companyName: e.target.value })} className="w-full rounded-lg border px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Téléphone</label>
                            <div className="relative">
                                <Phone className="absolute left-2 top-2 text-gray-400 w-3 h-3" />
                                <input value={clientData.phone} onChange={e => setClientData({ ...clientData, phone: e.target.value })} className="w-full rounded-lg border pl-6 pr-2 py-1.5 text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Courriel</label>
                            <input value={clientData.email} type="email" onChange={e => setClientData({ ...clientData, email: e.target.value })} className="w-full rounded-lg border px-2 py-1.5 text-sm" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Adresse</label>
                            <AddressAutocomplete
                                value={clientData.billingAddress}
                                onChange={(val) => setClientData({ ...clientData, billingAddress: val })}
                                onSelectAddress={(val) => setClientData({ ...clientData, billingAddress: val })}
                                placeholder="Adresse..."
                                className="w-full rounded-lg border px-2 py-1.5 text-sm"
                            />
                        </div>
                    </div>

                    {/* Editable Job Settings */}
                    {aiResult?.job.needsJob && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2 mt-2">
                            <h4 className="text-xs font-bold text-amber-900 flex items-center justify-between">
                                <span className="flex items-center gap-1"><Calendar size={12} /> Détails du Job (Modifiable)</span>
                            </h4>
                            
                            <div>
                                <label className="block text-[10px] font-medium text-amber-900 mb-0.5">Service</label>
                                <input 
                                    value={jobData.description} 
                                    onChange={e => setJobData({ ...jobData, description: e.target.value })} 
                                    className="w-full rounded-md border-amber-200 py-1.5 px-2 text-sm bg-white" 
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-medium text-amber-900 mb-0.5">Date</label>
                                    <input 
                                        type="date" 
                                        value={scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : ''}
                                        onChange={e => setScheduledDate(e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}
                                        className="w-full rounded-md border-amber-200 py-1.5 px-2 text-sm bg-white" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium text-amber-900 mb-0.5">Heure/Période</label>
                                    <select 
                                        value={jobData.period} 
                                        onChange={e => setJobData({ ...jobData, period: e.target.value as any })}
                                        className="w-full rounded-md border-amber-200 py-1.5 px-2 text-sm bg-white"
                                    >
                                        <option value="ANY">Peu importe</option>
                                        <option value="AM">Matin</option>
                                        <option value="PM">Après-midi</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-2 pt-1">
                        {aiResult?.job.needsJob && scheduledDate && (
                            <button
                                onClick={handleSaveAndJob}
                                disabled={loading}
                                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold shadow hover:opacity-90 transition-all"
                            >
                                <CalendarClock size={18} />
                                <div className="text-left">
                                    <p className="font-bold text-sm">Créer Client + Job au Calendrier</p>
                                    <p className="text-xs opacity-80 capitalize">{formattedDate}</p>
                                </div>
                            </button>
                        )}

                        <button onClick={handleSendBookingLink} disabled={loading} className="w-full flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-all">
                            <Send size={16} />
                            <div className="text-left">
                                <p className="text-sm font-semibold">Envoyer Lien de Réservation</p>
                                <p className="text-xs opacity-70">Le client choisira sa dispo en ligne</p>
                            </div>
                        </button>

                        <button onClick={handleSaveClientOnly} disabled={loading} className="w-full flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-100 transition-all">
                            <Briefcase size={16} />
                            <div className="text-left">
                                <p className="text-sm font-semibold">Juste Sauvegarder le Client</p>
                            </div>
                        </button>

                        <button onClick={() => setStep('input')} disabled={loading} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1">
                            ← Retourner aux notes
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
