"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createWarrantyTemplate, updateWarrantyTemplate, deleteWarrantyTemplate } from "@/app/actions/warranty-actions";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

interface Warranty {
    id: string;
    name: string;
    text: string;
}

interface WarrantySettingsProps {
    initialWarranties: Warranty[];
}

export function WarrantySettings({ initialWarranties }: WarrantySettingsProps) {
    const [warranties, setWarranties] = useState<Warranty[]>(initialWarranties);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const { t } = useLanguage();

    // Form State
    const [name, setName] = useState("");
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name || !text) return;
        setLoading(true);
        try {
            const newWarranty = await createWarrantyTemplate(name, text);
            setWarranties([...warranties, newWarranty]);
            setIsCreating(false);
            setName("");
            setText("");
            toast.success(t.settings.warrantyCreated);
        } catch (error) {
            toast.error(t.settings.warrantyCreateError);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingId || !name || !text) return;
        setLoading(true);
        try {
            const updated = await updateWarrantyTemplate(editingId, name, text);
            setWarranties(warranties.map(w => w.id === editingId ? updated : w));
            setEditingId(null);
            setName("");
            setText("");
            toast.success(t.settings.warrantyUpdated);
        } catch (error) {
            toast.error(t.settings.warrantyUpdateError);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t.settings.deleteTemplateConfirm)) return;
        try {
            await deleteWarrantyTemplate(id);
            setWarranties(warranties.filter(w => w.id !== id));
            toast.success(t.settings.warrantyDeleted);
        } catch (error) {
            toast.error(t.settings.warrantyDeleteError);
        }
    };

    const startEdit = (w: Warranty) => {
        setEditingId(w.id);
        setName(w.name);
        setText(w.text);
        setIsCreating(false);
    };

    return (
        <div className="space-y-6">
            {!isCreating && !editingId && (
                <button
                    onClick={() => { setIsCreating(true); setName(""); setText(""); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    <Plus size={16} /> {t.settings.newTemplate}
                </button>
            )}

            {(isCreating || editingId) && (
                <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                    <h3 className="font-medium text-lg text-gray-900">{isCreating ? t.settings.newTemplate : t.settings.editTemplate}</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.warrantyName}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={t.settings.warrantyNamePlaceholder}
                            className="w-full rounded border p-2 text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.settings.warrantyText}</label>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            rows={4}
                            placeholder={t.settings.warrantyTextPlaceholder}
                            className="w-full rounded border p-2 text-gray-900"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => { setIsCreating(false); setEditingId(null); }}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            disabled={loading}
                        >
                            {t.common.cancel}
                        </button>
                        <button
                            onClick={isCreating ? handleCreate : handleUpdate}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            {loading ? t.common.saving : t.settings.saveTemplate}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                {warranties.map(w => (
                    <div key={w.id} className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-gray-900">{w.name}</h3>
                            <div className="flex gap-1 text-gray-400">
                                <button onClick={() => startEdit(w)} className="p-1 hover:text-blue-600"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(w.id)} className="p-1 hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">{w.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
