"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPortalData, cancelJob, getPortalServices } from "@/app/actions/portal-actions";
import { format, isAfter, addHours } from "date-fns";
import { Calendar, Clock, AlertTriangle, CheckCircle, XCircle, FileText, CreditCard, Download, Eye, ShoppingBag, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { dictionary, Locale } from "@/lib/i18n/dictionary";
import { createSquareCheckoutLink } from "@/app/actions/square-actions";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/pdf/invoice-pdf";
import { QuotePDF } from "@/components/pdf/quote-pdf";
import Image from "next/image";

// Skeleton Loader
function SkeletonCard() {
    return (
        <div className="border rounded-lg p-6 shadow-sm animate-pulse bg-white">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
    );
}

export default function ClientPortalPage() {
    const params = useParams();
    const router = useRouter();
    // @ts-ignore
    const token = typeof params?.token === 'string' ? params.token : "";

    const [loading, setLoading] = useState(true);
    const [client, setClient] = useState<any>(null);
    const [jobs, setJobs] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [processing, setProcessing] = useState<string | null>(null);
    const [services, setServices] = useState<any[]>([]);

    // Payment State
    const [isPayingId, setIsPayingId] = useState<string | null>(null);

    // Language (Derive from client preference later, default FR for now as per project)
    const [language, setLanguage] = useState<Locale>('fr');
    // Default to EN if language not found, but FR if specified
    const t = dictionary[language as keyof typeof dictionary] || dictionary.fr;
    const p = t.portal || dictionary.fr.portal;

    useEffect(() => {
        if (!token) return;

        const fetchData = async () => {
            try {
                const data = await getPortalData(token);
                if (!data || 'error' in data) {
                    toast.error(t.portal.invalidLink);
                    return;
                }
                setClient(data);

                if (data.invoices) {
                    setInvoices(data.invoices);
                }

                if (data.properties) {
                    const allJobs = data.properties.flatMap((p: any) => p.jobs || []);
                    // Sort by date
                    allJobs.sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
                    setJobs(allJobs);
                }

                if (data.language) {
                    setLanguage(data.language.toLowerCase() as Locale);
                }

                // Fetch services for the boutique
                const servicesData = await getPortalServices();
                setServices(servicesData);
            } catch (e) {
                console.error(e);
                toast.error("Failed to load portal");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token, router]);

    const handleCancel = async (jobId: string) => {
        if (!confirm(p.confirmCancel)) return;

        setProcessing(jobId);
        try {
            await cancelJob(token, jobId);
            toast.success(p.cancelSuccess);
            // Refresh
            const data = await getPortalData(token);
            if (data && data.properties) {
                const allJobs = data.properties.flatMap((p: any) => p.jobs || []);
                allJobs.sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
                setJobs(allJobs);
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to cancel");
        } finally {
            setProcessing(null);
        }
    };

    const handleReschedule = async (jobId: string) => {
        if (!confirm(p.confirmReschedule)) return;

        setProcessing(jobId);
        try {
            await cancelJob(token, jobId);
            toast.success(p.rescheduleSuccess);
            router.push(`/booking/${token}`);
        } catch (e: any) {
            toast.error(e.message || "Failed to reschedule");
            setProcessing(null);
        }
    };

    const handlePayment = async (inv: any) => {
        setIsPayingId(inv.id);
        const toastId = toast.loading(t.redirecting || "Redirection en cours...");
        try {
            const result = await createSquareCheckoutLink(inv.id);
            if (result.url) {
                window.location.href = result.url;
            } else {
                toast.error(result.error || "Erreur de paiement", { id: toastId });
            }
        } catch (error) {
            toast.error("Une erreur est survenue", { id: toastId });
        } finally {
            setIsPayingId(null);
        }
    };


    // Separate jobs
    const now = new Date();
    const upcomingJobs = jobs.filter(j => new Date(j.scheduledAt) >= now && j.status !== 'CANCELLED' && j.status !== 'COMPLETED');
    const pastJobs = jobs.filter(j => new Date(j.scheduledAt) < now || j.status === 'CANCELLED' || j.status === 'COMPLETED');

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 md:p-8">
                <div className="max-w-3xl mx-auto space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-8 animate-pulse"></div>
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-xl font-semibold text-gray-900">{p.accessDenied}</h1>
                    <p className="text-gray-500">{p.invalidLink}</p>
                </div>
            </div>
        );
    }

    // Warranty calculation from properties
    const allProperties = client.properties || [];
    const latestWarranty = allProperties
        .map((p: any) => p.warrantyExpiresAt ? new Date(p.warrantyExpiresAt) : null)
        .filter(Boolean)
        .sort((a: any, b: any) => b.getTime() - a.getTime())[0];

    const warrantyDaysLeft = latestWarranty
        ? Math.floor((latestWarranty.getTime() - now.getTime()) / 86400000)
        : null;
    const warrantyActive = warrantyDaysLeft !== null && warrantyDaysLeft > 0;
    const warrantyExpiredRecently = warrantyDaysLeft !== null && warrantyDaysLeft < 0 && warrantyDaysLeft > -60;

    // Visit stats
    const completedVisits = jobs.filter(j => j.status === 'COMPLETED').length;
    const totalVisits = jobs.length;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{p.title}</h1>
                        <p className="text-gray-500 mt-0.5">{client.name}</p>
                    </div>
                    {client.divisions?.includes("RENOVATION") ? (
                        <img src="/renovation-logo.png" alt="Rénovation Esthéban" className="h-12 w-auto object-contain" />
                    ) : (
                        <img src="/zls-logo.png" alt="Extermination ZLS" className="h-12 w-auto object-contain" />
                    )}
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

                {/* ── Nos Services — Hero CTA ── */}
                <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-8 text-white shadow-xl">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-yellow-300" />
                            <span className="text-sm font-semibold uppercase tracking-wider text-indigo-100">
                                {language === 'fr' ? 'Exterminateurs certifiés' : 'Certified Exterminators'}
                            </span>
                        </div>
                        <h2 className="text-3xl font-bold mb-3">
                            {language === 'fr' ? 'Nos services d\'extermination' : 'Our extermination services'}
                        </h2>
                        <p className="text-indigo-100 max-w-xl mb-6 text-base">
                            {language === 'fr'
                                ? "Des solutions professionnelles pour chaque nuisible. Garanties incluses sur tous nos traitements."
                                : "Professional solutions for every pest. Warranties included on all our treatments."}
                        </p>
                        <button
                            onClick={() => router.push(`/booking/${token}`)}
                            className="bg-white text-indigo-600 px-6 py-3 rounded-full font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg"
                        >
                            {language === 'fr' ? 'Prendre rendez-vous' : 'Book an appointment'}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
                </section>

                {/* ── Catalogue services par catégorie ── */}
                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                        {language === 'fr' ? 'Nos Services' : 'Our Services'}
                    </h2>
                    <p className="text-gray-500 text-sm mb-8">
                        {language === 'fr'
                            ? 'Cliquez sur une catégorie pour voir les options et réserver.'
                            : 'Click a category to see options and book.'}
                    </p>

                    <div className="space-y-4">
                        {([
                            {
                                id: 'souris',
                                icon: '🐭',
                                color: 'blue',
                                title: language === 'fr' ? 'Souris & Rongeurs' : 'Mice & Rodents',
                                subtitle: language === 'fr' ? 'Traitement, calfeutrage, plans de suivi' : 'Treatment, sealing, follow-up plans',
                                options: language === 'fr' ? [
                                    { name: 'Traitement Régulier', detail: 'Installation d\'appâts • Suivi 1 mois • Garantie 6 mois' },
                                    { name: 'Traitement Premium', detail: 'Piégeage + périmètre extérieur + grenier • Garantie 6 mois' },
                                    { name: 'Calfeutrage & Blocage Complet', detail: 'Silicone + grillage + élimination • Garantie 2 ans souris / 5 ans matériaux' },
                                    { name: 'Service Mensuel', detail: 'Entretien régulier, stations d\'appât et trappes' },
                                    { name: 'Service Trimestriel', detail: 'Contrôle préventif 4x/an' },
                                    { name: 'Traitement Annuel', detail: '3 visites incluses + vérification complète • Garantie 1 an' },
                                ] : [
                                    { name: 'Regular Treatment', detail: 'Bait installation • 1 month follow-up • 6 month warranty' },
                                    { name: 'Premium Treatment', detail: 'Trapping + exterior perimeter + attic • 6 month warranty' },
                                    { name: 'Complete Sealing & Blocking', detail: 'Silicone + mesh + elimination • 2 yr mice / 5 yr materials warranty' },
                                    { name: 'Monthly Service', detail: 'Regular maintenance, bait stations and traps' },
                                    { name: 'Quarterly Service', detail: 'Preventive control 4x/year' },
                                    { name: 'Annual Treatment', detail: '3 visits included + full inspection • 1 year warranty' },
                                ],
                            },
                            {
                                id: 'guepes',
                                icon: '🐝',
                                color: 'yellow',
                                title: language === 'fr' ? 'Guêpes & Insectes Extérieurs' : 'Wasps & Outdoor Insects',
                                subtitle: language === 'fr' ? 'Nids, arrosage préventif, plan saisonnier' : 'Nests, preventive spraying, seasonal plan',
                                options: language === 'fr' ? [
                                    { name: 'Traitement Nid de Guêpes', detail: 'Traitement + extraction si possible • Garantie 3 mois' },
                                    { name: 'Nid de Terre', detail: 'Élimination ciblée nids au sol • Garantie 3 mois' },
                                    { name: 'Service Complet Guêpes', detail: 'Intérieur + 2 traitements ext. + calfeutrage • Garantie 1 an' },
                                    { name: 'Arrosage Extérieur', detail: 'Soffites, portes, fenêtres, périmètre — Dragnet (perméthrine)' },
                                    { name: 'Plan Annuel Arrosage', detail: '2 traitements saisonniers (guêpes, fourmis, araignées) • Garantie saison' },
                                ] : [
                                    { name: 'Wasp Nest Treatment', detail: 'Treatment + extraction if possible • 3 month warranty' },
                                    { name: 'Ground Nest', detail: 'Targeted ground nest elimination • 3 month warranty' },
                                    { name: 'Complete Wasp Service', detail: 'Interior + 2 exterior treatments + sealing • 1 year warranty' },
                                    { name: 'Exterior Spraying', detail: 'Soffits, doors, windows, perimeter — Dragnet (permethrin)' },
                                    { name: 'Annual Spraying Plan', detail: '2 seasonal treatments (wasps, ants, spiders) • Season warranty' },
                                ],
                            },
                            {
                                id: 'fourmis',
                                icon: '🐜',
                                color: 'orange',
                                title: language === 'fr' ? 'Fourmis Charpentières' : 'Carpenter Ants',
                                subtitle: language === 'fr' ? 'Appâtage spécialisé, traitement extérieur renforcé' : 'Specialized baiting, reinforced exterior treatment',
                                options: language === 'fr' ? [
                                    { name: 'Forfait Standard (640$)', detail: '2 appâtages intérieur/extérieur + 1 traitement ext. • Garantie 3 mois' },
                                    { name: 'Forfait Premium (975$)', detail: '2 appâtages + 3 traitements extérieurs • Garantie 1 an' },
                                ] : [
                                    { name: 'Standard Package ($640)', detail: '2 interior/exterior baiting + 1 exterior treatment • 3 month warranty' },
                                    { name: 'Premium Package ($975)', detail: '2 baiting sessions + 3 exterior treatments • 1 year warranty' },
                                ],
                            },
                            {
                                id: 'coquerelles',
                                icon: '🪳',
                                color: 'red',
                                title: language === 'fr' ? 'Coquerelles' : 'Cockroaches',
                                subtitle: language === 'fr' ? 'Traitement appât ou choc selon le niveau d\'infestation' : 'Bait or intensive treatment based on infestation level',
                                options: language === 'fr' ? [
                                    { name: 'Traitement Appât', detail: 'Cuisine, salle de bain, électroménagers • Élimination progressive de la colonie' },
                                    { name: 'Traitement Choc', detail: 'Aérosol + liquide + poudre dans murs et fissures • Suivi hebdomadaire • Garantie 1 an' },
                                ] : [
                                    { name: 'Bait Treatment', detail: 'Kitchen, bathroom, appliances • Progressive colony elimination' },
                                    { name: 'Intensive Treatment', detail: 'Aerosol + liquid + powder in walls & cracks • Weekly follow-up • 1 year warranty' },
                                ],
                            },
                            {
                                id: 'punaises',
                                icon: '🐞',
                                color: 'pink',
                                title: language === 'fr' ? 'Punaises de Lit' : 'Bed Bugs',
                                subtitle: language === 'fr' ? 'Traitement chimique ou biologique, inspection canine disponible' : 'Chemical or biological treatment, canine inspection available',
                                options: language === 'fr' ? [
                                    { name: 'Traitement Dragnet + Konk', detail: 'Moulures, fissures + Konk 407 effet immédiat • Élimination larves et punaises' },
                                    { name: 'Traitement Aprehend (biologique)', detail: 'Actif jusqu\'à 3 mois • Transmission entre punaises • Mortalité en 4–7 jours' },
                                    { name: 'Inspection Canine', detail: 'Chien détecteur spécialisé punaises de lit' },
                                ] : [
                                    { name: 'Dragnet + Konk Treatment', detail: 'Moldings, cracks + Konk 407 immediate effect • Eliminates larvae & bugs' },
                                    { name: 'Aprehend (biological)', detail: 'Active up to 3 months • Spreads between bugs • Mortality in 4–7 days' },
                                    { name: 'Canine Inspection', detail: 'Specialized bed bug detection dog' },
                                ],
                            },
                            {
                                id: 'animaux',
                                icon: '🦝',
                                color: 'green',
                                title: language === 'fr' ? 'Animaux Sauvages' : 'Wildlife',
                                subtitle: language === 'fr' ? 'Capture, blocage, surveillance avec caméra' : 'Trapping, blocking, camera surveillance',
                                options: language === 'fr' ? [
                                    { name: 'Capture & Relocalisation', detail: 'Écureuil, marmotte, moufette, rat • Relocalisation +20 km • Suivi jusqu\'à capture' },
                                    { name: 'Blocage Marmotte / Moufette', detail: 'Tranchée 2pi × 2pi + grillage galvanisé • Garantie 5 ans' },
                                    { name: 'Installation Cage + Caméra', detail: 'Cage + caméra de surveillance • Suivi jusqu\'à résolution' },
                                ] : [
                                    { name: 'Capture & Relocation', detail: 'Squirrel, groundhog, skunk, rat • Relocation +20 km • Follow-up until caught' },
                                    { name: 'Groundhog / Skunk Blocking', detail: '2ft × 2ft trench + galvanized mesh • 5 year warranty' },
                                    { name: 'Cage + Camera Install', detail: 'Cage + surveillance camera • Follow-up until resolved' },
                                ],
                            },
                            {
                                id: 'inspection',
                                icon: '🔍',
                                color: 'gray',
                                title: language === 'fr' ? 'Inspection & Prévention' : 'Inspection & Prevention',
                                subtitle: language === 'fr' ? 'Diagnostic complet, ouverture de dossier' : 'Full diagnosis, file opening',
                                options: language === 'fr' ? [
                                    { name: 'Inspection Complète', detail: 'Identification du type et niveau d\'infestation' },
                                    { name: 'Ouverture de Dossier', detail: 'Analyse initiale + suivi administratif • Dossier valide 6 mois' },
                                ] : [
                                    { name: 'Full Inspection', detail: 'Identifies pest type and infestation level' },
                                    { name: 'File Opening', detail: 'Initial analysis + administrative follow-up • File valid 6 months' },
                                ],
                            },
                        ] as const).map((cat) => {
                            const colorMap: Record<string, { bg: string; border: string; icon: string; badge: string; btn: string }> = {
                                blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'bg-blue-100',   badge: 'bg-blue-100 text-blue-700',   btn: 'bg-blue-600 hover:bg-blue-700' },
                                yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'bg-yellow-100', badge: 'bg-yellow-100 text-yellow-700', btn: 'bg-yellow-500 hover:bg-yellow-600' },
                                orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100', badge: 'bg-orange-100 text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700' },
                                red:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'bg-red-100',    badge: 'bg-red-100 text-red-700',       btn: 'bg-red-600 hover:bg-red-700' },
                                pink:   { bg: 'bg-pink-50',   border: 'border-pink-200',   icon: 'bg-pink-100',   badge: 'bg-pink-100 text-pink-700',     btn: 'bg-pink-600 hover:bg-pink-700' },
                                green:  { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'bg-green-100',  badge: 'bg-green-100 text-green-700',   btn: 'bg-green-600 hover:bg-green-700' },
                                gray:   { bg: 'bg-gray-50',   border: 'border-gray-200',   icon: 'bg-gray-100',   badge: 'bg-gray-100 text-gray-700',     btn: 'bg-gray-700 hover:bg-gray-800' },
                            };
                            const c = colorMap[cat.color];
                            return (
                                <div key={cat.id} className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden`}>
                                    {/* Category header */}
                                    <div className="flex items-center justify-between px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center text-xl`}>
                                                {cat.icon}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-base">{cat.title}</h3>
                                                <p className="text-xs text-gray-500">{cat.subtitle}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => router.push(`/booking/${token}`)}
                                            className={`hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold ${c.btn} transition-colors`}
                                        >
                                            {language === 'fr' ? 'Réserver' : 'Book'}
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Options list */}
                                    <div className="px-5 pb-5 grid gap-2 sm:grid-cols-2">
                                        {cat.options.map((opt, i) => (
                                            <button
                                                key={i}
                                                onClick={() => router.push(`/booking/${token}?cat=${cat.id}&service=${encodeURIComponent(opt.name)}`)}
                                                className="text-left bg-white rounded-xl border border-white/80 shadow-sm px-4 py-3 hover:shadow-md hover:-translate-y-0.5 transition-all group"
                                            >
                                                <div className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors mb-0.5">
                                                    {opt.name}
                                                </div>
                                                <div className="text-xs text-gray-500 leading-relaxed">{opt.detail}</div>
                                                <div className="mt-1.5 text-[11px] font-semibold text-indigo-500">Réserver ce service →</div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Mobile book button */}
                                    <div className="sm:hidden px-5 pb-5">
                                        <button
                                            onClick={() => router.push(`/booking/${token}?cat=${cat.id}`)}
                                            className={`w-full py-2.5 rounded-xl text-white text-sm font-semibold ${c.btn} transition-colors flex items-center justify-center gap-2`}
                                        >
                                            {language === 'fr' ? 'Réserver ce service' : 'Book this service'}
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ── Garantie & Statistiques ── */}
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Guarantee card */}
                    {(warrantyActive || warrantyExpiredRecently) && (
                        <div className={`md:col-span-2 rounded-xl border p-5 ${warrantyActive ? 'bg-white border-gray-200' : 'bg-amber-50 border-amber-200'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className={`w-5 h-5 ${warrantyActive ? (warrantyDaysLeft! <= 30 ? 'text-amber-500' : 'text-emerald-500') : 'text-gray-400'}`} />
                                    <span className="font-semibold text-gray-900 text-sm">
                                        {language === 'fr' ? 'Garantie' : 'Warranty'}
                                    </span>
                                </div>
                                {latestWarranty && (
                                    <span className="text-xs text-gray-500">
                                        {language === 'fr' ? 'Expire le' : 'Expires'} {format(latestWarranty, 'd MMM yyyy')}
                                    </span>
                                )}
                            </div>
                            {warrantyActive ? (
                                <>
                                    <p className={`text-2xl font-bold mb-2 ${warrantyDaysLeft! <= 7 ? 'text-red-600' : warrantyDaysLeft! <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {warrantyDaysLeft} {language === 'fr' ? 'jours restants' : 'days remaining'}
                                    </p>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${warrantyDaysLeft! <= 7 ? 'bg-red-500' : warrantyDaysLeft! <= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.min(100, Math.max(2, (warrantyDaysLeft! / 365) * 100))}%` }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <p className="text-sm font-medium text-amber-800 mb-2">
                                        {language === 'fr' ? `Garantie expirée il y a ${Math.abs(warrantyDaysLeft!)} jours` : `Warranty expired ${Math.abs(warrantyDaysLeft!)} days ago`}
                                    </p>
                                    <a
                                        href={`/booking/${token}`}
                                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
                                    >
                                        {language === 'fr' ? 'Renouveler' : 'Renew service'}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Visit counter */}
                    {totalVisits > 0 && (
                        <div className="rounded-xl border bg-white border-gray-200 p-5">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                {language === 'fr' ? 'Visites' : 'Visits'}
                            </p>
                            <p className="text-3xl font-bold text-gray-900">{completedVisits}<span className="text-lg text-gray-400">/{totalVisits}</span></p>
                            <p className="text-xs text-gray-400 mt-1">{language === 'fr' ? 'complétées' : 'completed'}</p>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full transition-all"
                                    style={{ width: totalVisits > 0 ? `${(completedVisits / totalVisits) * 100}%` : '0%' }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Devis ── */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-amber-600" />
                        {language === 'fr' ? 'Soumissions' : 'Quotes'}
                    </h2>

                    {client?.quotes?.length === 0 ? (
                        <div className="bg-white rounded-xl p-6 text-center border border-gray-200 text-gray-400 text-sm">
                            {language === 'fr' ? 'Aucune soumission active.' : 'No active quotes.'}
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {client?.quotes?.map((quote: any) => (
                                <div key={quote.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-semibold text-gray-900">
                                                {language === 'fr' ? 'Soumission' : 'Quote'} #{quote.number || quote.id.slice(0, 8)}
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                {format(new Date(quote.issuedDate), "d MMM yyyy")} • {quote.total.toFixed(2)}$
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${quote.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                                                    quote.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {quote.status}
                                            </span>
                                            {['DRAFT', 'SENT'].includes(quote.status) && (
                                                <button
                                                    onClick={() => router.push(`/portal/${token}/quote/${quote.id}`)}
                                                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    {language === 'fr' ? 'Voir & Répondre' : 'View & Respond'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Invoices Section */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        Invoices
                    </h2>

                    {invoices.length === 0 ? (
                        <div className="bg-white rounded-lg p-6 text-center border text-gray-500 text-sm">
                            No invoices found.
                        </div>
                    ) : (
                        <div className="bg-white shadow rounded-lg overflow-hidden border">
                            <ul className="divide-y divide-gray-200">
                                {invoices.map((inv) => (
                                    <li key={inv.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex justify-between items-center flex-wrap gap-4">
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    Invoice #{inv.number || inv.id.slice(0, 8)}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {format(new Date(inv.issuedDate), "d MMM yyyy")} • Total: ${inv.total.toFixed(2)}
                                                </div>
                                                {inv.status === 'PAID' && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                                                        Paid
                                                    </span>
                                                )}
                                                {inv.status !== 'PAID' && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                                                        Balance: ${(inv.total - (inv.amountPaid || 0)).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => router.push(`/portal/${token}/invoice/${inv.id}`)}
                                                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 bg-blue-50 px-3 py-1.5 rounded"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Voir
                                                </button>
                                                {inv.status !== 'PAID' && (inv.total - (inv.amountPaid || 0)) > 0 && (
                                                    <button
                                                        onClick={() => handlePayment(inv)}
                                                        disabled={isPayingId === inv.id}
                                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                                    >
                                                        <CreditCard className="h-4 w-4 mr-2" />
                                                        {isPayingId === inv.id ? "..." : "Pay Now"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>

                {/* 🔥 Bulletproof Step 3: WOW Progress Bar for Annual Plan */}
                {(() => {
                    const annualPlanJobs = jobs.filter(j => 
                        new Date(j.scheduledAt).getFullYear() === new Date().getFullYear() &&
                        j.products?.some((p: any) => 
                            p.product?.name?.toLowerCase().includes('plan annuel') || 
                            p.product?.name?.toLowerCase().includes('deux traitements') || 
                            p.product?.name?.toLowerCase().includes('2 traitements')
                        )
                    );

                    if (annualPlanJobs.length === 0) return null;

                    const totalAnnual = annualPlanJobs.length;
                    const completedAnnual = annualPlanJobs.filter(j => j.status === 'COMPLETED').length;
                    const percent = Math.round((completedAnnual / totalAnnual) * 100);

                    return (
                        <section className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6 sm:p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <ShieldCheck className="w-6 h-6 text-indigo-600" />
                                <h2 className="text-xl font-bold text-indigo-900">
                                    {language === 'fr' ? `Votre Plan Annuel ${new Date().getFullYear()}` : `Your Annual Plan ${new Date().getFullYear()}`}
                                </h2>
                            </div>
                            <p className="text-indigo-700/80 text-sm mb-6 max-w-2xl">
                                {language === 'fr' 
                                  ? "Garantie de tranquillité d'esprit : suivez l'avancement de vos traitements préventifs saisonniers."
                                  : "Peace of mind guarantee: track the progress of your seasonal preventive treatments."}
                            </p>

                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-sm font-semibold text-indigo-800">
                                    {language === 'fr' ? 'Progression des Visites' : 'Visit Progress'}
                                </span>
                                <span className="text-sm font-bold text-indigo-600">
                                    {completedAnnual} / {totalAnnual} {language === 'fr' ? 'complétés' : 'completed'}
                                </span>
                            </div>
                            
                            <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden border border-indigo-100/50 shadow-inner">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-1000 relative"
                                    style={{ width: `${percent}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
                                </div>
                            </div>
                        </section>
                    );
                })()}

                {/* Upcoming */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-indigo-600" />
                        {p.upcoming}
                    </h2>

                    {upcomingJobs.length === 0 ? (
                        <div className="bg-white rounded-lg p-8 text-center border text-gray-500">
                            {p.noUpcoming}
                            <div className="mt-4">
                                <a
                                    href={`/booking/${token}`}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {p.bookService}
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                            {upcomingJobs.map(job => {
                                const jobDate = new Date(job.scheduledAt);
                                const isCancellable = isAfter(jobDate, addHours(new Date(), 24));
                                const products = job.products?.map((p: any) => p.product.name).join(", ");

                                return (
                                    <div key={job.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                        <div className="p-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-semibold text-lg text-gray-900">
                                                        {format(jobDate, "EEEE, d MMM yyyy")}
                                                    </div>
                                                    <div className="text-gray-500 flex items-center gap-1 mt-1">
                                                        <Clock className="h-4 w-4" />
                                                        {format(jobDate, "HH:mm")} ({job.durationMinutes || 60}m)
                                                    </div>
                                                    <div className="text-gray-600 mt-2 font-medium">
                                                        {products || "Service"}
                                                    </div>
                                                    {job.property && (
                                                        <div className="text-sm text-gray-400 mt-1">
                                                            {job.property.address}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                                                    {job.status}
                                                </div>
                                            </div>

                                            <div className="mt-6 flex border-t pt-4 gap-3">
                                                {isCancellable ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleReschedule(job.id)}
                                                            disabled={processing === job.id}
                                                            className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-md text-sm font-medium transition-colors"
                                                        >
                                                            {p.reschedule}
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancel(job.id)}
                                                            disabled={processing === job.id}
                                                            className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2 px-4 rounded-md text-sm font-medium transition-colors"
                                                        >
                                                            {processing === job.id ? p.processing : p.cancel}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="w-full text-center text-sm text-amber-600 bg-amber-50 py-2 rounded">
                                                        {p.tooLate}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* History */}
                {pastJobs.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 text-gray-500">
                            {p.history}
                        </h2>
                        <div className="bg-white shadow rounded-lg overflow-hidden border">
                            <ul className="divide-y divide-gray-200">
                                {pastJobs.map(job => {
                                    const jobDate = new Date(job.scheduledAt);

                                    return (
                                        <li key={job.id} className="hover:bg-gray-50 transition-colors">
                                            <div className="p-4 flex justify-between items-center group cursor-pointer" onClick={() => router.push(`/portal/${token}/job/${job.id}`)}>
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900 flex items-center gap-2">
                                                        <span>{format(jobDate, "d MMM yyyy")}</span>
                                                        <span className="text-gray-400">|</span>
                                                        <span className="text-gray-700 group-hover:text-indigo-600 transition-colors">
                                                            {job.products?.map((p: any) => p.product.name).join(", ") || "Service"}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {job.property?.address}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        {job.status === 'CANCELLED' ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                {p.cancelled}
                                                            </span>
                                                        ) : job.status === 'COMPLETED' ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                {p.completed}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                                {job.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-gray-400 group-hover:text-indigo-600 transition-colors flex items-center gap-1 text-sm font-medium">
                                                        Voir Rapport <Eye className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </section>
                )}


            </main >
        </div >
    );
}
