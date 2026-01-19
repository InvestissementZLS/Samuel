"use client";

import { useState } from "react";
import { createProductSeries, addSeriesStep, deleteProductSeries } from "@/app/actions/series-actions";
import { toast } from "sonner";
import { Plus, Trash2, Calendar, Cloud, Sun } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

interface SeriesBuilderProps {
    initialSeries: any[];
    availableProducts: any[];
}

export function SeriesBuilder({ initialSeries, availableProducts }: SeriesBuilderProps) {
    const [seriesList, setSeriesList] = useState(initialSeries);
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState("");
    const { t } = useLanguage();
    const [description, setDescription] = useState("");

    // Step State
    const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
    const [stepProduct, setStepProduct] = useState("");
    const [stepDelay, setStepDelay] = useState(14);
    const [stepSeason, setStepSeason] = useState("ALL_YEAR");
    const [stepWeather, setStepWeather] = useState(false);

    const handleCreateSeries = async () => {
        if (!name) return;
        try {
            const newSeries = await createProductSeries(name, description);
            setSeriesList([...seriesList, { ...newSeries, steps: [] }]);
            setIsCreating(false);
            setName("");
            setDescription("");
            toast.success(t.settings.seriesCreated);
        } catch (error) {
            toast.error(t.settings.seriesCreateError);
        }
    };

    const handleAddStep = async (seriesId: string) => {
        if (!stepProduct) return;
        try {
            await addSeriesStep(seriesId, stepProduct, stepDelay, stepSeason as any, stepWeather);
            toast.success(t.settings.stepAdded);
            // Ideally we'd update optimistic state here, but revalidatePath handles the reload usually
            window.location.reload();
        } catch (error) {
            toast.error(t.settings.stepAddError);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t.settings.deleteSeriesConfirm)) return;
        try {
            await deleteProductSeries(id);
            setSeriesList(seriesList.filter(s => s.id !== id));
            toast.success(t.settings.seriesDeleted);
        } catch (error) {
            toast.error(t.settings.seriesDeleteError);
        }
    };

    return (
        <div className="space-y-8">
            {/* Create Series Form */}
            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="font-medium text-lg mb-4">{t.settings.newPackage}</h3>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="text-sm font-medium">{t.settings.packageName}</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={t.settings.packageNamePlaceholder}
                            className="w-full border p-2 rounded"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-sm font-medium">{t.settings.packageDesc}</label>
                        <input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={t.settings.packageDescPlaceholder}
                            className="w-full border p-2 rounded"
                        />
                    </div>
                    <button
                        onClick={handleCreateSeries}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        {t.common.create}
                    </button>
                </div>
            </div>

            {/* List of Series */}
            <div className="grid gap-6">
                {seriesList.map((series: any) => (
                    <div key={series.id} className="bg-white border rounded-lg overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">{series.name}</h3>
                                <p className="text-sm text-gray-500">{series.description}</p>
                            </div>
                            <button onClick={() => handleDelete(series.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="p-4">
                            <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">{t.settings.timeline}</h4>
                            <div className="space-y-4">
                                {series.steps.map((step: any, index: number) => (
                                    <div key={step.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded border">
                                        <div className="flex-none w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{step.product.name}</p>
                                            <div className="flex gap-4 text-xs text-gray-500 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {step.delayDays === 0 ? t.settings.startsImmediately : t.settings.waitDays.replace('{days}', step.delayDays)}
                                                </span>
                                                {step.seasonality === 'SPRING_ONLY' && (
                                                    <span className="flex items-center gap-1 text-green-600">
                                                        <Sun size={12} /> {t.settings.springOnly}
                                                    </span>
                                                )}
                                                {step.isWeatherDependent && (
                                                    <span className="flex items-center gap-1 text-amber-600">
                                                        <Cloud size={12} /> {t.settings.noRain}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Step Form */}
                                <div className="mt-4 pt-4 border-t flex gap-2 items-center flex-wrap">
                                    <span className="text-sm font-medium text-gray-500">{t.settings.nextStep}</span>
                                    <select
                                        className="border rounded p-2 text-sm"
                                        value={stepProduct}
                                        onChange={e => { setStepProduct(e.target.value); setSelectedSeriesId(series.id); }}
                                    >
                                        <option value="">{t.settings.selectService}</option>
                                        {availableProducts.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>

                                    <input
                                        type="number"
                                        className="border rounded p-2 w-24 text-sm"
                                        placeholder={t.settings.daysAfter}
                                        value={stepDelay} // This state is shared, bug potential if multiple forms used at once. Simplified for now.
                                        onChange={e => setStepDelay(Number(e.target.value))}
                                    />

                                    <select
                                        className="border rounded p-2 text-sm"
                                        value={stepSeason}
                                        onChange={e => setStepSeason(e.target.value)}
                                    >
                                        <option value="ALL_YEAR">{t.settings.allYear}</option>
                                        <option value="SPRING_ONLY">{t.settings.springOnly}</option>
                                    </select>

                                    <label className="flex items-center gap-1 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={stepWeather}
                                            onChange={e => setStepWeather(e.target.checked)}
                                        />
                                        {t.settings.noRain}
                                    </label>

                                    <button
                                        onClick={() => handleAddStep(series.id)}
                                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                                    >
                                        {t.settings.addStep}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
