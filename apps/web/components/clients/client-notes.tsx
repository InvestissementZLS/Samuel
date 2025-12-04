"use client";

import { useState } from "react";
import { ClientNote } from "@prisma/client";
import { addClientNote, deleteClientNote } from "@/app/actions/client-portal-actions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ClientNotesProps {
    clientId: string;
    notes: ClientNote[];
}

export function ClientNotes({ clientId, notes }: ClientNotesProps) {
    const [newNote, setNewNote] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setLoading(true);
        try {
            await addClientNote(clientId, newNote);
            setNewNote("");
            toast.success("Note added");
        } catch (error) {
            console.error("Failed to add note:", error);
            toast.error("Failed to add note");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this note?")) return;
        try {
            await deleteClientNote(id, clientId);
            toast.success("Note deleted");
        } catch (error) {
            console.error("Failed to delete note:", error);
            toast.error("Failed to delete note");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Client Notes</h2>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note to the client dossier..."
                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 mb-2"
                    rows={3}
                    disabled={loading}
                />
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading || !newNote.trim()}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? "Adding..." : "Add Note"}
                    </button>
                </div>
            </form>

            <ul className="space-y-4">
                {notes.map((note) => (
                    <li key={note.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 flex justify-between items-start group">
                        <div>
                            <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                            <p className="text-xs text-gray-500 mt-2">
                                {format(new Date(note.createdAt), "PPP p")}
                            </p>
                        </div>
                        <button
                            onClick={() => handleDelete(note.id)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </li>
                ))}
                {notes.length === 0 && (
                    <li className="text-center py-8 text-gray-500 italic">No notes found.</li>
                )}
            </ul>
        </div>
    );
}
