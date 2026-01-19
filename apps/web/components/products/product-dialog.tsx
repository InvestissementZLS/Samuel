"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { createProduct, updateProduct, deleteProduct, getConsumables, getServices, getProductDetails } from "@/app/actions/product-actions";
import { Product } from "@prisma/client";
import { Trash2, Plus } from "lucide-react";
import { UnitCostCalculator } from "./unit-cost-calculator";
import { useLanguage } from "@/components/providers/language-provider";

interface ProductDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product?: Product | null;
    fixedType?: "CONSUMABLE" | "EQUIPMENT" | "SERVICE";
}

export function ProductDialog({ isOpen, onClose, product, fixedType }: ProductDialogProps) {
    const { t, language } = useLanguage();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [usageDescription, setUsageDescription] = useState("");
    const [activeIngredient, setActiveIngredient] = useState("");
    const [recommendedConcentration, setRecommendedConcentration] = useState("");
    const [unit, setUnit] = useState("ml");
    const [stock, setStock] = useState(0);
    const [price, setPrice] = useState(0);
    const [cost, setCost] = useState(0);
    const [division, setDivision] = useState<"EXTERMINATION" | "ENTREPRISES">("EXTERMINATION");
    const [type, setType] = useState<"CONSUMABLE" | "EQUIPMENT" | "SERVICE">("CONSUMABLE");
    const [isCommissionEligible, setIsCommissionEligible] = useState(false);
    const [warrantyInfo, setWarrantyInfo] = useState("");
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [minTechnicians, setMinTechnicians] = useState(1);
    const [materials, setMaterials] = useState<{ id: string; quantity: number }[]>([]);

    // Recurring Blueprint & Seasonality
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceIntervalDays, setRecurrenceIntervalDays] = useState(14);
    const [numberOfVisits, setNumberOfVisits] = useState(1);
    const [preparationListUrl, setPreparationListUrl] = useState("");

    const [seasonStartMonth, setSeasonStartMonth] = useState<number | undefined>(undefined);
    const [seasonEndMonth, setSeasonEndMonth] = useState<number | undefined>(undefined);
    const [warrantyMonths, setWarrantyMonths] = useState<number | undefined>(undefined);

    // Package / Bundling
    const [isPackage, setIsPackage] = useState(false);
    // Updated Included Services Structure
    const [includedServices, setIncludedServices] = useState<{
        id: string;
        delayDays: number;
        order: number;
        seasonality: "ALL_YEAR" | "SPRING_ONLY";
        isWeatherDependent: boolean;
    }[]>([]);
    const [availableServices, setAvailableServices] = useState<{ id: string; name: string }[]>([]);

    const [containerSize, setContainerSize] = useState<number | undefined>(undefined);

    // Available Consumables
    const [availableConsumables, setAvailableConsumables] = useState<{ id: string, name: string, unit: string }[]>([]);
    const [loading, setLoading] = useState(false);

    // Warranty Templates
    const [warrantyTemplates, setWarrantyTemplates] = useState<{ id: string, name: string, text: string }[]>([]);

    useEffect(() => {
        if (type === 'SERVICE') {
            import("@/app/actions/warranty-actions").then(mod => {
                mod.getWarrantyTemplates().then(setWarrantyTemplates);
            });
            getConsumables().then(setAvailableConsumables);
            getServices().then(setAvailableServices);
        }
    }, [type]);

    useEffect(() => {
        if (isOpen) {
            if (product) {
                setName(product.name);
                setDescription(product.description || "");
                // @ts-ignore
                setUsageDescription(product.usageDescription || "");
                // @ts-ignore
                setActiveIngredient(product.activeIngredient || "");
                // @ts-ignore
                setRecommendedConcentration(product.recommendedConcentration || "");
                setUnit(product.unit);
                setStock(product.stock);
                setPrice(product.price);
                // @ts-ignore
                setCost(product.cost || 0);
                // @ts-ignore
                setDivision(product.division || "EXTERMINATION");
                // @ts-ignore
                setType(product.type || "CONSUMABLE");
                // @ts-ignore
                setIsCommissionEligible(product.isCommissionEligible || false);
                // @ts-ignore
                setWarrantyInfo(product.warrantyInfo || "");
                // @ts-ignore
                setDurationMinutes(product.durationMinutes || 60);
                // @ts-ignore
                setMinTechnicians(product.minTechnicians || 1);

                // Recurring
                // @ts-ignore
                setIsRecurring(product.isRecurring || false);
                // @ts-ignore
                setRecurrenceIntervalDays(product.recurrenceIntervalDays || 14);
                // @ts-ignore
                setNumberOfVisits(product.numberOfVisits || 1);
                // @ts-ignore
                setSeasonStartMonth(product.seasonStartMonth || undefined);
                // @ts-ignore
                setSeasonEndMonth(product.seasonEndMonth || undefined);
                // @ts-ignore
                setWarrantyMonths(product.warrantyMonths || undefined);

                // Package
                // @ts-ignore
                setIsPackage(product.isPackage || false);

                // Container Logic
                // @ts-ignore
                setContainerSize(product.containerSize || undefined);

                // Match backend structure
                getProductDetails(product.id).then(details => {
                    if (details) {
                        if (details.includedServices && details.includedServices.length > 0) {
                            // Correctly map backend includedServices to state
                            // @ts-ignore
                            setIncludedServices(details.includedServices.map((item: any) => ({
                                id: item.childProductId,
                                delayDays: item.delayDays || 0,
                                order: item.order || 1,
                                seasonality: item.seasonality || "ALL_YEAR",
                                isWeatherDependent: item.isWeatherDependent || false
                            })));
                        } else if (details.includedServices) {
                            // Legacy mapping just in case or empty
                            setIncludedServices([]);
                        }

                        if (details.materialsNeeded) {
                            setMaterials(details.materialsNeeded.map((m: any) => ({
                                id: m.materialId,
                                quantity: m.quantity
                            })));
                        }
                        // @ts-ignore
                        if (details.preparationListUrl) {
                            // @ts-ignore
                            setPreparationListUrl(details.preparationListUrl);
                        }
                    }
                });

            } else {
                setName("");
                setDescription("");
                setUsageDescription("");
                setActiveIngredient("");
                setRecommendedConcentration("");
                setUnit(fixedType === 'EQUIPMENT' ? "Pcs" : "ml");
                setStock(0);
                setPrice(0);
                setCost(0);
                setDivision("EXTERMINATION");
                setType(fixedType || "CONSUMABLE");
                setIsCommissionEligible(false);
                setWarrantyInfo("");
                setDurationMinutes(60);
                setMinTechnicians(1);

                setIsRecurring(false);
                setRecurrenceIntervalDays(14);
                setNumberOfVisits(1);
                setSeasonStartMonth(undefined);
                setSeasonEndMonth(undefined);
                setWarrantyMonths(undefined);

                setIsPackage(false);
                setIncludedServices([]);
                setContainerSize(undefined);
            }
        }
    }, [isOpen, product, fixedType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const validMaterials = materials.filter(m => m.id && m.id.trim() !== "");

        try {
            const productData = {
                name,
                description,
                unit,
                usageDescription,
                stock: Number(stock),
                price: Number(price),
                cost: Number(cost),
                division,
                type,
                isCommissionEligible,
                warrantyInfo,
                durationMinutes,
                minTechnicians,
                materials: validMaterials,
                // New Fields
                isRecurring,
                recurrenceIntervalDays,
                numberOfVisits,
                seasonStartMonth,
                seasonEndMonth,
                warrantyMonths,
                // Package
                isPackage,
                includedServices,
                containerSize: containerSize ? Number(containerSize) : undefined
            };

            if (product) {
                await updateProduct(product.id, productData);
                toast.success(t.productDialog.updateSuccess);
            } else {
                // @ts-ignore
                await createProduct({
                    ...productData,
                    activeIngredient,
                    recommendedConcentration
                });
                toast.success(t.productDialog.createSuccess);
            }
            onClose();
        } catch (error) {
            console.error("Failed to save product:", error);
            toast.error(t.productDialog.saveError);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!product || !confirm(t.productDialog.confirmDelete)) return;
        setLoading(true);
        try {
            await deleteProduct(product.id);
            toast.success(t.productDialog.deleteSuccess);
            onClose();
        } catch (error) {
            console.error("Failed to delete product:", error);
            toast.error(t.productDialog.deleteError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={product ? t.productDialog.editProduct : t.productDialog.newProduct}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">{t.products.division}</label>
                        <select
                            value={division}
                            onChange={(e) => setDivision(e.target.value as "EXTERMINATION" | "ENTREPRISES")}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                        >
                            <option value="EXTERMINATION">{t.divisions.extermination}</option>
                            <option value="ENTREPRISES">{t.divisions.entreprises}</option>
                        </select>
                    </div>
                </div>
                {!fixedType && (
                    <div>
                        <label className="block text-sm font-medium mb-1 text-foreground">{t.productDialog.type}</label>
                        <select
                            value={type}
                            onChange={(e) => {
                                const newType = e.target.value as "CONSUMABLE" | "EQUIPMENT" | "SERVICE";
                                setType(newType);
                                if (newType === 'EQUIPMENT') setUnit("Pcs");
                            }}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                        >
                            <option value="CONSUMABLE">{t.products.consumables}</option>
                            <option value="EQUIPMENT">{t.products.equipment}</option>
                            <option value="SERVICE">{t.products.services}</option>
                        </select>
                    </div>
                )}


                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">{t.products.name}</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">{t.productDialog.description}</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full rounded-md border p-2 bg-background text-foreground"
                        rows={3}
                    />
                </div>

                {type === 'SERVICE' && (
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-foreground">{t.productDialog.warrantyInfo}</label>
                            {warrantyTemplates.length > 0 && (
                                <select
                                    className="text-xs border rounded p-1 bg-background text-foreground"
                                    onChange={(e) => {
                                        const t = warrantyTemplates.find(w => w.id === e.target.value);
                                        if (t) setWarrantyInfo(t.text);
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>{t.productDialog.pasteFromTemplate}</option>
                                    {warrantyTemplates.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <textarea
                            value={warrantyInfo}
                            onChange={(e) => setWarrantyInfo(e.target.value)}
                            className="w-full rounded-md border p-2 bg-background text-foreground"
                            rows={3}
                            placeholder={t.productDialog.warrantyPlaceholder}
                        />
                    </div>
                )}

                {type === 'SERVICE' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-foreground">{t.productDialog.duration}</label>
                            <input
                                type="number"
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                                className="w-full rounded-md border p-2 bg-background text-foreground"
                                required
                                min="15"
                                step="15"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-foreground">{t.productDialog.minTechnicians}</label>
                            <input
                                type="number"
                                value={minTechnicians}
                                onChange={(e) => setMinTechnicians(Number(e.target.value))}
                                className="w-full rounded-md border p-2 bg-background text-foreground"
                                required
                                min="1"
                            />
                        </div>
                    </div>
                )}

                {/* Material Requirements (Forecasting) */}
                {type === 'SERVICE' && (
                    <div className="space-y-4 border-t pt-4 mt-4 bg-orange-50 p-2 rounded border border-orange-100">
                        <h4 className="font-medium text-sm text-orange-900 flex items-center gap-2">
                            <span>{t.productDialog.requiredMaterials}</span>
                        </h4>
                        <p className="text-xs text-orange-700">
                            {t.productDialog.forecastingDesc}
                        </p>

                        <div className="space-y-2">
                            {materials.map((mat, index) => {
                                const matInfo = availableConsumables.find(c => c.id === mat.id);
                                return (
                                    <div key={index} className="flex items-center gap-2">
                                        <select
                                            value={mat.id}
                                            onChange={(e) => {
                                                const newMaterials = [...materials];
                                                newMaterials[index].id = e.target.value;
                                                setMaterials(newMaterials);
                                            }}
                                            className="flex-1 rounded-md border p-1 text-sm"
                                        >
                                            <option value="">{t.common.select}</option>
                                            {availableConsumables.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} ({c.unit})</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={mat.quantity}
                                            onChange={(e) => {
                                                const newMaterials = [...materials];
                                                newMaterials[index].quantity = Number(e.target.value);
                                                setMaterials(newMaterials);
                                            }}
                                            className="w-20 rounded-md border p-1 text-sm"
                                            placeholder={t.productDialog.qty}
                                            step="0.01"
                                        />
                                        <span className="text-xs text-gray-500 w-8">
                                            {matInfo?.unit || ''}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newMaterials = materials.filter((_, i) => i !== index);
                                                setMaterials(newMaterials);
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                );
                            })}

                            <button
                                type="button"
                                onClick={() => setMaterials([...materials, { id: "", quantity: 0 }])}
                                className="flex items-center gap-1 text-xs font-medium text-orange-700 hover:text-orange-900"
                            >
                                <Plus className="h-3 w-3" /> {t.productDialog.addMaterial}
                            </button>
                        </div>
                    </div>
                )}

                {/* Service Blueprint: Recurring & Seasonality */}
                {type === 'SERVICE' && (
                    <div className="space-y-4 border-t pt-4 mt-4">
                        <h4 className="font-medium text-sm text-gray-900 border-b pb-2 mb-2">{t.productDialog.blueprint}</h4>

                        {/* PDS Link */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{t.productDialog.pdsUrl}</label>
                            <input
                                type="url"
                                value={preparationListUrl}
                                onChange={(e) => setPreparationListUrl(e.target.value)}
                                className="w-full rounded-md border text-black border-gray-300 p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                placeholder="https://drive.google.com/file/d/..."
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {t.productDialog.pdsDesc}
                            </p>
                        </div>

                        {/* Recurring Toggle */}
                        <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded-md border border-indigo-100">
                            <input
                                type="checkbox"
                                id="isRecurring"
                                checked={isRecurring}
                                onChange={(e) => setIsRecurring(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="isRecurring" className="text-sm font-medium text-indigo-900">{t.productDialog.enableRecurring}</label>
                        </div>

                        {/* Recurrence Settings */}
                        {isRecurring && (
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md border border-gray-200">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">{t.productDialog.visits}</label>
                                    <input
                                        type="number"
                                        value={numberOfVisits}
                                        onChange={(e) => setNumberOfVisits(Number(e.target.value))}
                                        className="w-full rounded-md border p-2 text-sm bg-white"
                                        min="2"
                                        placeholder="e.g. 3"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">1 Initial + {numberOfVisits - 1} Follow-ups</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">{t.productDialog.interval}</label>
                                    <input
                                        type="number"
                                        value={recurrenceIntervalDays}
                                        onChange={(e) => setRecurrenceIntervalDays(Number(e.target.value))}
                                        className="w-full rounded-md border p-2 text-sm bg-white"
                                        min="1"
                                        placeholder="e.g. 14"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Seasonality */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">{t.productDialog.seasonStart}</label>
                                <select
                                    value={seasonStartMonth || ""}
                                    onChange={(e) => setSeasonStartMonth(e.target.value ? Number(e.target.value) : undefined)}
                                    className="w-full rounded-md border p-2 text-sm bg-background text-foreground"
                                >
                                    <option value="">{t.productDialog.anyMonth}</option>
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString(language, { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">{t.productDialog.seasonEnd}</label>
                                <select
                                    value={seasonEndMonth || ""}
                                    onChange={(e) => setSeasonEndMonth(e.target.value ? Number(e.target.value) : undefined)}
                                    className="w-full rounded-md border p-2 text-sm bg-background text-foreground"
                                >
                                    <option value="">{t.productDialog.anyMonth}</option>
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString(language, { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Package / Bundle Configuration */}
                        <div className="space-y-4 border-t pt-4 mt-4 bg-yellow-50 p-2 rounded border border-yellow-100">
                            <h4 className="font-medium text-sm text-yellow-900 flex items-center gap-2">
                                <span className={isPackage ? "font-bold" : ""}>{t.productDialog.bundling}</span>
                            </h4>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isPackage"
                                    checked={isPackage}
                                    onChange={(e) => setIsPackage(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                                />
                                <label htmlFor="isPackage" className="text-sm font-medium text-yellow-900">
                                    {t.productDialog.isPackage}
                                </label>
                            </div>

                            {isPackage && (
                                <div className="mt-2 bg-white border rounded p-4">
                                    <h5 className="text-xs font-bold text-gray-700 uppercase mb-2">Service Timeline</h5>

                                    {/* Timeline Steps */}
                                    <div className="space-y-3 mb-4">
                                        {includedServices.sort((a, b) => a.order - b.order).map((step, index) => {
                                            const serviceName = availableServices.find(s => s.id === step.id)?.name || "Unknown Service";
                                            return (
                                                <div key={index} className="flex flex-col gap-2 p-3 bg-gray-50 border rounded text-sm relative group">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-full bg-yellow-200 text-yellow-800 flex items-center justify-center text-xs font-bold">
                                                                {index + 1}
                                                            </div>
                                                            <span className="font-medium text-gray-900">{serviceName}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newList = includedServices.filter((_, i) => i !== index);
                                                                setIncludedServices(newList);
                                                            }}
                                                            className="text-gray-400 hover:text-red-500"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                                        <div>
                                                            <label className="text-[10px] text-gray-500 uppercase block">Wait (Days)</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={step.delayDays}
                                                                onChange={e => {
                                                                    const newList = [...includedServices];
                                                                    newList[index].delayDays = Number(e.target.value);
                                                                    setIncludedServices(newList);
                                                                }}
                                                                className="w-full border rounded p-1 text-xs bg-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] text-gray-500 uppercase block">Seasonality</label>
                                                            <select
                                                                value={step.seasonality}
                                                                onChange={e => {
                                                                    const newList = [...includedServices];
                                                                    // @ts-ignore
                                                                    newList[index].seasonality = e.target.value;
                                                                    setIncludedServices(newList);
                                                                }}
                                                                className="w-full border rounded p-1 text-xs bg-white"
                                                            >
                                                                <option value="ALL_YEAR">All Year</option>
                                                                <option value="SPRING_ONLY">Spring Only</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {includedServices.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">No steps added yet.</p>}
                                    </div>

                                    {/* Add Step */}
                                    <div className="flex gap-2 items-center border-t pt-2">
                                        <select
                                            id="newServiceSelect"
                                            className="flex-1 border rounded p-1 text-sm bg-white"
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Select Service...</option>
                                            {availableServices.filter(s => s.id !== product?.id).map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                // @ts-ignore
                                                const select = document.getElementById("newServiceSelect") as HTMLSelectElement;
                                                const serviceId = select.value;
                                                if (serviceId) {
                                                    setIncludedServices([
                                                        ...includedServices,
                                                        {
                                                            id: serviceId,
                                                            delayDays: includedServices.length === 0 ? 0 : 14,
                                                            order: includedServices.length + 1,
                                                            seasonality: "ALL_YEAR",
                                                            isWeatherDependent: false
                                                        }
                                                    ]);
                                                    select.value = "";
                                                }
                                            }}
                                            className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-xs font-semibold hover:bg-yellow-200"
                                        >
                                            Add Step
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Warranty */}
                        <div className="bg-green-50 p-3 rounded-md border border-green-100">
                            <label className="block text-sm font-medium text-green-900 mb-1">{t.productDialog.warrantyExtension}</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={warrantyMonths || ""}
                                    onChange={(e) => setWarrantyMonths(e.target.value ? Number(e.target.value) : undefined)}
                                    placeholder="e.g. 12"
                                    className="w-24 rounded-md border p-2 text-sm"
                                />
                                <span className="text-xs text-green-700">{t.productDialog.warrantyExtensionDesc}</span>
                            </div>
                        </div>
                    </div>
                )}

                {type !== 'SERVICE' && type !== 'EQUIPMENT' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-foreground">{t.products.unit}</label>
                            <select
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                className="w-full rounded-md border p-2 bg-background text-foreground"
                            >
                                <option value="" disabled>{t.common.select}</option>
                                <option value="ml">ml</option>
                                <option value="L">L</option>
                                <option value="Gallon">Gallon</option>
                                <option value="Block">Block</option>
                                <option value="Pcs">Pcs</option>
                                <option value="Kg">Kg</option>
                                <option value="g">g</option>
                                <option value="oz">oz</option>
                                <option value="lb">lb</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {type !== 'SERVICE' && (
                        <div className="md:col-span-2 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-medium text-white">{t.productDialog.inventoryMode}</h3>
                                <div className="flex gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setContainerSize(undefined)}
                                        className={`px-3 py-1 rounded-md border ${!containerSize ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                                    >
                                        {t.productDialog.byUnit} ({unit})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setContainerSize(1)} // Default start value
                                        className={`px-3 py-1 rounded-md border ${containerSize ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                                    >
                                        {t.productDialog.byContainer}
                                    </button>
                                </div>
                            </div>

                            {containerSize ? (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">{t.productDialog.containerVolume} ({unit})</label>
                                        <input
                                            type="number"
                                            value={containerSize}
                                            onChange={(e) => {
                                                const newSize = Number(e.target.value);
                                                setContainerSize(newSize);
                                                // Adjust cost per unit based on same container price?
                                                // current cost is per unit.
                                                // container price = cost * oldSize.
                                                // cost = container price / newSize.
                                                // Actually let's just keep cost as is, user will update price.
                                            }}
                                            className="w-full bg-gray-800 border-gray-700 rounded px-2 py-1 text-sm text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">{t.productDialog.containersInStock}</label>
                                        <input
                                            type="number"
                                            value={stock && containerSize ? (stock / containerSize).toFixed(2) : 0}
                                            onChange={(e) => {
                                                const bottles = Number(e.target.value);
                                                setStock(Math.round(bottles * containerSize));
                                            }}
                                            className="w-full bg-gray-800 border-gray-700 rounded px-2 py-1 text-sm text-white"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">Total: {stock} {unit}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">{t.productDialog.pricePerContainer}</label>
                                        <input
                                            type="number"
                                            value={cost && containerSize ? (cost * containerSize).toFixed(2) : 0}
                                            onChange={(e) => {
                                                const containerPrice = Number(e.target.value);
                                                setCost(containerPrice / containerSize);
                                            }}
                                            className="w-full bg-gray-800 border-gray-700 rounded px-2 py-1 text-sm text-white"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">Unit Cost: ${cost.toFixed(4)}/{unit}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-foreground">{t.products.stock} ({unit})</label>
                                        <input
                                            type="number"
                                            value={stock}
                                            onChange={(e) => setStock(Number(e.target.value))}
                                            className="w-full rounded-md border p-2 bg-background text-foreground"
                                            required
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-sm font-medium text-foreground">
                                                {t.products.cost} ($) / {unit}
                                            </label>
                                            <UnitCostCalculator
                                                unit={unit}
                                                onApply={(newCost) => setCost(newCost)}
                                            />
                                        </div>
                                        <input
                                            type="number"
                                            value={cost}
                                            onChange={(e) => setCost(Number(e.target.value))}
                                            className="w-full rounded-md border p-2 bg-background text-foreground"
                                            required
                                            min="0"
                                            step="0.0001"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!(division === "EXTERMINATION" && type !== "SERVICE") && (
                        <div>
                            <label className="block text-sm font-medium mb-1 text-foreground">{t.productDialog.sellingPrice}</label>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                                className="w-full rounded-md border p-2 bg-background text-foreground"
                                required
                                min="0"
                                step="0.01"
                            />
                        </div>
                    )}
                </div>

                {type !== 'SERVICE' && (
                    <>
                        <div className="pt-2">
                            <label className="block text-sm font-medium mb-1 text-foreground">{t.productDialog.usageDescription}</label>
                            <textarea
                                value={usageDescription}
                                onChange={(e) => setUsageDescription(e.target.value)}
                                className="w-full rounded-md border p-2 bg-background text-foreground"
                                rows={2}
                                placeholder="How to use this product..."
                            />
                        </div>

                        {type !== 'EQUIPMENT' && (
                            <>
                                <div className="pt-2">
                                    <label className="block text-sm font-medium mb-1 text-foreground">{t.productDialog.activeIngredient}</label>
                                    <input
                                        type="text"
                                        value={activeIngredient}
                                        onChange={(e) => setActiveIngredient(e.target.value)}
                                        className="w-full rounded-md border p-2 bg-background text-foreground"
                                        placeholder="e.g. Permethrin 5%"
                                    />
                                </div>

                                <div className="pt-2">
                                    <label className="block text-sm font-medium mb-1 text-foreground">{t.productDialog.concentration}</label>
                                    <input
                                        type="text"
                                        value={recommendedConcentration}
                                        onChange={(e) => setRecommendedConcentration(e.target.value)}
                                        className="w-full rounded-md border p-2 bg-background text-foreground"
                                        placeholder="e.g. 1% - 3%"
                                    />
                                </div>
                            </>
                        )}
                    </>
                )}

                <div className="flex justify-end gap-2 pt-4">
                    {product && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                            disabled={loading}
                        >
                            {t.common.delete}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
                        disabled={loading}
                    >
                        {t.common.cancel}
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        disabled={loading}
                    >
                        {loading ? t.common.saving : t.common.save}
                    </button>
                </div>
            </form>
        </Modal >
    );

}
