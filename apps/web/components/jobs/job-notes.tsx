"use client";

import { useState } from "react";
import { JobNote } from "@prisma/client";
import { addJobNote, deleteJobNote } from "@/app/actions/job-details-actions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface JobNotesProps {
    jobId: string;
    notes: JobNote[];
}

export function JobNotes({ jobId, notes }: JobNotesProps) {
    const [newNote, setNewNote] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setLoading(true);
        try {
            await addJobNote(jobId, newNote);
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
            await deleteJobNote(id, jobId);
            toast.success("Note deleted");
        } catch (error) {
            console.error("Failed to delete note:", error);
            toast.error("Failed to delete note");
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Notes</h3>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading || !newNote.trim()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                    Add
                </button>
            </form>

            <ul className="space-y-3">
                {notes.map((note) => (
                    <li key={note.id} className="bg-gray-50 p-3 rounded-md flex justify-between items-start group">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</div>
                        <button
                            onClick={() => handleDelete(note.id)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </li>
                ))}
                {notes.length === 0 && (
                    <li className="text-sm text-gray-500 italic">No notes yet.</li>
                )}
            </ul>
        </div>
    );
}
