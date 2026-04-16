"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { parseCallNotes, transcribeAudio } from "@/app/actions/ai-actions";
import { createClientAndSendLink, createClient } from "@/app/actions/client-actions";
import { useRouter } from "next/navigation";
import { useDivision } from "@/components/providers/division-provider";
import { Sparkles, Phone, MessageSquare, Briefcase, CalendarClock, Send, Mic, Image as ImageIcon, X } from "lucide-react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

interface QuickCallDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function QuickCallDialog({ isOpen, onClose }: QuickCallDialogProps) {
    const router = useRouter();
    const { division } = useDivision();

    // Steps: 1 = Input, 2 = Review, 3 = Options (or merged 2 & 3)
    const [step, setStep] = useState<1 | 2>(1);
    const [rawText, setRawText] = useState("");
    const [loading, setLoading] = useState(false);
    const [imageBase64, setImageBase64] = useState<string>("");
    
    // Audio State
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);

    // AI Results
    const [clientData, setClientData] = useState({
        name: "",
        companyName: "",
        phone: "",
        email: "",
        billingAddress: "",
        language: "FR" as "FR" | "EN",
    });

    const [jobData, setJobData] = useState({
        needsJob: false,
        description: "",
        preferredTiming: "",
    });

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
                    if (e.data.size > 0) {
                        audioChunksRef.current.push(e.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const formData = new FormData();
                    formData.append("audio", audioBlob, "recording.webm");
                    
                    setLoading(true);
                    try {
                        const text = await transcribeAudio(formData);
                        setRawText((prev) => prev + (prev ? " " : "") + text);
                        toast.success("Audio transcrit avec succès !");
                    } catch (e) {
                        toast.error("Échec de la transcription vocale.");
                    } finally {
                        setLoading(false);
                        stream.getTracks().forEach(t => t.stop());
                    }
                };

                mediaRecorder.start();
                setIsRecording(true);
            } catch (err) {
                toast.error("Veuillez autoriser l'accès au microphone.");
            }
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageBase64(reader.result as string);
                toast.success("Image attachée à l'analyse IA");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!rawText.trim() && !imageBase64) {
            toast.error("Veuillez entrer du texte, de la voix ou une image.");
            return;
        }

        setLoading(true);
        try {
            const result = await parseCallNotes(rawText, imageBase64);
            setClientData({
                name: result.client.name,
                companyName: result.client.companyName || "",
                phone: result.client.phone,
                email: result.client.email,
                billingAddress: result.client.billingAddress,
                language: result.client.language,
            });
            setJobData({
                needsJob: result.job.needsJob,
                description: result.job.description,
                preferredTiming: result.job.preferredTiming,
            });
            setStep(2);
            toast.success("Analyse IA terminée !");
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de l'analyse.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveClientOnly = async () => {
        if (!clientData.name || !clientData.billingAddress) {
            toast.error("Le Nom et l'Adresse sont obligatoires.");
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
                divisions: [division]
            });
            toast.success("Client sauvegardé avec succès !");
            closeReset();
        } catch (e) {
            toast.error("Erreur de création.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAndSendLink = async () => {
        if (!clientData.name || !clientData.billingAddress) {
            toast.error("Le Nom et l'Adresse sont obligatoires.");
            return;
        }
        if (!clientData.email) {
            toast.error("L'adresse courriel est obligatoire pour envoyer un lien par email.");
            return;
        }
        
        setLoading(true);
        try {
            const result = await createClientAndSendLink({
                name: clientData.name,
                companyName: clientData.companyName,
                email: clientData.email,
                phone: clientData.phone,
                billingAddress: clientData.billingAddress,
                language: clientData.language,
                divisions: [division],
                sendLink: true,
                division: division,
                // On the fly parsing of preferred timing into AM/PM if we wanted to
                // we'll let the user clarify or just send generic link
            });
            
            if (result.emailSent) {
                toast.success("Client créé et lien envoyé au courriel !");
            } else {
                toast.warning("Client créé, mais erreur d'envoi du courriel.");
            }
            closeReset();
        } catch (error) {
            console.error(error);
            toast.error("Erreur de création.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAndGoToJob = async () => {
        if (!clientData.name || !clientData.billingAddress) {
            toast.error("Le Nom et l'Adresse sont obligatoires.");
            return;
        }
        
        setLoading(true);
        try {
            // Force create Client first
            const client = await createClient({
                name: clientData.name,
                companyName: clientData.companyName,
                email: clientData.email,
                phone: clientData.phone,
                billingAddress: clientData.billingAddress,
                language: clientData.language,
                divisions: [division]
            });
            
            toast.success("Client créé ! Redirection au calendrier...");
            router.push('/calendar'); // Simple redirection
            closeReset();
        } catch (e) {
            toast.error("Erreur de création.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const closeReset = () => {
        setStep(1);
        setRawText("");
        setImageBase64("");
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        }
        router.refresh();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={closeReset} title="Action rapide sur la route (IA)">
            {step === 1 && (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                        Garrochez vos notes d'appels, textos, ou dictez directement. L'Intelligence Artificielle de Praxis s'occupera d'extraire toutes les informations.
                    </p>

                    <div className="relative">
                        <textarea
                            className="w-full rounded-md border p-4 text-sm min-h-[150px] shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-y"
                            placeholder="Ex: Jean Tremblay veut une inspection pour des souris... Son tel c'est 514-999-1234. Ou bien, parlez au micro !"
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            disabled={isRecording}
                        />
                        <div className="absolute right-3 bottom-3 flex space-x-2">
                           <Sparkles className="text-purple-400 opacity-50" size={20} />
                        </div>
                    </div>

                    {/* Multimodal Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleRecordToggle}
                            disabled={loading}
                            className={`flex-1 flex justify-center items-center gap-2 p-2 rounded-md border shadow-sm transition-all text-sm font-medium
                                ${isRecording 
                                    ? "bg-red-50 border-red-200 text-red-600 animate-pulse" 
                                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                }`
                            }
                        >
                            <Mic size={16} />
                            {isRecording ? "Appuyez pour Stop" : "Dictée vocale"}
                        </button>
                        
                        <label className="flex-1 flex justify-center items-center gap-2 p-2 bg-white rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-all cursor-pointer text-sm font-medium">
                            <ImageIcon size={16} />
                            Joindre Image
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleImageUpload}
                            />
                        </label>
                    </div>

                    {imageBase64 && (
                        <div className="relative inline-block mt-2 border rounded-md p-1 bg-gray-50">
                            <img src={imageBase64} alt="Attached" className="h-16 w-16 object-cover rounded" />
                            <button 
                                onClick={() => setImageBase64("")} 
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleAnalyze}
                        disabled={loading || (!rawText && !imageBase64) || isRecording}
                        className="w-full mt-4 flex justify-center items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-3 rounded-lg font-medium shadow transition-all disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></div>
                                Analyse en cours...
                            </>
                        ) : (
                           <>
                               <Sparkles size={18} />
                               Générer le Profil Client
                           </>
                        )}
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mb-4 flex items-start gap-3">
                        <div className="bg-purple-200 text-purple-700 p-2 rounded-full shrink-0">
                            <Sparkles size={16} />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-purple-900">Résultats de l'IA</h4>
                            <p className="text-xs text-purple-700 mt-1">
                                Vérifiez que les infos extraites sont valides avant de continuer. Vous pouvez les modifier au besoin.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-foreground mb-1">Nom *</label>
                            <input value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} className="w-full rounded border px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-foreground mb-1">Compagnie</label>
                            <input value={clientData.companyName} onChange={e => setClientData({...clientData, companyName: e.target.value})} className="w-full rounded border px-2 py-1.5 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-foreground mb-1">Téléphone *</label>
                            <div className="relative">
                                <Phone className="absolute left-2 top-2 text-muted-foreground w-3 h-3" />
                                <input value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} className="w-full rounded border pl-7 pr-2 py-1.5 text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-foreground mb-1">Courriel</label>
                            <input value={clientData.email} type="email" onChange={e => setClientData({...clientData, email: e.target.value})} className="w-full rounded border px-2 py-1.5 text-sm" />
                        </div>
                        <div className="col-span-full">
                            <label className="block text-xs font-medium text-foreground mb-1">Adresse *</label>
                            <AddressAutocomplete
                                value={clientData.billingAddress}
                                onChange={(val) => setClientData({...clientData, billingAddress: val})}
                                onSelectAddress={(val) => setClientData({...clientData, billingAddress: val})}
                                placeholder="Adresse..."
                                className="w-full rounded border px-2 py-1.5 text-sm"
                            />
                        </div>
                    </div>
                    
                    {/* Notes extraites par IA */}
                    {(jobData.description || jobData.preferredTiming) && (
                        <div className="bg-amber-50 rounded-md p-3 border border-amber-100 mt-2">
                             <h4 className="text-xs font-semibold text-amber-800 flex items-center justify-between">
                                 <span className="flex items-center gap-1"><MessageSquare size={12}/> Contexte capturé</span>
                                 {jobData.needsJob && <span className="px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded-full text-[10px]">Job Requis</span>}
                             </h4>
                             <div className="flex flex-col gap-1 mt-2 text-xs text-amber-900">
                                 {jobData.description && <p><span className="font-semibold opacity-70">Problème:</span> {jobData.description}</p>}
                                 {jobData.preferredTiming && <p><span className="font-semibold opacity-70">Dispo:</span> {jobData.preferredTiming}</p>}
                             </div>
                        </div>
                    )}

                    <div className="border-t pt-4 mt-6 space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2 px-1 uppercase tracking-wider">Actions 1-Clic</h4>
                        
                        <button
                            onClick={handleSaveAndGoToJob}
                            disabled={loading}
                            className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-100 text-emerald-600 p-2 rounded-md group-hover:bg-emerald-200 transition-colors">
                                    <CalendarClock size={18} />
                                </div>
                                <div>
                                    <h5 className="text-sm font-medium text-slate-800">Sauvegarder & Créer au Calendrier</h5>
                                    <p className="text-xs text-slate-500">Créé le client et ouvre votre calendrier</p>
                                </div>
                            </div>
                        </button>
                        
                        <button
                            onClick={handleSaveAndSendLink}
                            disabled={loading}
                            className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 text-blue-600 p-2 rounded-md group-hover:bg-blue-200 transition-colors">
                                    <Send size={18} />
                                </div>
                                <div>
                                    <h5 className="text-sm font-medium text-slate-800">Envoyer Lien de Réservation</h5>
                                    <p className="text-xs text-slate-500">Le client choisira sa disponibilité en ligne</p>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={handleSaveClientOnly}
                            disabled={loading}
                            className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-100 text-slate-600 p-2 rounded-md group-hover:bg-slate-200 transition-colors">
                                    <Briefcase size={18} />
                                </div>
                                <div>
                                    <h5 className="text-sm font-medium text-slate-800">Juste Créer le Client</h5>
                                    <p className="text-xs text-slate-500">Sauvegarde dans la base de données sans plus</p>
                                </div>
                            </div>
                        </button>

                        <button onClick={() => setStep(1)} disabled={loading} className="w-full text-center py-2 text-xs text-slate-500 hover:text-slate-800 mt-2">
                             &larr; Retourner au texte
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
