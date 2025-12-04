"use client";

import { Button } from "@/components/ui/button";
import { Link as LinkIcon, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CopyPortalLink({ clientId }: { clientId: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const url = `${window.location.origin}/portal/${clientId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Portal link copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
            {copied ? "Copied" : "Copy Portal Link"}
        </Button>
    );
}
