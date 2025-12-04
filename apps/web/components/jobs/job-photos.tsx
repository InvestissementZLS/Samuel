"use client";

import { useState } from "react";
import { JobPhoto } from "@prisma/client";
import { addJobPhoto } from "@/app/actions/job-details-actions";
import { toast } from "sonner";

interface JobPhotosProps {
    jobId: string;
    photos: JobPhoto[];
}

export function JobPhotos({ jobId, photos }: JobPhotosProps) {
    const [url, setUrl] = useState("");
    const [caption, setCaption] = useState("");
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        setLoading(true);
        try {
            await addJobPhoto(jobId, url, caption);
            setUrl("");
            setCaption("");
            setIsAdding(false);
            toast.success("Photo added");
        } catch (error) {
            console.error("Failed to add photo:", error);
            toast.error("Failed to add photo");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Photos</h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                    {isAdding ? "Cancel" : "+ Add Photo"}
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-md space-y-3 border border-gray-200">
                    <div>
                        <label className="block text-xs font-medium text-gray-700">Image URL</label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700">Caption (Optional)</label>
                        <input
                            type="text"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Front yard"
                            className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? "Adding..." : "Add Photo"}
                    </button>
                </form>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => (
                    <div key={photo.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={photo.url}
                            alt={photo.caption || "Job photo"}
                            className="object-cover w-full h-full"
                        />
                        {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 truncate">
                                {photo.caption}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {photos.length === 0 && !isAdding && (
                <p className="text-sm text-gray-500 italic">No photos yet.</p>
            )}
        </div>
    );
}
