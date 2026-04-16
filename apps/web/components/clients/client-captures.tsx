"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logCapture, deleteCaptureLog } from "@/app/actions/capture-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Info } from "lucide-react";

interface ClientCapturesProps {
    clientId: string;
    captures: any[];
}

export function ClientCaptures({ clientId, captures }: ClientCapturesProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [animalType, setAnimalType] = useState<string>("Raton laveur");
    const [assetId, setAssetId] = useState("");
    const [notes, setNotes] = useState("");
    const [customAnimal, setCustomAnimal] = useState("");

    const handleLogCapture = async () => {
        setIsSubmitting(true);
        try {
            const finalAnimal = animalType === "Autre" ? customAnimal : animalType;
            if (!finalAnimal) {
                toast.error("Veuillez spécifier l'animal");
                return;
            }

            await logCapture({
                clientId,
                animalType: finalAnimal,
                assetId: assetId || undefined,
                notes: notes || undefined
            });

            toast.success("Capture ajoutée au registre");
            setAnimalType("Raton laveur");
            setCustomAnimal("");
            setAssetId("");
            setNotes("");
        } catch (error) {
            toast.error("Erreur lors de l'enregistrement de la capture");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer cette capture du registre ?")) return;
        try {
            await deleteCaptureLog(id, clientId);
            toast.success("Capture supprimée");
        } catch (error) {
            toast.error("Erreur lors de la suppression");
        }
    };

    const unbilledCount = captures.filter(c => !c.isBilled).length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                <div>
                    <h3 className="text-emerald-900 font-bold flex items-center gap-2">
                        <span>🦝</span> Registre de Trappe / Capture
                    </h3>
                    <p className="text-emerald-700 text-sm mt-1">Le système facturera automatiquement un maximum de 4 captures (Prix de famille).</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black text-emerald-700">{unbilledCount}</div>
                    <div className="text-xs font-semibold text-emerald-600 uppercase">Non-facturées</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-5 shadow-sm h-fit">
                    <h4 className="font-bold text-gray-900 mb-4 border-b pb-2">Ajouter une capture</h4>
                    
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label>Type d'animal</Label>
                            <Select value={animalType} onValueChange={setAnimalType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un animal" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Raton laveur">Raton laveur</SelectItem>
                                    <SelectItem value="Moufette">Moufette</SelectItem>
                                    <SelectItem value="Marmotte">Marmotte</SelectItem>
                                    <SelectItem value="Écureuil">Écureuil</SelectItem>
                                    <SelectItem value="Oiseau">Oiseau</SelectItem>
                                    <SelectItem value="Chauve-souris">Chauve-souris</SelectItem>
                                    <SelectItem value="Autre">Autre...</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {animalType === "Autre" && (
                            <div className="space-y-1">
                                <Label>Spécifiez l'animal</Label>
                                <Input 
                                    value={customAnimal} 
                                    onChange={(e) => setCustomAnimal(e.target.value)} 
                                    placeholder="Ex: Porc-épic" 
                                />
                            </div>
                        )}

                        <div className="space-y-1">
                            <Label className="flex justify-between">
                                <span>Tag de la Cage (optionnel)</span>
                            </Label>
                            <Input 
                                value={assetId} 
                                onChange={(e) => setAssetId(e.target.value)} 
                                placeholder="ex: CR-01" 
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Notes (optionnel)</Label>
                            <Input 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)} 
                                placeholder="Détails supplémentaires" 
                            />
                        </div>

                        <Button 
                            className="w-full bg-emerald-600 hover:bg-emerald-700" 
                            onClick={handleLogCapture}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Ajout..." : <><Plus className="w-4 h-4 mr-2" /> Logger la capture</>}
                        </Button>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
                        {captures.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                                <span className="text-4xl mb-2 opacity-50">🐾</span>
                                Aucune capture enregistrée pour ce client.
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {captures.map((cap) => (
                                    <li key={cap.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                                        <div className="flex gap-4 items-center">
                                            <div className="bg-gray-100 p-2 rounded-lg text-lg">
                                                {cap.animalType.toLowerCase().includes('raton') ? '🦝' :
                                                 cap.animalType.toLowerCase().includes('oiseau') ? '🐦' :
                                                 cap.animalType.toLowerCase().includes('chauve') ? '🦇' :
                                                 cap.animalType.toLowerCase().includes('moufette') ? '🦨' :
                                                 cap.animalType.toLowerCase().includes('écureuil') ? '🐿️' : '🐾'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 flex items-center gap-2">
                                                    Capture : {cap.animalType}
                                                    {!cap.isBilled && <span className="w-2 h-2 rounded-full bg-orange-400" title="Non-facturée"></span>}
                                                </div>
                                                <div className="text-xs text-gray-500 font-medium mt-0.5">
                                                    {format(new Date(cap.caughtAt), "PPP p")} 
                                                    {cap.assetId && <span className="ml-2 text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Cage {cap.assetId}</span>}
                                                </div>
                                                {cap.notes && <div className="text-sm text-gray-600 mt-1 italic">"{cap.notes}"</div>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {cap.isBilled ? (
                                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 uppercase text-[10px]">Facturé</Badge>
                                            ) : (
                                                <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 uppercase text-[10px]">Non-Facturé</Badge>
                                            )}
                                            
                                            <button 
                                                onClick={() => handleDelete(cap.id)}
                                                className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
