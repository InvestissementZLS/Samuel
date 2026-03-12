"use client";

import { Button } from "@/components/ui/button";
import { Link as LinkIcon, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getOrCreateClientPortalToken } from "@/app/actions/portal-actions";

export function CopyPortalLink({ clientId }: { clientId: string }) {
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleCopy = async () => {
        setIsLoading(true);
        try {
            const token = await getOrCreateClientPortalToken(clientId);
            if (!token) throw new Error("Could not generate token");
            
            const url = `${window.location.origin}/portal/${token}`;
            await navigator.clipboard.writeText(url);
            
            setCopied(true);
            toast.success("Lien du portail copié !");
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy portal link:", error);
            toast.error("Erreur lors de la génération du lien");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button variant="outline" size="sm" onClick={handleCopy} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : copied ? <Check className="h-4 w-4 text-green-600" /> : <LinkIcon className="h-4 w-4" />}
            {copied ? "Copié" : "Lien Portail"}
        </Button>
    );
}
