"use client";

import { useState } from "react";
import { X, UploadCloud, AlertCircle, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Papa from "papaparse";
import { importGorillaDeskClients } from "@/app/actions/import-clients-action";
import { useLanguage } from "@/components/providers/language-provider";
import { useDivision } from "@/components/providers/division-provider";

export function ClientImportDialog({
    isOpen,
    onClose,
    onSuccess
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { language } = useLanguage();
    const isFr = language === "fr";
    const { division } = useDivision();

    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [preview, setPreview] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);

    // Column mapping logic. We try to auto-guess GorillaDesk column names
    const [mapping, setMapping] = useState<{
        name: string;
        email: string;
        phone: string;
        billingAddress: string;
        propertyAddress: string;
    }>({
        name: "",
        email: "",
        phone: "",
        billingAddress: "",
        propertyAddress: ""
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            parseFile(selected);
        }
    };

    const parseFile = (fileToParse: File) => {
        setIsParsing(true);
        Papa.parse(fileToParse, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as any[];
                if (data.length > 0) {
                    const fields = results.meta.fields || [];
                    setHeaders(fields);
                    setPreview(data.slice(0, 3)); // show first 3 rows

                    // Auto-detect columns (GorillaDesk specific if possible)
                    const guessColumn = (keywords: string[]) => {
                        return fields.find(f => keywords.some(k => f.toLowerCase().includes(k))) || "";
                    };

                    setMapping({
                        // Sometimes GorillaDesk uses 'First Name' 'Last Name' or just 'Name' or 'Company'
                        name: guessColumn(["name", "nom", "company", "client"]),
                        email: guessColumn(["email", "courriel"]),
                        phone: guessColumn(["phone", "téléphone", "mobile", "cell"]),
                        billingAddress: guessColumn(["billing", "facturation", "address 1", "adresse"]),
                        propertyAddress: guessColumn(["property", "service address", "service", "address 1", "adresse"])
                    });
                } else {
                    toast.error(isFr ? "Le fichier semble vide" : "The file seems empty");
                }
                setIsParsing(false);
            },
            error: (err) => {
                toast.error("Erreur de lecture du fichier CSV");
                setIsParsing(false);
            }
        });
    };

    const handleImport = async () => {
        if (!mapping.name && !mapping.propertyAddress) {
            toast.error(isFr ? "Veuillez au moins associer la colonne Nom" : "Please map at least the Name column");
            return;
        }

        setIsImporting(true);
        const tid = toast.loading(isFr ? "Importation en cours... (Cela peut prendre un moment)" : "Importing... (This may take a while)");

        try {
            // Re-parse whole file to get all data (we didn't store all in state if it's huge)
            const csvText = await file!.text();
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    const rows = results.data as any[];
                    // Transform based on mapping
                    const mappedData = rows.map(row => {
                        // Concatenate First/Last name if GorillaDesk separated them
                        let finalName = row[mapping.name] || "";
                        if (!finalName && headers.includes("First Name") && headers.includes("Last Name")) {
                            finalName = `${row["First Name"] || ""} ${row["Last Name"] || ""}`.trim();
                        }
                        return {
                            name: finalName || "Client Inconnu",
                            email: row[mapping.email] || undefined,
                            phone: row[mapping.phone] || undefined,
                            billingAddress: row[mapping.billingAddress] || undefined,
                            propertyAddress: row[mapping.propertyAddress] || undefined,
                        };
                    });

                    // Send to server
                    const res = await importGorillaDeskClients(mappedData, division as any);
                    if (res.success) {
                        toast.success(
                            isFr ? `Importé avec succès: ${res.imported} clients (${res.errors} erreurs)`
                                : `Successfully imported: ${res.imported} clients (${res.errors} errors)`,
                            { id: tid }
                        );
                        onSuccess();
                        handleClose();
                    } else {
                        toast.error(res.error || "Erreur d'import", { id: tid });
                    }
                    setIsImporting(false);
                }
            });

        } catch (e) {
            console.error(e);
            toast.error("Erreur générale lors de l'importation", { id: tid });
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreview([]);
        setHeaders([]);
        setMapping({ name: "", email: "", phone: "", billingAddress: "", propertyAddress: "" });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            {isFr ? "Importer des clients (GorillaDesk / Excel)" : "Import Clients (GorillaDesk / Excel)"}
                        </h2>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                    {!file ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => document.getElementById('csv-upload')?.click()}>
                            <UploadCloud className="w-10 h-10 text-emerald-500 mb-3" />
                            <p className="font-medium text-gray-900 mb-1">
                                {isFr ? "Cliquez pour uploader un fichier CSV" : "Click to upload a CSV file"}
                            </p>
                            <p className="text-sm text-gray-500 text-center">
                                {isFr ? "Exportez vos clients depuis GorillaDesk sous format CSV (.csv) et déposez-le ici." : "Export your clients from GorillaDesk in CSV format and drop it here."}
                            </p>
                            <input
                                type="file"
                                id="csv-upload"
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm">
                                <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {(file.size / 1024).toFixed(1)} KB — {headers.length} colonnes détectées
                                    </p>
                                </div>
                                <button onClick={() => setFile(null)} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 bg-red-50 rounded">
                                    {isFr ? "Retirer" : "Remove"}
                                </button>
                            </div>

                            <div className="bg-white border rounded-lg p-5 shadow-sm space-y-4">
                                <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-emerald-500" />
                                    {isFr ? "Associer les colonnes (Mapping)" : "Map columns"}
                                </h3>

                                <p className="text-xs text-gray-500">
                                    {isFr
                                        ? "Nous avons tenté de deviner automatiquement les colonnes de GorillaDesk. Vérifiez ci-dessous si c'est correct."
                                        : "We tried to auto-guess GorillaDesk columns. Please verify below."}
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { key: "name", label: isFr ? "Nom complet / Compagnie" : "Full Name / Company" },
                                        { key: "email", label: "Email" },
                                        { key: "phone", label: isFr ? "Téléphone" : "Phone" },
                                        { key: "billingAddress", label: isFr ? "Adresse de facturation" : "Billing Address" },
                                        { key: "propertyAddress", label: isFr ? "Adresse de service (Propriété)" : "Service Address (Property)" },
                                    ].map(field => (
                                        <div key={field.key} className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-700">{field.label}</label>
                                            <select
                                                value={(mapping as any)[field.key]}
                                                onChange={e => setMapping({ ...mapping, [field.key]: e.target.value })}
                                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                            >
                                                <option value="">-- {isFr ? "Ignorer" : "Ignore"} --</option>
                                                {headers.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 shrink-0">
                    <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                        {isFr ? "Annuler" : "Cancel"}
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!file || isImporting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isImporting ? (
                            isFr ? "Importation..." : "Importing..."
                        ) : (
                            <><CheckCircle2 className="w-4 h-4 mr-2" /> {isFr ? "Importer la base de données" : "Import Database"}</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
