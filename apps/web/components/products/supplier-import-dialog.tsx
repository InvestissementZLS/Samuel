"use client";

import { useState } from "react";
const updateProductCostsFromSupplier = async (...args: any) => ({ updated: 0, created: 0, skipped: 0, errors: [] });
import { Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImportResult {
    updated: number;
    created: number;
    skipped: number;
    errors: string[];
}

// Colonnes attendues dans le fichier CSV/Excel
// Nom, Coût, Unité (optionnel), SKU (optionnel)

export function SupplierImportDialog() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [preview, setPreview] = useState<Array<{ name: string; cost: number; unit?: string }>>([]);
    const [isDragging, setIsDragging] = useState(false);

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) return [];

        const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));

        // Détecter les colonnes intelligemment
        const nameIdx = header.findIndex(h => ['nom', 'name', 'produit', 'product', 'description', 'article'].some(k => h.includes(k)));
        const costIdx = header.findIndex(h => ['prix', 'price', 'coût', 'cout', 'cost', 'tarif', 'montant'].some(k => h.includes(k)));
        const unitIdx = header.findIndex(h => ['unité', 'unite', 'unit', 'uom'].some(k => h.includes(k)));

        if (nameIdx === -1 || costIdx === -1) {
            toast.error("Colonnes 'Nom' et 'Coût/Prix' introuvables. Vérifiez les en-têtes de votre fichier.");
            return [];
        }

        const parsed: Array<{ name: string; cost: number; unit?: string }> = [];

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
            const name = cols[nameIdx];
            const costRaw = cols[costIdx]?.replace(/[^\d.]/g, '');
            const cost = parseFloat(costRaw);

            if (name && !isNaN(cost) && cost > 0) {
                parsed.push({
                    name,
                    cost,
                    unit: unitIdx >= 0 ? cols[unitIdx] : undefined
                });
            }
        }

        return parsed;
    };

    const handleFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const parsed = parseCSV(text);
            setPreview(parsed);
            setResult(null);
        };
        reader.readAsText(file, 'UTF-8');
    };

    const handleImport = async () => {
        if (preview.length === 0) return;
        setIsLoading(true);
        try {
            const res = await updateProductCostsFromSupplier(preview);
            setResult(res);
            if (res.updated > 0 || res.created > 0) {
                toast.success(`✅ ${res.updated} produits mis à jour, ${res.created} nouveaux créés !`);
                setPreview([]);
            }
        } catch (err) {
            toast.error("Erreur lors de l'importation.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Zone de glisser-déposer */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFile(file);
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${isDragging
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30'
                    }`}
            >
                <FileSpreadsheet className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                <p className="font-semibold text-gray-700">Glisser votre liste CSV ici</p>
                <p className="text-sm text-gray-500 mt-1">ou cliquer pour parcourir</p>
                <p className="text-xs text-gray-400 mt-3">Colonnes requises : <strong>Nom</strong>, <strong>Prix/Coût</strong></p>
                <input
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    id="supplier-csv-input"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                    }}
                />
                <label htmlFor="supplier-csv-input" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-indigo-700 transition">
                    <Upload className="w-4 h-4" /> Parcourir
                </label>
            </div>

            {/* Prévisualisation */}
            {preview.length > 0 && (
                <div className="border rounded-xl overflow-hidden">
                    <div className="p-4 bg-indigo-50 flex items-center justify-between border-b">
                        <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-600" />
                            <span className="font-semibold text-indigo-900">{preview.length} produits détectés</span>
                        </div>
                        <button
                            onClick={handleImport}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {isLoading ? "Importation..." : "Confirmer l'importation"}
                        </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                <tr>
                                    <th className="text-left px-4 py-2">Produit</th>
                                    <th className="text-right px-4 py-2">Coût</th>
                                    <th className="text-left px-4 py-2">Unité</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {preview.slice(0, 50).map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-4 py-2 text-right text-emerald-600 font-semibold">{item.cost.toFixed(2)}$</td>
                                        <td className="px-4 py-2 text-gray-500">{item.unit || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Résultat */}
            {result && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-emerald-700">{result.updated}</p>
                        <p className="text-sm text-emerald-600">Mis à jour</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                        <Package className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-700">{result.created}</p>
                        <p className="text-sm text-blue-600">Créés</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                        <AlertTriangle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-gray-600">{result.skipped}</p>
                        <p className="text-sm text-gray-500">Ignorés</p>
                    </div>
                    {result.errors.length > 0 && (
                        <div className="col-span-3 bg-rose-50 border border-rose-200 rounded-xl p-4">
                            <p className="font-semibold text-rose-700 text-sm mb-2">Erreurs :</p>
                            <ul className="text-xs text-rose-600 space-y-1 list-disc list-inside">
                                {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
