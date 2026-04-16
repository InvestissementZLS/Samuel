"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { QuickCallDialog } from "./quick-call-dialog";

export function FloatingAiButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center group"
                title="Action Rapide (IA)"
            >
                <Sparkles size={24} className="group-hover:animate-pulse" />
            </button>
            <QuickCallDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
