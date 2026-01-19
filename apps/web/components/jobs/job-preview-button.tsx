"use client";

import { useState } from "react";
import { Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { getOrCreateClientPortalToken } from "@/app/actions/portal-actions";

interface JobPreviewButtonProps {
    clientId: string;
}

export function JobPreviewButton({ clientId }: JobPreviewButtonProps) {
    const [loading, setLoading] = useState(false);

    const handlePreview = async () => {
        setLoading(true);
        try {
            const token = await getOrCreateClientPortalToken(clientId);
            if (token) {
                // Open in new tab
                window.open(`/portal/${token}`, '_blank');
            } else {
                toast.error("Could not generate preview link");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to get preview token");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handlePreview}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded hover:bg-indigo-100 transition-colors disabled:opacity-50"
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Eye className="h-4 w-4" />
            )}
            Client View
        </button>
    );
}
