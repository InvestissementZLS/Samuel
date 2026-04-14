"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClientAndSendLink } from "@/app/actions/client-actions";
import { toast } from "sonner";
import {
    User, Mail, Phone, Building2, MapPin, Clipboard,
    Sparkles, Send, Link as LinkIcon, ChevronRight,
    Calendar, Clock, CheckCircle, X, Plus, Loader2,
    ArrowLeft, CreditCard
} from "lucide-react";

// ─── Smart Text Parser ────────────────────────────────────────────────────────
function parseClientText(text: string) {
    const result: Record<string, string> = {};

    // Email
    const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) result.email = emailMatch[0];

    // Phone — formats QC/CA: (514) 555-1234 | 514-555-1234 | 5145551234 | +1 514 555 1234
    const phoneMatch = text.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
    if (phoneMatch) result.phone = phoneMatch[0].replace(/[^\d+]/g, '').replace(/^1/, '');

    // Postal Code (Canadian format: A1A 1A1 or A1A1A1)
    const postalMatch = text.match(/\b[A-Za-z]\d[A-Za-z][\s-]?\d[A-Za-z]\d\b/);
    if (postalMatch) result.postalCode = postalMatch[0].toUpperCase().replace(/\s/g, ' ');

    // Company name — lines with Inc, Ltd, Corp, SARL, enr., ltée, etc.
    const companyPatterns = [
        /^.+(?:Inc\.?|Ltd\.?|Corp\.?|Corporation|S\.A\.R\.L\.?|Ltée\.?|enr\.?|Entreprises?|Services?|Groupe|Group)\s*$/im,
        /(?:Compagnie|Company|Entreprise)\s*:\s*(.+)/i,
    ];
    for (const pat of companyPatterns) {
        const m = text.match(pat);
        if (m) { result.companyName = (m[1] || m[0]).trim(); break; }
    }

    // Address line: number + street name (detect rue, avenue, blvd, etc. or just a number + words)
    const streetPatterns = [
        /\d+[,\s]+(?:rue|avenue|av\.|blvd\.?|boulevard|chemin|ch\.|place|pl\.|court|ct\.?|drive|dr\.?|road|rd\.?|street|st\.?|way|lane|crescent|cres\.?)\s+[^\n,]+/i,
        /\d{1,5}[A-Za-z]?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}(?:\s*(?:Apt|Suite|#)\s*\d+[A-Za-z]?)?/,
    ];
    for (const pat of streetPatterns) {
        const m = text.match(pat);
        if (m) { result.street = m[0].trim(); break; }
    }

    // City — word after postal code or before postal code (simple heuristic)
    const cityMatch = text.match(/([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[\s-][A-ZÀ-Ÿ][a-zà-ÿ]+)*)\s*[,\s]+(?:[A-Za-z]\d[A-Za-z])/);
    if (cityMatch) result.city = cityMatch[1].trim();

    // Name — first non-empty line that doesn't look like email/phone/address
    const lines = text.split(/[\n\r,]+/).map(l => l.trim()).filter(l =>
        l.length > 2 &&
        !l.match(/[\w.+-]+@[\w.-]+/) &&
        !l.match(/\d{3}[\s.-]\d{3}[\s.-]\d{4}/) &&
        !l.match(/\d+\s+(rue|av|blvd|chemin|street|drive)/i) &&
        !l.match(/[A-Za-z]\d[A-Za-z][\s-]?\d[A-Za-z]\d/) &&
        !l.match(/^(?:compagnie|company|entreprise|tel|fax|courriel|email|phone|adresse|address)\s*:/i)
    );
    if (lines.length > 0 && !result.companyName) result.name = lines[0];
    else if (lines.length > 0) result.name = lines[0];

    return result;
}

// ─── Date Picker Component ────────────────────────────────────────────────────
function DayPicker({ selected, onChange }: { selected: string[]; onChange: (days: string[]) => void }) {
    const today = new Date();
    const days: { iso: string; label: string; dayName: string }[] = [];
    for (let i = 1; i <= 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        if (d.getDay() === 0) continue; // Skip Sundays
        const iso = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('fr-CA', { weekday: 'short' });
        const label = d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
        days.push({ iso, label, dayName });
    }

    const toggle = (iso: string) => {
        if (selected.includes(iso)) onChange(selected.filter(d => d !== iso));
        else onChange([...selected, iso]);
    };

    return (
        <div className="flex flex-wrap gap-2">
            {days.map(d => (
                <button
                    key={d.iso}
                    type="button"
                    onClick={() => toggle(d.iso)}
                    className={`flex flex-col items-center px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                        selected.includes(d.iso)
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                >
                    <span className={`text-[10px] uppercase font-bold ${selected.includes(d.iso) ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {d.dayName}
                    </span>
                    <span>{d.label}</span>
                </button>
            ))}
        </div>
    );
}

// ─── Input Component ──────────────────────────────────────────────────────────
function Field({ label, icon: Icon, id, children, optional }: {
    label: string; icon: any; id: string; children: React.ReactNode; optional?: boolean
}) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <Icon className="w-3.5 h-3.5 text-gray-400" />
                {label}
                {optional && <span className="text-xs font-normal text-gray-400 ml-1">(optionnel)</span>}
            </label>
            {children}
        </div>
    );
}

const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm";

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NewClientPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState<'form' | 'link'>('form');

    // Smart Paste
    const [pasteText, setPasteText] = useState('');
    const [parsedHighlight, setParsedHighlight] = useState(false);

    // Client fields
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [serviceStreet, setServiceStreet] = useState('');
    const [serviceCity, setServiceCity] = useState('');
    const [servicePostal, setServicePostal] = useState('');
    const [sameAddress, setSameAddress] = useState(true);
    const [billingAddress, setBillingAddress] = useState('');
    const [language, setLanguage] = useState<'FR' | 'EN'>('FR');
    const [division, setDivision] = useState<'EXTERMINATION' | 'ENTREPRISES' | 'RENOVATION'>('EXTERMINATION');

    // Link preferences
    const [sendLink, setSendLink] = useState(false);
    const [preferredDays, setPreferredDays] = useState<string[]>([]);
    const [preferredPeriod, setPreferredPeriod] = useState<'AM' | 'PM' | 'ANY'>('ANY');

    // Analyze pasted text
    const handlePaste = useCallback((text: string) => {
        setPasteText(text);
        if (!text.trim()) return;

        const parsed = parseClientText(text);
        if (parsed.name && !name) setName(parsed.name);
        if (parsed.email && !email) setEmail(parsed.email);
        if (parsed.phone) {
            // Format phone nicely
            const digits = parsed.phone.replace(/\D/g, '');
            if (digits.length === 10) {
                setPhone(`(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`);
            } else {
                setPhone(parsed.phone);
            }
        }
        if (parsed.companyName && !companyName) setCompanyName(parsed.companyName);
        if (parsed.street && !serviceStreet) setServiceStreet(parsed.street);
        if (parsed.city && !serviceCity) setServiceCity(parsed.city);
        if (parsed.postalCode && !servicePostal) setServicePostal(parsed.postalCode);

        setParsedHighlight(true);
        setTimeout(() => setParsedHighlight(false), 1500);
        toast.success('Informations extraites automatiquement ✓');
    }, [name, email, companyName, serviceStreet, serviceCity, servicePostal]);

    const handleSubmit = async () => {
        if (!name.trim()) { toast.error('Le nom complet est requis'); return; }
        if (sendLink && !email.trim()) { toast.error("Un email est requis pour envoyer un lien"); return; }
        if (sendLink && preferredDays.length === 0) { toast.error("Choisissez au moins un jour disponible"); return; }

        setSubmitting(true);
        try {
            const serviceAddress = [serviceStreet, serviceCity, servicePostal].filter(Boolean).join(', ');
            const result = await createClientAndSendLink({
                name: name.trim(),
                companyName: companyName.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                serviceAddress: serviceAddress || undefined,
                billingAddress: sameAddress ? (serviceAddress || undefined) : (billingAddress.trim() || undefined),
                divisions: [division],
                language,
                sendLink,
                preferredDays: sendLink ? preferredDays : [],
                preferredPeriod: sendLink && preferredPeriod !== 'ANY' ? preferredPeriod : undefined,
                division,
            });

            if (result.emailSent) {
                toast.success(`Client créé et lien envoyé à ${email} ✓`);
            } else if (sendLink && !result.emailSent) {
                toast.warning('Client créé, mais l\'email n\'a pas pu être envoyé.');
            } else {
                toast.success('Client créé avec succès ✓');
            }

            router.push(`/clients/${result.client.id}`);
        } catch (e: any) {
            toast.error(e.message || 'Erreur lors de la création du client');
        } finally {
            setSubmitting(false);
        }
    };

    const isComplete = name.trim().length > 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/clients')}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Retour aux clients
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Nouveau client</h1>
                    <p className="text-gray-500 mt-1">Collez le texte du client ou remplissez les champs manuellement.</p>
                </div>

                <div className="space-y-6">

                    {/* ── Smart Paste Card ── */}
                    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${parsedHighlight ? 'border-green-400 shadow-green-100' : 'border-gray-200'}`}>
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-gray-900">Smart Paste</h2>
                                <p className="text-xs text-gray-500">Collez n'importe quel texte — les champs se rempliront automatiquement</p>
                            </div>
                            {parsedHighlight && (
                                <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                                    <CheckCircle className="w-3.5 h-3.5" /> Extrait !
                                </span>
                            )}
                        </div>
                        <div className="p-4 relative">
                            <textarea
                                value={pasteText}
                                onChange={e => setPasteText(e.target.value)}
                                onPaste={e => {
                                    const text = e.clipboardData.getData('text');
                                    handlePaste(text);
                                }}
                                placeholder={"Collez ici les informations du client...\n\nEx:\nJean Tremblay\n(514) 555-1234\njean.tremblay@email.com\n123 rue Principale, Montréal, H1A 1A1\n\nLes champs se rempliront automatiquement ✨"}
                                rows={5}
                                className="w-full px-4 py-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono"
                            />
                            {pasteText && (
                                <button
                                    type="button"
                                    onClick={() => { handlePaste(pasteText); }}
                                    className="mt-2 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                                >
                                    <Sparkles className="w-4 h-4" /> Analyser le texte
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Client Info Card ── */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="text-sm font-bold text-gray-900">Informations du client</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="sm:col-span-2">
                                <Field label="Nom complet" icon={User} id="name">
                                    <input
                                        id="name" type="text" required
                                        value={name} onChange={e => setName(e.target.value)}
                                        placeholder="Jean Tremblay"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>
                            <Field label="Compagnie" icon={Building2} id="companyName" optional>
                                <input
                                    id="companyName" type="text"
                                    value={companyName} onChange={e => setCompanyName(e.target.value)}
                                    placeholder="ABC Enterprises Inc."
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="Courriel" icon={Mail} id="email" optional>
                                <input
                                    id="email" type="email"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="jean@exemple.com"
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="Téléphone" icon={Phone} id="phone" optional>
                                <input
                                    id="phone" type="tel"
                                    value={phone} onChange={e => setPhone(e.target.value)}
                                    placeholder="(514) 555-1234"
                                    className={inputClass}
                                />
                            </Field>
                            <div className="flex gap-4">
                                <Field label="Langue" icon={CreditCard} id="language">
                                    <div className="flex gap-2">
                                        {(['FR', 'EN'] as const).map(l => (
                                            <button
                                                key={l} type="button"
                                                onClick={() => setLanguage(l)}
                                                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${language === l ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'}`}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </Field>
                                <Field label="Division" icon={Building2} id="division">
                                    <select
                                        id="division"
                                        value={division}
                                        onChange={e => setDivision(e.target.value as any)}
                                        className={inputClass}
                                    >
                                        <option value="EXTERMINATION">Extermination</option>
                                        <option value="ENTREPRISES">Entreprises</option>
                                        <option value="RENOVATION">Rénovation</option>
                                    </select>
                                </Field>
                            </div>
                        </div>
                    </div>

                    {/* ── Addresses Card ── */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="text-sm font-bold text-gray-900">Adresses</h2>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Adresse de service</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-3">
                                        <input
                                            type="text" value={serviceStreet} onChange={e => setServiceStreet(e.target.value)}
                                            placeholder="123 rue Principale"
                                            className={inputClass}
                                        />
                                    </div>
                                    <input
                                        type="text" value={serviceCity} onChange={e => setServiceCity(e.target.value)}
                                        placeholder="Montréal"
                                        className={inputClass}
                                    />
                                    <input
                                        type="text" value={servicePostal} onChange={e => setServicePostal(e.target.value)}
                                        placeholder="H1A 1A1"
                                        className={`${inputClass} uppercase`}
                                    />
                                    <input
                                        type="text" defaultValue="QC" readOnly
                                        className={`${inputClass} bg-gray-50 text-gray-400`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer select-none group w-fit">
                                    <div
                                        onClick={() => setSameAddress(!sameAddress)}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${sameAddress ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${sameAddress ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Adresse de facturation identique</span>
                                </label>

                                {!sameAddress && (
                                    <div className="mt-3">
                                        <input
                                            type="text" value={billingAddress} onChange={e => setBillingAddress(e.target.value)}
                                            placeholder="Adresse de facturation complète"
                                            className={inputClass}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Send Booking Link Card ── */}
                    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${sendLink ? 'border-indigo-300' : 'border-gray-200'}`}>
                        <div className="px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${sendLink ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gray-100'}`}>
                                        <Send className={`w-4 h-4 ${sendLink ? 'text-white' : 'text-gray-400'}`} />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-gray-900">Envoyer un lien de rendez-vous</h2>
                                        <p className="text-xs text-gray-500">Définissez les créneaux convenus avec le client</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSendLink(!sendLink)}
                                    className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${sendLink ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                >
                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${sendLink ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                        </div>

                        {sendLink && (
                            <div className="p-6 space-y-6 bg-indigo-50/30">
                                {/* AM / PM */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" /> Période de la journée
                                    </p>
                                    <div className="flex gap-3">
                                        {([
                                            { key: 'AM', label: '🌅 Avant-midi', desc: 'avant 12h' },
                                            { key: 'PM', label: '☀️ Après-midi', desc: 'après 12h' },
                                            { key: 'ANY', label: '🔓 Peu importe', desc: 'toute la journée' },
                                        ] as const).map(({ key, label, desc }) => (
                                            <button
                                                key={key} type="button"
                                                onClick={() => setPreferredPeriod(key)}
                                                className={`flex-1 py-3 px-2 rounded-xl border text-center transition-all ${
                                                    preferredPeriod === key
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                        : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'
                                                }`}
                                            >
                                                <div className="text-base">{label.split(' ')[0]}</div>
                                                <div className="text-xs font-semibold mt-0.5">{label.split(' ').slice(1).join(' ')}</div>
                                                <div className={`text-[10px] mt-0.5 ${preferredPeriod === key ? 'text-indigo-200' : 'text-gray-400'}`}>{desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Day Picker */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Jours disponibles
                                        {preferredDays.length > 0 && (
                                            <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full">
                                                {preferredDays.length} sélectionné{preferredDays.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </p>
                                    <DayPicker selected={preferredDays} onChange={setPreferredDays} />
                                    {preferredDays.length === 0 && (
                                        <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                                            ⚠️ Sélectionnez au moins un jour
                                        </p>
                                    )}
                                </div>

                                {!email && (
                                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
                                        <span>⚠️</span>
                                        <span>Un <strong>courriel</strong> est requis pour envoyer le lien.</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Actions ── */}
                    <div className="flex gap-3 pb-8">
                        <button
                            type="button"
                            onClick={() => router.push('/clients')}
                            className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting || !isComplete}
                            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-6 rounded-xl font-bold text-sm transition-all shadow-sm ${
                                submitting || !isComplete
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : sendLink
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-200'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {sendLink ? 'Création et envoi...' : 'Création...'}
                                </>
                            ) : (
                                <>
                                    {sendLink ? <Send className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                    {sendLink ? 'Créer le client & envoyer le lien' : 'Créer le client'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
